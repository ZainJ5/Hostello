'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import Button from '@/components/ds/Button';
import { Alert, Spinner } from '@/components/ds/Feedback';
import { DISTANCE_NOTE } from '@/lib/distance';
// Loaded here rather than only inside the lazy canvas chunk, so the scroll
// lock and the slider skin are present on the very first paint.
import './map.css';
import { CAMPUS_BY_ID, MAX_RESULTS, MOVE_DEBOUNCE_MS } from './config';
import { pointsBounds } from './cluster';
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  boundsToParam,
  filtersToQuery,
  hasCoords,
  inBounds,
  matchesFilters,
  withCampusDistance,
  withinRadius,
} from './filters';
import BottomSheet, { SHEET_SNAPS } from './BottomSheet';
import FilterBar from './FilterBar';
import ResultList from './ResultList';
import { MapCanvasSkeleton } from './MapSkeleton';

// react-leaflet reaches for `window` at module scope, so the canvas can only
// ever be a client-side chunk.
const MapCanvas = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => <MapCanvasSkeleton />,
});

/**
 * DIVERGENCE FROM THE FRAME, RECORDED HERE BECAUSE IT IS THE BIG ONE.
 *
 * Figma map 98:7505 and 98:7845 draw an in-page map: a page header, a map of
 * fixed height, the result list underneath it, then the footer. That frame has
 * no bottom sheet at either width.
 *
 * The build keeps the viewport explorer, because the behaviour brief requires
 * the draggable sheet with its three snap points, search as I move the map,
 * search this area and the map and list segmented control, and every one of
 * those needs the map to own the viewport. What the frame contributes instead
 * is its composition and its chrome: the page header above the split, the rent
 * legend, the provenance note, and the marker grammar where solid ink is a
 * listing and yellow is the one being read.
 *
 * Everything else here is a restyle onto the 2026 tokens. No behaviour moved.
 */

/* Floating map chrome. Elevation is a keyline and a surface fill, not a
   shadow: shadow belongs to the sheet and the popup. */
const CONTROL_BUTTON = cn(
  'ds-tap grid cursor-pointer place-items-center',
  'rounded-ds-inner border border-solid border-ds-control bg-ds-surface-raised text-ds-ink',
  'transition-colors duration-150 motion-reduce:transition-none',
  'hover:border-ds-cobalt',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt'
);

function Segment({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ height: 'var(--ds-control-h)' }}
      className={cn(
        'ds-body-s inline-flex cursor-pointer items-center justify-center px-3.5',
        'transition-colors duration-150 motion-reduce:transition-none focus:outline-none',
        active ? 'bg-ds-ink text-ds-on-ink' : 'bg-ds-surface text-ds-ink'
      )}
    >
      {children}
    </button>
  );
}

export default function MapExplorer({ initialHostels = [], initialFilters, total = 0 }) {
  const rootRef = useRef(null);
  const mapRef = useRef(null);

  const [filters, setFilters] = useState(initialFilters);
  const [hostels, setHostels] = useState(initialHostels);
  const [bounds, setBounds] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiHealthy, setApiHealthy] = useState(true);
  const [areaDirty, setAreaDirty] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapInstance, setMapInstance] = useState(null);

  const boundsRef = useRef(bounds);
  const filtersRef = useRef(filters);
  const abortRef = useRef(null);
  const searchedOnceRef = useRef(false);
  const lastSearchedBoundsRef = useRef(null);

  // Mirrors the latest viewport/filters for the debounced timers, which fire
  // long after the render that scheduled them.
  useEffect(() => {
    boundsRef.current = bounds;
    filtersRef.current = filters;
  });

  const campus = filters.campus ? CAMPUS_BY_ID[filters.campus] || null : null;

  /* ── Shell: own the viewport, and only the viewport ──────────────────── */

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-hostello-map-open', '');
    return () => root.removeAttribute('data-hostello-map-open');
  }, []);

  // The public layout owns the site header, so its height is measured rather
  // than assumed, and the map fills exactly what is left of the viewport.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const header = Array.from(document.querySelectorAll('header, [data-navbar]')).find(
      (el) => !root.contains(el)
    );

    const apply = () => {
      const h = header ? Math.round(header.getBoundingClientRect().height) : 0;
      root.style.setProperty('--hm-nav-h', `${h}px`);
    };
    apply();

    if (!header) return undefined;
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    window.addEventListener('resize', apply);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, []);

  /* ── URL mirroring: every view is a shareable link ────────────────────── */

  useEffect(() => {
    const timer = setTimeout(() => {
      const query = filtersToQuery(filters).toString();
      const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      if (next !== `${window.location.pathname}${window.location.search}`) {
        window.history.replaceState(null, '', next);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [filters]);

  /* ── Fetching ────────────────────────────────────────────────────────── */

  const runSearch = useCallback(async (nextBounds, nextFilters) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    lastSearchedBoundsRef.current = nextBounds;
    setLoading(true);

    try {
      const params = filtersToQuery(nextFilters);
      // Client-only concerns; the read API knows nothing about them.
      params.delete('live');
      params.delete('radius');
      params.delete('campus');
      params.set('limit', String(MAX_RESULTS));
      // The map has no use for the facet aggregation, so skip that round trip.
      params.set('facets', '0');
      if (nextBounds) params.set('bounds', boundsToParam(nextBounds));

      const res = await fetch(`/api/hostels?${params.toString()}`, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`hostels api responded ${res.status}`);

      const data = await res.json();
      const returned = Array.isArray(data?.hostels) ? data.hostels : [];
      const rows = returned.filter(hasCoords);
      // A shape we cannot map is no better than a failed request, so keep the
      // rows already on screen rather than blanking the map.
      if (returned.length > 0 && rows.length === 0) {
        throw new Error('hostels api returned no coordinates');
      }

      setHostels(rows);
      setApiHealthy(true);
      setAreaDirty(false);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      // Degraded, not broken: the server-rendered set stays, and the client
      // narrows it to the viewport on its own.
      setApiHealthy(false);
      setAreaDirty(false);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Map movement is debounced, and only runs when "search as I move" is on.
  useEffect(() => {
    if (!bounds) return undefined;
    if (!filters.live && searchedOnceRef.current) {
      // `handleBoundsChange` keeps the identity stable when nothing moved, so
      // flipping the toggle alone never arms the button.
      setAreaDirty(bounds !== lastSearchedBoundsRef.current);
      return undefined;
    }
    const timer = setTimeout(() => {
      searchedOnceRef.current = true;
      runSearch(boundsRef.current, filtersRef.current);
    }, MOVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [bounds, filters.live, runSearch]);

  // Filter changes always refetch, whatever the live toggle says. Radius is
  // resolved on the client from `haversineKm`, so it is not part of the key.
  const filterKey = useMemo(
    () => filtersToQuery({ ...filters, live: true, radius: 0 }).toString(),
    [filters]
  );
  useEffect(() => {
    if (!searchedOnceRef.current) return undefined;
    const timer = setTimeout(() => runSearch(boundsRef.current, filtersRef.current), 250);
    return () => clearTimeout(timer);
  }, [filterKey, runSearch]);

  /* ── Derived data ────────────────────────────────────────────────────── */

  const matched = useMemo(() => {
    const geo = hostels.filter(hasCoords);
    const decorated = withCampusDistance(geo, campus);
    return decorated.filter(
      (h) => matchesFilters(h, filters) && withinRadius(h, campus ? filters.radius : 0)
    );
  }, [hostels, campus, filters]);

  const visible = useMemo(() => {
    const rows = bounds ? matched.filter((h) => inBounds(h, bounds)) : matched;
    const sorted = [...rows];
    if (campus) {
      sorted.sort((a, b) => a.campusDistanceKm - b.campusDistanceKm);
    } else {
      sorted.sort(
        (a, b) =>
          Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
          (Number(b.rating) || 0) - (Number(a.rating) || 0)
      );
    }
    return sorted;
  }, [matched, bounds, campus]);

  /* ── Interaction ─────────────────────────────────────────────────────── */

  const handleHover = useCallback((id) => setHoveredId(id), []);

  // Both breakpoints render a list, so the rows are namespaced and each copy is
  // scrolled independently; duplicate ids would break `getElementById`.
  const revealRow = useCallback((id) => {
    requestAnimationFrame(() => {
      for (const prefix of ['hm-desktop', 'hm-sheet']) {
        document
          .getElementById(`${prefix}-${id}`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }, []);

  // From a marker: Leaflet already pans for the popup, so only sync the list.
  const handleMarkerSelect = useCallback(
    (hostel) => {
      if (!hostel) {
        setSelectedId(null);
        return;
      }
      setSelectedId(hostel._id);
      revealRow(hostel._id);
    },
    [revealRow]
  );

  // From the list: pan the map, and zoom in far enough to break the cluster.
  const handleListSelect = useCallback((hostel) => {
    setSelectedId(hostel._id);
    const map = mapRef.current;
    if (map) {
      map.setView([Number(hostel.lat), Number(hostel.lng)], Math.max(map.getZoom(), 15), {
        animate: true,
      });
    }
    if (typeof window !== 'undefined' && window.innerWidth < 1024) setSheetIndex(0);
  }, []);

  const handleMapReady = useCallback((map) => {
    mapRef.current = map;
    setMapInstance(map);
  }, []);

  const handleBoundsChange = useCallback((next) => {
    setBounds((prev) => {
      if (
        prev &&
        Math.abs(prev.swLat - next.swLat) < 1e-6 &&
        Math.abs(prev.swLng - next.swLng) < 1e-6 &&
        Math.abs(prev.neLat - next.neLat) < 1e-6 &&
        Math.abs(prev.neLng - next.neLng) < 1e-6
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const zoomOutToResults = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const box = pointsBounds(matched.length ? matched : hostels.filter(hasCoords));
    if (box) map.fitBounds(box, { padding: [56, 56], maxZoom: 14, animate: true });
    else map.setZoom(Math.max(map.getMinZoom(), map.getZoom() - 2));
  }, [matched, hostels]);

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({ ...DEFAULT_FILTERS, live: prev.live }));
    setSelectedId(null);
  }, []);

  const searchThisArea = useCallback(() => {
    searchedOnceRef.current = true;
    runSearch(boundsRef.current, filtersRef.current);
  }, [runSearch]);

  const activeCount = activeFilterCount(filters);
  const showSearchArea = !filters.live && areaDirty;

  const degraded = (
    <Alert title="Live search is unavailable">
      Showing the listings already loaded, narrowed to this map view.
    </Alert>
  );

  /* A pin is a claim about an address, not a live location. Said once on the
     map, in both layouts, because it is the thing a student most reasonably
     assumes wrongly. */
  const provenance = (
    <div className="flex flex-col gap-2 border-t border-solid border-ds-hairline px-4 py-4">
      <p className="ds-body-s text-ds-ink-muted">
        A pin is where the owner said the hostel is, confirmed by a person at review. It is not a
        live location and it is not measured from your phone.
      </p>
      <p className="ds-body-s text-ds-ink-muted">{DISTANCE_NOTE}</p>
    </div>
  );

  const listPanel = (
    <>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        open={filtersOpen}
        onToggleOpen={() => setFiltersOpen((v) => !v)}
      />
      {!apiHealthy && <div className="px-4 pt-4">{degraded}</div>}
      <ResultList
        hostels={visible}
        loading={loading}
        selectedId={selectedId}
        hoveredId={hoveredId}
        campus={campus}
        hasFilters={activeCount > 0}
        idPrefix="hm-sheet"
        onSelect={handleListSelect}
        onHover={handleHover}
        onZoomOut={zoomOutToResults}
        onClearFilters={clearFilters}
      />
      {provenance}
    </>
  );

  return (
    <div
      ref={rootRef}
      data-hostello-map
      className="flex h-[calc(100dvh-var(--hm-nav-h,4rem))] w-full flex-col overflow-hidden bg-ds-surface"
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-solid border-ds-hairline px-4 py-3 lg:px-20 lg:py-5">
        <nav aria-label="Breadcrumb" className="hidden lg:block">
          <ol className="ds-body-s flex items-center gap-2 text-ds-ink-muted">
            <li>
              <Link
                href="/"
                className="text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ds-ink">
              Map
            </li>
          </ol>
        </nav>

        {/* One size at both widths. The `.ds-*` type styles are plain classes
            rather than Tailwind utilities, so they cannot carry a breakpoint
            prefix, and display/m is the size that reads at 360 and at 1440. */}
        <h1 className="ds-display-m text-ds-ink lg:mt-2">Hostels on a map</h1>

        {/* Hidden below lg only because the map has to keep the viewport it
            needs on a phone. The same sentence is in the metadata. */}
        <p className="ds-body-l mt-2 hidden max-w-[110ch] text-ds-ink-muted lg:block">
          {total} listings placed by the address the owner gave and confirmed at review. Markers
          show rent, because distance is already what the map is telling you.
        </p>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ── Desktop: results column ───────────────────────────────────── */}
        <aside
          aria-label="Hostel results"
          className="hidden w-[40%] min-w-96 max-w-140 shrink-0 flex-col border-r border-solid border-ds-hairline bg-ds-surface lg:flex"
        >
          <div className="shrink-0">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              onClear={clearFilters}
              open={filtersOpen}
              onToggleOpen={() => setFiltersOpen((v) => !v)}
            />
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-solid border-ds-hairline px-4 py-3">
            <p className="ds-body-m-strong text-ds-ink">
              <span className="tabular-nums">{visible.length}</span>{' '}
              {visible.length === 1 ? 'hostel' : 'hostels'}
              <span className="ds-body-m text-ds-ink-muted"> in this view</span>
            </p>
            <span className="ds-body-s flex items-center gap-2 text-ds-ink-muted">
              {loading ? (
                <>
                  <Spinner className="size-4" label="Updating results" />
                  <span>Updating</span>
                </>
              ) : campus ? (
                'Nearest first'
              ) : (
                'Top rated first'
              )}
            </span>
          </div>

          {!apiHealthy && <div className="shrink-0 px-4 pt-4">{degraded}</div>}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <ResultList
              hostels={visible}
              loading={loading}
              selectedId={selectedId}
              hoveredId={hoveredId}
              campus={campus}
              hasFilters={activeCount > 0}
              idPrefix="hm-desktop"
              onSelect={handleListSelect}
              onHover={handleHover}
              onZoomOut={zoomOutToResults}
              onClearFilters={clearFilters}
            />
            {provenance}
          </div>
        </aside>

        {/* ── Map ───────────────────────────────────────────────────────── */}
        <div className="relative min-w-0 flex-1 bg-ds-surface-sunken">
          <MapCanvas
            hostels={matched}
            selectedId={selectedId}
            hoveredId={hoveredId}
            campus={campus}
            radiusKm={campus ? filters.radius : 0}
            onSelect={handleMarkerSelect}
            onHover={handleHover}
            onBoundsChange={handleBoundsChange}
            onMapReady={handleMapReady}
          />

          {/* Live-search toggle */}
          <div className="absolute left-3 top-3 z-1100 sm:left-4 sm:top-4">
            <label
              className={cn(
                'ds-tap flex cursor-pointer items-center gap-2.5 px-3',
                'rounded-ds-inner border border-solid border-ds-control bg-ds-surface-raised',
                'transition-colors duration-150 motion-reduce:transition-none hover:border-ds-cobalt',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ds-cobalt'
              )}
            >
              <input
                type="checkbox"
                checked={filters.live}
                onChange={(e) => setFilters((f) => ({ ...f, live: e.target.checked }))}
                className="size-4 cursor-pointer accent-ds-ink"
              />
              <span className="ds-body-s-strong text-ds-ink">
                <span className="hidden sm:inline">Search as I move the map</span>
                <span className="sm:hidden">Search on move</span>
              </span>
            </label>
          </div>

          {/* Manual search. Clears the live-search pill on a 360px screen,
              where a centred button would sit underneath it. */}
          {showSearchArea && (
            <div className="absolute left-1/2 top-17 z-1100 -translate-x-1/2 sm:top-4">
              <Button onClick={searchThisArea} loading={loading}>
                Search this area
              </Button>
            </div>
          )}

          {/* Zoom and framing controls */}
          <div className="absolute right-3 top-3 z-1100 flex flex-col gap-2 sm:right-4 sm:top-4">
            <button
              type="button"
              className={CONTROL_BUTTON}
              onClick={() => mapInstance?.zoomIn()}
              aria-label="Zoom in"
            >
              <span aria-hidden="true" className="ds-body-m-strong">
                +
              </span>
            </button>
            <button
              type="button"
              className={CONTROL_BUTTON}
              onClick={() => mapInstance?.zoomOut()}
              aria-label="Zoom out"
            >
              <span aria-hidden="true" className="ds-body-m-strong">
                &minus;
              </span>
            </button>
            <button
              type="button"
              className={cn(CONTROL_BUTTON, 'ds-body-s px-2')}
              onClick={zoomOutToResults}
              aria-label="Fit every result on screen"
            >
              <span aria-hidden="true">Fit</span>
            </button>
          </div>

          {/* Legend, from the frame. Sits above the sheet's peek height so it
              is never covered on a phone. */}
          <p
            className={cn(
              'ds-mono-meta absolute bottom-[19%] left-3 z-1050 hidden max-w-[calc(100%-1.5rem)] items-center',
              'rounded-ds-chip border border-solid border-ds-hairline bg-ds-surface-raised px-2 py-1 text-ds-ink-muted',
              'sm:flex lg:bottom-4 lg:left-4'
            )}
          >
            Rent per month. Yellow is the one you are reading.
          </p>

          {/* ── Mobile: draggable results sheet ─────────────────────────── */}
          <BottomSheet
            snapIndex={sheetIndex}
            onSnapIndexChange={setSheetIndex}
            label="Hostel results"
          >
            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-solid border-ds-hairline bg-ds-surface px-3 pb-3">
              <p className="ds-body-m-strong min-w-0 text-ds-ink">
                <span className="tabular-nums">{visible.length}</span>{' '}
                {visible.length === 1 ? 'hostel' : 'hostels'}
                <span className="ds-body-s block text-ds-ink-muted">
                  {loading ? 'Updating this area' : 'in this map view'}
                </span>
              </p>

              <div
                role="group"
                aria-label="Switch between the map and the result list"
                className="inline-flex rounded-ds-slot"
                style={{ padding: 'var(--ds-focus-gap)' }}
              >
                <div className="inline-flex overflow-hidden rounded-ds-inner border border-solid border-ds-control bg-ds-surface-raised">
                  <Segment active={sheetIndex === 0} onClick={() => setSheetIndex(0)}>
                    Map
                  </Segment>
                  <Segment
                    active={sheetIndex === SHEET_SNAPS.length - 1}
                    onClick={() => setSheetIndex(SHEET_SNAPS.length - 1)}
                  >
                    List
                  </Segment>
                </div>
              </div>
            </div>

            {listPanel}
          </BottomSheet>
        </div>
      </div>
    </div>
  );
}

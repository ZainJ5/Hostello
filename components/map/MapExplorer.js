'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Layers,
  List,
  LoaderCircle,
  Map as MapIcon,
  Maximize2,
  Minus,
  Plus,
  Search,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

const CONTROL_BUTTON = cn(
  'grid size-11 cursor-pointer place-items-center rounded-xl border border-border',
  'bg-surface/90 text-foreground shadow-md backdrop-blur-md',
  'transition-[background-color,transform,box-shadow] duration-200',
  'hover:bg-surface hover:shadow-lg active:scale-95',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
);

export default function MapExplorer({ initialHostels = [], initialFilters }) {
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

  // The public layout owns the navbar, so its height is measured rather than
  // assumed — the map fills exactly what is left of the viewport.
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

  /* ── URL mirroring — every view is a shareable link ──────────────────── */

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
      // The map has no use for the facet aggregation — skip that round trip.
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
      // A shape we cannot map is no better than a failed request — keep the
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

  // Map movement — debounced, and only when "search as I move" is on.
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
  // scrolled independently — duplicate ids would break `getElementById`.
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

  const listPanel = (
    <>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        open={filtersOpen}
        onToggleOpen={() => setFiltersOpen((v) => !v)}
      />
      {!apiHealthy && (
        <div className="px-3 pt-3 sm:px-4">
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning-soft/60 px-3 py-2 text-xs text-warning dark:bg-warning/10 dark:text-amber-300"
          >
            <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span>
              Live search is unavailable right now — showing the listings already loaded, filtered
              to this map view.
            </span>
          </div>
        </div>
      )}
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
    </>
  );

  return (
    <div
      ref={rootRef}
      data-hostello-map
      className="relative flex h-[calc(100dvh_-_var(--hm-nav-h,4rem))] w-full overflow-hidden bg-background"
    >
      {/* ── Desktop: results column ─────────────────────────────────────── */}
      <aside
        aria-label="Hostel results"
        className="hidden w-[40%] min-w-[380px] max-w-[560px] shrink-0 flex-col border-r border-border bg-background lg:flex"
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

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <p className="text-sm font-semibold text-foreground">
            <span className="tabular">{visible.length}</span>{' '}
            {visible.length === 1 ? 'hostel' : 'hostels'}
            <span className="font-normal text-muted-foreground"> in this view</span>
          </p>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {loading ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                <span role="status">Updating…</span>
              </>
            ) : campus ? (
              <>
                <Layers className="size-3.5" aria-hidden="true" />
                Nearest first
              </>
            ) : (
              <>
                <Layers className="size-3.5" aria-hidden="true" />
                Top rated first
              </>
            )}
          </span>
        </div>

        {!apiHealthy && (
          <div className="shrink-0 px-4 pt-3">
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning-soft/60 px-3 py-2 text-xs text-warning dark:bg-warning/10 dark:text-amber-300"
            >
              <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              <span>
                Live search is unavailable — showing loaded listings, filtered to this map view.
              </span>
            </div>
          </div>
        )}

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
        </div>
      </aside>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div className="bg-grid relative min-w-0 flex-1 bg-surface-sunken">
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
        <div className="absolute left-3 top-3 z-[1100] sm:left-4 sm:top-4">
          <label
            className={cn(
              'flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border',
              'bg-surface/90 px-3 shadow-md backdrop-blur-md',
              'transition-colors duration-200 hover:bg-surface',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring'
            )}
          >
            <input
              type="checkbox"
              checked={filters.live}
              onChange={(e) => setFilters((f) => ({ ...f, live: e.target.checked }))}
              className="size-4 cursor-pointer accent-brand-700"
            />
            <span className="text-xs font-semibold text-foreground sm:text-sm">
              <span className="hidden sm:inline">Search as I move the map</span>
              <span className="sm:hidden">Search on move</span>
            </span>
          </label>
        </div>

        {/* Manual search */}
        {showSearchArea && (
          // Clears the live-search pill on a 375px screen, where a centred
          // button would sit underneath it.
          <div className="absolute left-1/2 top-[4.25rem] z-[1100] -translate-x-1/2 sm:top-4">
            <button
              type="button"
              onClick={searchThisArea}
              className={cn(
                'animate-scale-in inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl',
                'bg-brand-700 px-4 text-sm font-semibold text-white shadow-brand',
                'transition-[background-color,transform] duration-200 hover:bg-brand-800 active:scale-[0.98]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
              )}
            >
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="size-4" aria-hidden="true" />
              )}
              Search this area
            </button>
          </div>
        )}

        {/* Zoom + framing controls */}
        <div className="absolute right-3 top-3 z-[1100] flex flex-col gap-2 sm:right-4 sm:top-4">
          <button
            type="button"
            className={CONTROL_BUTTON}
            onClick={() => mapInstance?.zoomIn()}
            aria-label="Zoom in"
          >
            <Plus className="size-4.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={CONTROL_BUTTON}
            onClick={() => mapInstance?.zoomOut()}
            aria-label="Zoom out"
          >
            <Minus className="size-4.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={CONTROL_BUTTON}
            onClick={zoomOutToResults}
            aria-label="Fit every result on screen"
          >
            <Maximize2 className="size-4.5" aria-hidden="true" />
          </button>
        </div>

        {/* ── Mobile: draggable results sheet ───────────────────────────── */}
        <BottomSheet
          snapIndex={sheetIndex}
          onSnapIndexChange={setSheetIndex}
          label="Hostel results"
        >
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 pb-3">
            <p className="min-w-0 text-sm font-semibold text-foreground">
              <span className="tabular">{visible.length}</span>{' '}
              {visible.length === 1 ? 'hostel' : 'hostels'}
              <span className="block text-xs font-normal text-muted-foreground">
                {loading ? 'Updating this area…' : 'in this map view'}
              </span>
            </p>

            <div
              role="group"
              aria-label="Switch between the map and the result list"
              className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-surface-sunken p-1"
            >
              <button
                type="button"
                onClick={() => setSheetIndex(0)}
                aria-pressed={sheetIndex === 0}
                className={cn(
                  'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold',
                  'transition-colors duration-200',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  sheetIndex === 0
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <MapIcon className="size-3.5" aria-hidden="true" />
                Map
              </button>
              <button
                type="button"
                onClick={() => setSheetIndex(SHEET_SNAPS.length - 1)}
                aria-pressed={sheetIndex === SHEET_SNAPS.length - 1}
                className={cn(
                  'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold',
                  'transition-colors duration-200',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  sheetIndex === SHEET_SNAPS.length - 1
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="size-3.5" aria-hidden="true" />
                List
              </button>
            </div>
          </div>

          {listPanel}
        </BottomSheet>
      </div>
    </div>
  );
}

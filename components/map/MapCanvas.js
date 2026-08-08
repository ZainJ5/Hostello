'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import './leaflet-setup';
import './map.css';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  TILE_THEMES,
  zoomForRadius,
} from './config';
import MarkerLayer from './MarkerLayer';
import useIsDark from './useIsDark';

function readBounds(map) {
  const b = map.getBounds();
  return {
    swLat: b.getSouth(),
    swLng: b.getWest(),
    neLat: b.getNorth(),
    neLng: b.getEast(),
    zoom: map.getZoom(),
  };
}

/**
 * Everything that needs the live Leaflet instance: a11y wiring, viewport
 * reporting, and the campus fly-to. Kept as a child of `MapContainer` so it can
 * use `useMap()` instead of juggling a ref.
 */
function MapBridge({ onBoundsChange, onMapReady, campus, radiusKm, ariaLabel }) {
  const map = useMap();
  const boundsRef = useRef(onBoundsChange);
  const readyRef = useRef(onMapReady);

  // Keep the callbacks current without letting their identity re-bind Leaflet
  // event listeners on every parent render.
  useEffect(() => {
    boundsRef.current = onBoundsChange;
    readyRef.current = onMapReady;
  });

  useEffect(() => {
    const container = map.getContainer();
    // `region` rather than `application`: Leaflet already makes the container
    // focusable and arrow-key pannable, and the result list is the accessible
    // equivalent — there is no reason to take browse mode away.
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', ariaLabel);
    container.setAttribute('aria-roledescription', 'interactive map');
  }, [map, ariaLabel]);

  useEffect(() => {
    readyRef.current?.(map);
    boundsRef.current?.(readBounds(map));

    const emit = () => boundsRef.current?.(readBounds(map));
    map.on('moveend', emit);
    map.on('zoomend', emit);
    return () => {
      map.off('moveend', emit);
      map.off('zoomend', emit);
    };
  }, [map]);

  // The split view reflows at the lg breakpoint and the mobile sheet can change
  // the visible area; Leaflet only watches `window.resize` on its own.
  useEffect(() => {
    const container = map.getContainer();
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  // Selecting a campus flies the map to it; changing the radius reframes it.
  useEffect(() => {
    if (!campus) return;
    map.flyTo([campus.lat, campus.lng], zoomForRadius(radiusKm), { duration: 0.9 });
  }, [map, campus, radiusKm]);

  return null;
}

export default function MapCanvas({
  hostels,
  selectedId,
  hoveredId,
  campus,
  radiusKm,
  onSelect,
  onHover,
  onBoundsChange,
  onMapReady,
}) {
  const isDark = useIsDark();
  const theme = isDark ? TILE_THEMES.dark : TILE_THEMES.light;

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomControl={false}
      attributionControl
      scrollWheelZoom
      zoomSnap={0.5}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={110}
      preferCanvas={false}
      className="size-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url={theme.url}
        attribution={theme.attribution}
        subdomains={TILE_THEMES.subdomains}
        maxZoom={MAX_ZOOM}
        keepBuffer={3}
        updateWhenIdle={false}
      />
      <MapBridge
        onBoundsChange={onBoundsChange}
        onMapReady={onMapReady}
        campus={campus}
        radiusKm={radiusKm}
        ariaLabel="Map of student hostels. The full list of results is also available beside the map."
      />
      <MarkerLayer
        hostels={hostels}
        selectedId={selectedId}
        hoveredId={hoveredId}
        campus={campus}
        radiusKm={radiusKm}
        onSelect={onSelect}
        onHover={onHover}
      />
    </MapContainer>
  );
}

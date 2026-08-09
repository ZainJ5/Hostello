'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';
import L, { campusIcon, clusterIcon, priceIcon } from './leaflet-setup';
import { clusterPoints } from './cluster';
import { CLUSTER_CELL_PX } from './config';
import PopupCard from './PopupCard';

/**
 * Markers are managed imperatively rather than as React elements.
 *
 * Two reasons: hovering a row in the result list must not re-render a few
 * hundred components (it only toggles one class on one DOM node), and the
 * clustering pass only has to run when the zoom changes. Leaflet's projection
 * is absolute for a given zoom, so panning leaves the grouping untouched.
 */
export default function MarkerLayer({
  hostels,
  selectedId,
  hoveredId,
  campus,
  radiusKm,
  onSelect,
  onHover,
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  const [popupHost, setPopupHost] = useState(null);

  const layerRef = useRef(null);
  const markersRef = useRef(new Map());
  const closingRef = useRef(false);

  // Latest callbacks/data without re-running the marker build. Declared first
  // so every effect below sees fresh values within the same commit.
  const handlers = useRef({ onSelect, onHover });
  const hostelsRef = useRef(hostels);
  useEffect(() => {
    handlers.current = { onSelect, onHover };
    hostelsRef.current = hostels;
  });

  /* ── One layer group for the lifetime of the map ─────────────────────── */
  useEffect(() => {
    const group = L.layerGroup().addTo(map);
    const markers = markersRef.current;
    layerRef.current = group;
    return () => {
      group.remove();
      layerRef.current = null;
      markers.clear();
    };
  }, [map]);

  useEffect(() => {
    const sync = () => setZoom(map.getZoom());
    map.on('zoomend', sync);
    return () => {
      map.off('zoomend', sync);
    };
  }, [map]);

  const groups = useMemo(
    () => clusterPoints(hostels, (lat, lng) => map.project([lat, lng], zoom), CLUSTER_CELL_PX),
    [hostels, zoom, map]
  );

  /* ── Build the marker layer ──────────────────────────────────────────── */
  useEffect(() => {
    const group = layerRef.current;
    if (!group) return;

    group.clearLayers();
    markersRef.current.clear();

    for (const g of groups) {
      if (g.kind === 'cluster') {
        const marker = L.marker([g.lat, g.lng], {
          icon: clusterIcon(g.count),
          keyboard: false,
          alt: `${g.count} hostels`,
          title: `${g.count} hostels. Click to zoom in`,
        });
        marker.on('click', () => {
          map.fitBounds(g.bounds, { padding: [72, 72], maxZoom: 17, animate: true });
        });
        group.addLayer(marker);
        continue;
      }

      const h = g.hostel;
      const marker = L.marker([Number(h.lat), Number(h.lng)], {
        icon: priceIcon(h),
        keyboard: false,
        riseOnHover: true,
        alt: h.name,
        title: h.name,
      });
      marker.on('click', () => handlers.current.onSelect(h));
      marker.on('mouseover', () => handlers.current.onHover(h._id));
      marker.on('mouseout', () => handlers.current.onHover(null));
      markersRef.current.set(h._id, marker);
      group.addLayer(marker);
    }
  }, [groups, map]);

  /* ── Highlight sync (no React re-render of the markers) ──────────────── */
  useEffect(() => {
    if (!hoveredId || hoveredId === selectedId) return undefined;
    const marker = markersRef.current.get(hoveredId);
    const pin = marker?.getElement()?.firstElementChild;
    if (!marker || !pin) return undefined;
    pin.classList.add('is-hover');
    marker.setZIndexOffset(600);
    return () => {
      pin.classList.remove('is-hover');
      marker.setZIndexOffset(0);
    };
  }, [hoveredId, selectedId, groups]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const marker = markersRef.current.get(selectedId);
    const pin = marker?.getElement()?.firstElementChild;
    if (!marker || !pin) return undefined;
    pin.classList.add('is-selected');
    marker.setZIndexOffset(900);
    return () => {
      pin.classList.remove('is-selected');
      marker.setZIndexOffset(0);
    };
  }, [selectedId, groups]);

  /* ── Popup, rendered by React into a node Leaflet owns ───────────────── */
  useEffect(() => {
    const onPopupClose = (e) => {
      if (closingRef.current) return;
      if (e.popup?.options?.className === 'hm-popup') handlers.current.onSelect(null);
    };
    map.on('popupclose', onPopupClose);
    return () => {
      map.off('popupclose', onPopupClose);
    };
  }, [map]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const hostel = hostelsRef.current.find((h) => h._id === selectedId);
    if (!hostel) return undefined;

    const el = document.createElement('div');
    const popup = L.popup({
      className: 'hm-popup',
      closeButton: true,
      autoPan: true,
      autoPanPadding: [28, 28],
      offset: [0, -36],
      minWidth: 250,
      maxWidth: 250,
      keepInView: true,
    })
      .setLatLng([Number(hostel.lat), Number(hostel.lng)])
      .setContent(el);

    popup.openOn(map);
    setPopupHost({ hostel, el, popup });

    return () => {
      // Closing on our own terms must not be mistaken for the user dismissing it.
      closingRef.current = true;
      map.closePopup(popup);
      closingRef.current = false;
      setPopupHost(null);
    };
  }, [selectedId, map]);

  /* ── Campus marker + radius ring ─────────────────────────────────────── */
  useEffect(() => {
    if (!campus) return undefined;

    const marker = L.marker([campus.lat, campus.lng], {
      icon: campusIcon(campus),
      keyboard: false,
      zIndexOffset: 1200,
      alt: `${campus.full} campus`,
    });
    marker.bindTooltip(`${campus.full} · ${campus.sector}`, {
      direction: 'top',
      offset: [0, -28],
      className: 'hm-tooltip',
      opacity: 1,
    });
    marker.addTo(map);

    let ring = null;
    if (radiusKm > 0) {
      ring = L.circle([campus.lat, campus.lng], {
        radius: radiusKm * 1000,
        className: 'hm-radius',
        weight: 1.5,
        opacity: 0.9,
        dashArray: '6 7',
        fillOpacity: 0.07,
        interactive: false,
      }).addTo(map);
    }

    return () => {
      marker.remove();
      ring?.remove();
    };
  }, [campus, radiusKm, map]);

  // Stable per popup: hovering a list row re-renders this component, and the
  // popup must not re-measure itself every time that happens.
  const resizePopup = useCallback(() => popupHost?.popup.update(), [popupHost]);

  if (!popupHost) return null;

  return createPortal(
    <PopupCard hostel={popupHost.hostel} campus={campus} onResize={resizePopup} />,
    popupHost.el
  );
}

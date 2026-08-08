'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaAsset from 'leaflet/dist/images/marker-icon-2x.png';
import iconAsset from 'leaflet/dist/images/marker-icon.png';
import shadowAsset from 'leaflet/dist/images/marker-shadow.png';
import { shortPrice } from './filters';

/**
 * Leaflet resolves its default marker sprites with `L.Icon.Default.imagePath`,
 * which is derived from the CSS URL and therefore points at nothing once the
 * bundler fingerprints the files. Re-point it at the hashed assets so any
 * marker we did not skin by hand still renders.
 */
const assetUrl = (mod) => (typeof mod === 'string' ? mod : mod?.src || '');

if (!L.Icon.Default.__hostelloPatched) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: assetUrl(iconRetinaAsset),
    iconUrl: assetUrl(iconAsset),
    shadowUrl: assetUrl(shadowAsset),
  });
  L.Icon.Default.__hostelloPatched = true;
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

/** The price pill. Width is intrinsic, so `iconSize` is left unset and the
 *  element positions itself from its bottom-centre tip in CSS. */
export function priceIcon(hostel) {
  const dot = hostel.verified ? '<span class="hm-pin__dot"></span>' : '';
  return L.divIcon({
    className: 'hm-marker',
    html: `<span class="hm-pin">${dot}${escapeHtml(shortPrice(hostel.price))}</span>`,
    iconSize: null,
    iconAnchor: [0, 0],
  });
}

/** Bubble grows with the count so density reads at a glance. */
export function clusterIcon(count) {
  const size = count < 10 ? 38 : count < 25 ? 44 : count < 60 ? 52 : 60;
  return L.divIcon({
    className: 'hm-marker',
    html: `<span class="hm-cluster" style="--hm-size:${size}px">${count}</span>`,
    iconSize: null,
    iconAnchor: [0, 0],
  });
}

/* lucide-react `graduation-cap`, inlined because a divIcon takes markup, not JSX. */
const CAP_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>' +
  '<path d="M22 10v6"/>' +
  '<path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>';

export function campusIcon(campus) {
  return L.divIcon({
    className: 'hm-marker',
    html:
      '<span class="hm-campus">' +
      `<span class="hm-campus__disc">${CAP_SVG}</span>` +
      `<span class="hm-campus__label">${escapeHtml(campus.name)}</span>` +
      '</span>',
    iconSize: null,
    iconAnchor: [0, 0],
  });
}

export default L;

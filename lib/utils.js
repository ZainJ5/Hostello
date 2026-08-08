import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges conditional classes, with later Tailwind utilities winning. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** PKR with no decimals — rents are always whole rupees. */
export function formatPKR(amount) {
  const n = Number(amount) || 0;
  return `PKR ${n.toLocaleString('en-PK')}`;
}

/** Compact form for dashboard stat tiles: 12500 -> "12.5k". */
export function formatCompact(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

/**
 * Renders a rent band. Collapses to a single figure when min and max match,
 * so identical values don't display as "PKR 8,000 – 8,000".
 */
export function formatPriceRange(min, max) {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  if (!hi || lo === hi) return formatPKR(lo);
  return `${formatPKR(lo)} – ${hi.toLocaleString('en-PK')}`;
}

export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function timeAgo(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * Great-circle distance in km. Used to sort listings by proximity to a
 * campus without pulling in a geo library.
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Normalises a Pakistani mobile number to E.164 for tel:/wa.me links. */
export function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return `+${digits}`;
  if (digits.startsWith('0')) return `+92${digits.slice(1)}`;
  if (digits.length === 10) return `+92${digits}`;
  return `+${digits}`;
}

export function whatsappLink(raw, message = '') {
  const phone = normalizePhone(raw).replace('+', '');
  if (!phone) return '';
  const q = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${phone}${q}`;
}

/** Serialises Mongoose docs (ObjectId, Date) into plain props for Client Components. */
export function serialize(doc) {
  return JSON.parse(JSON.stringify(doc));
}

/**
 * Static geography + vocabulary for the map experience.
 *
 * Deliberately framework-free (no `use client`) so the server page and the
 * client components share one source of truth instead of drifting.
 */

import { CAMPUSES as CAMPUS_POINTS } from '@/components/hostels/campuses';

/** Roughly the Islamabad and Rawalpindi twin city bowl, where most listings sit. */
export const DEFAULT_CENTER = [33.6461, 73.0169];
export const DEFAULT_ZOOM = 11;
export const MIN_ZOOM = 5;
export const MAX_ZOOM = 19;

/** The read API caps `limit` at 500, which comfortably covers one map view. */
export const MAX_RESULTS = 500;

/** Some listings carry `price: 0` ("ask the owner"), so the floor is 0. */
export const PRICE_FLOOR = 0;
export const PRICE_CEIL = 35000;
export const PRICE_STEP = 1000;

export const CITIES = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi'];

/**
 * Picking a city has to move the map: Lahore and Karachi are ~1,100 km from
 * the default view, so filtering alone would just empty the screen.
 */
export const CITY_VIEWS = {
  Islamabad: { center: [33.6844, 73.0479], zoom: 12 },
  Rawalpindi: { center: [33.5989, 73.0451], zoom: 12.5 },
  Lahore: { center: [31.5204, 74.3587], zoom: 11.5 },
  Karachi: { center: [24.8607, 67.0011], zoom: 11.5 },
};

export const GENDERS = ['Male', 'Female', 'Mixed'];

export const UNIVERSITIES = [
  'Air University',
  'Arid Agriculture',
  'Bahria University',
  'BNU',
  'COMSATS',
  'COMSATS Lahore',
  'FAST',
  'FAST Lahore',
  'FCCU',
  'FJWU',
  'Foundation University',
  'GCU',
  'IBA',
  'IIUI',
  'ITU',
  'KEMU',
  'Kinnaird College',
  'LCWU',
  'LUMS',
  'NCA',
  'NED',
  'NUML',
  'NUST',
  'PU Old Campus',
  'Punjab University',
  'QAU',
  'Riphah',
  'Riphah Lahore',
  'RMU',
  'SZABIST',
  'UCP',
  'UET',
  'UMT',
  'University of Education',
  'UOL',
  'UVAS',
];

/**
 * Campus coordinates for the universities students actually search around.
 * `university` ties each campus back to the `Hostel.universities[]` vocabulary
 * so picking a campus can pre-select the matching tag.
 */
function campusEntry(id, key, sector) {
  const c = CAMPUS_POINTS[key];
  return { id, name: c.name, full: c.full, sector, city: c.city, university: key, lat: c.lat, lng: c.lng };
}

export const CAMPUSES = [
  campusEntry('nust-h12', 'NUST', 'H-12'),
  campusEntry('fast-isb', 'FAST', 'H-11/4'),
  campusEntry('qau', 'QAU', 'Murree Road'),
  campusEntry('comsats-isb', 'COMSATS', 'Park Road, Chak Shahzad'),
  campusEntry('numl', 'NUML', 'H-9'),
  campusEntry('szabist', 'SZABIST', 'H-8/4'),
  campusEntry('riphah', 'Riphah', 'I-14'),
  campusEntry('bahria', 'Bahria University', 'E-8'),
  campusEntry('air', 'Air University', 'E-9'),
  campusEntry('iiui', 'IIUI', 'H-10'),
  campusEntry('arid', 'Arid Agriculture', 'Shamsabad, Murree Road'),
  campusEntry('rmu', 'RMU', 'Tipu Road'),
  campusEntry('fjwu', 'FJWU', 'The Mall'),
  campusEntry('foundation', 'Foundation University', 'New Lalazar'),
  campusEntry('lums', 'LUMS', 'DHA Phase 5'),
  campusEntry('pu-new', 'Punjab University', 'Canal Road'),
  campusEntry('uet', 'UET', 'G.T. Road'),
  campusEntry('pu-old', 'PU Old Campus', 'Anarkali'),
  campusEntry('fast-lhr', 'FAST Lahore', 'Faisal Town'),
  campusEntry('comsats-lhr', 'COMSATS Lahore', 'Defence Road'),
  campusEntry('ucp', 'UCP', 'Johar Town'),
  campusEntry('umt', 'UMT', 'Johar Town'),
  campusEntry('uol', 'UOL', 'Defence Road'),
  campusEntry('gcu', 'GCU', 'Katchery Road'),
  campusEntry('fccu', 'FCCU', 'Canal Bank Road'),
  campusEntry('kinnaird', 'Kinnaird College', 'Jail Road'),
  campusEntry('lcwu', 'LCWU', 'Jail Road'),
  campusEntry('itu', 'ITU', 'Arfa Tower, Ferozepur Road'),
  campusEntry('nca', 'NCA', 'The Mall'),
  campusEntry('kemu', 'KEMU', 'Neela Gumbad'),
  campusEntry('bnu', 'BNU', 'Tarogil, Raiwind Road'),
  campusEntry('riphah-lhr', 'Riphah Lahore', 'Raiwind Road'),
  campusEntry('uvas', 'UVAS', 'Outfall Road'),
  campusEntry('ue-township', 'University of Education', 'Township'),
];

export const CAMPUS_BY_ID = CAMPUSES.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

export const RADIUS_OPTIONS = [1, 2, 5, 10];

/** Keeps the chosen radius roughly filling the map when flying to a campus. */
export function zoomForRadius(km) {
  if (!km) return 14;
  if (km <= 1) return 15;
  if (km <= 2) return 14;
  if (km <= 5) return 13;
  return 12;
}

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

/**
 * Both basemaps are rendered from OpenStreetMap data by CARTO and need no key.
 * `{r}` resolves to `@2x` on retina screens. Leaflet substitutes it whether or
 * not `detectRetina` is set, and CARTO serves the HiDPI tile at that path.
 */
export const TILE_THEMES = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: OSM_ATTRIBUTION,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: OSM_ATTRIBUTION,
  },
  subdomains: 'abcd',
};

/** Screen-space grid cell, in CSS pixels, used by the clustering pass. */
export const CLUSTER_CELL_PX = 76;

/** How long the map has to sit still before we refetch. */
export const MOVE_DEBOUNCE_MS = 400;

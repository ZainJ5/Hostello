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
  {
    id: 'nust-h12',
    name: 'NUST',
    full: 'National University of Sciences & Technology',
    sector: 'H-12',
    city: 'Islamabad',
    university: 'NUST',
    lat: 33.6423,
    lng: 72.9905,
  },
  {
    id: 'fast-isb',
    name: 'FAST NUCES',
    full: 'FAST National University (CFD Campus)',
    sector: 'H-11/4',
    city: 'Islamabad',
    university: 'FAST',
    lat: 33.657,
    lng: 72.993,
  },
  {
    id: 'qau',
    name: 'QAU',
    full: 'Quaid-i-Azam University',
    sector: 'Murree Road',
    city: 'Islamabad',
    university: 'QAU',
    lat: 33.7463,
    lng: 73.1379,
  },
  {
    id: 'comsats-isb',
    name: 'COMSATS',
    full: 'COMSATS University Islamabad',
    sector: 'Park Road, Chak Shahzad',
    city: 'Islamabad',
    university: 'COMSATS',
    lat: 33.6518,
    lng: 73.1566,
  },
  {
    id: 'numl',
    name: 'NUML',
    full: 'National University of Modern Languages',
    sector: 'H-9',
    city: 'Islamabad',
    university: 'NUML',
    lat: 33.6796,
    lng: 73.0284,
  },
  {
    id: 'szabist-isb',
    name: 'SZABIST',
    full: 'Shaheed Zulfikar Ali Bhutto Institute',
    sector: 'H-8/4',
    city: 'Islamabad',
    university: 'SZABIST',
    lat: 33.6725,
    lng: 73.0745,
  },
  {
    id: 'riphah-i14',
    name: 'Riphah',
    full: 'Riphah International University',
    sector: 'I-14',
    city: 'Islamabad',
    university: 'Riphah',
    lat: 33.6316,
    lng: 72.9718,
  },
  {
    id: 'bahria-e8',
    name: 'Bahria',
    full: 'Bahria University Islamabad',
    sector: 'E-8',
    city: 'Islamabad',
    university: 'Bahria University',
    lat: 33.7107,
    lng: 73.0479,
  },
  {
    id: 'air-e9',
    name: 'Air University',
    full: 'Air University Islamabad',
    sector: 'E-9',
    city: 'Islamabad',
    university: 'Air University',
    lat: 33.7147,
    lng: 73.0596,
  },
  {
    id: 'iiui-h10',
    name: 'IIUI',
    full: 'International Islamic University',
    sector: 'H-10',
    city: 'Islamabad',
    university: 'IIUI',
    lat: 33.6663,
    lng: 73.0242,
  },
  {
    id: 'arid-rwp',
    name: 'Arid Agriculture',
    full: 'PMAS Arid Agriculture University',
    sector: 'Shamsabad, Murree Road',
    city: 'Rawalpindi',
    university: 'Arid Agriculture',
    lat: 33.6474,
    lng: 73.079,
  },
  {
    id: 'rmu-rwp',
    name: 'RMU',
    full: 'Rawalpindi Medical University',
    sector: 'Tipu Road',
    city: 'Rawalpindi',
    university: 'RMU',
    lat: 33.593,
    lng: 73.0546,
  },
  {
    id: 'fjwu-rwp',
    name: 'FJWU',
    full: 'Fatima Jinnah Women University',
    sector: 'The Mall',
    city: 'Rawalpindi',
    university: 'FJWU',
    lat: 33.5955,
    lng: 73.0555,
  },
  {
    id: 'lums',
    name: 'LUMS',
    full: 'Lahore University of Management Sciences',
    sector: 'DHA Phase 5',
    city: 'Lahore',
    university: 'LUMS',
    lat: 31.4704,
    lng: 74.4113,
  },
  {
    id: 'pu-new',
    name: 'Punjab University',
    full: 'University of the Punjab, New Campus',
    sector: 'Canal Road',
    city: 'Lahore',
    university: 'Punjab University',
    lat: 31.498,
    lng: 74.3005,
  },
  {
    id: 'uet-lhr',
    name: 'UET',
    full: 'UET Lahore',
    sector: 'G.T. Road',
    city: 'Lahore',
    university: 'UET',
    lat: 31.5786,
    lng: 74.3563,
  },
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

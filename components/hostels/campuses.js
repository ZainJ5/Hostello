/**
 * Approximate campus centroids for the universities listings reference.
 *
 * The listing documents only store the distance to their *nearest* university
 * (`distanceKm`), which isn't enough to answer "how far is this from FAST?" on
 * the detail page. These coordinates are taken from the main campus of each
 * institution and are accurate to a few hundred metres, which is enough for a
 * "2.4 km away" line but not a substitute for routing.
 */

export const CAMPUSES = {
  // ─── Islamabad ───
  NUST: { name: 'NUST', full: 'National University of Sciences & Technology', city: 'Islamabad', lat: 33.6423, lng: 72.9906 },
  FAST: { name: 'FAST', full: 'FAST-NUCES Islamabad', city: 'Islamabad', lat: 33.654, lng: 72.9857 },
  QAU: { name: 'QAU', full: 'Quaid-i-Azam University', city: 'Islamabad', lat: 33.7461, lng: 73.1387 },
  COMSATS: { name: 'COMSATS', full: 'COMSATS University Islamabad', city: 'Islamabad', lat: 33.6516, lng: 73.1568 },
  NUML: { name: 'NUML', full: 'National University of Modern Languages', city: 'Islamabad', lat: 33.68, lng: 73.0479 },
  SZABIST: { name: 'SZABIST', full: 'SZABIST Islamabad', city: 'Islamabad', lat: 33.67, lng: 73.074 },
  IIUI: { name: 'IIUI', full: 'International Islamic University Islamabad', city: 'Islamabad', lat: 33.665, lng: 73.023 },
  'Air University': { name: 'Air University', full: 'Air University E-9', city: 'Islamabad', lat: 33.7104, lng: 73.0653 },
  'Bahria University': { name: 'Bahria University', full: 'Bahria University E-8', city: 'Islamabad', lat: 33.7071, lng: 73.0479 },

  // ─── Rawalpindi ───
  Riphah: { name: 'Riphah', full: 'Riphah International University', city: 'Rawalpindi', lat: 33.593, lng: 73.04 },
  RMU: { name: 'RMU', full: 'Rawalpindi Medical University', city: 'Rawalpindi', lat: 33.5946, lng: 73.0521 },
  FJWU: { name: 'FJWU', full: 'Fatima Jinnah Women University', city: 'Rawalpindi', lat: 33.5977, lng: 73.0509 },
  'Arid Agriculture': { name: 'Arid Agriculture', full: 'PMAS Arid Agriculture University', city: 'Rawalpindi', lat: 33.6491, lng: 73.0793 },
  'Foundation University': { name: 'Foundation University', full: 'Foundation University New Lalazar', city: 'Rawalpindi', lat: 33.5738, lng: 73.0793 },

  // ─── Lahore ───
  LUMS: { name: 'LUMS', full: 'Lahore University of Management Sciences', city: 'Lahore', lat: 31.4704, lng: 74.4113 },
  UET: { name: 'UET', full: 'University of Engineering & Technology Lahore', city: 'Lahore', lat: 31.5786, lng: 74.3563 },
  'Punjab University': { name: 'Punjab University', full: 'University of the Punjab, New Campus', city: 'Lahore', lat: 31.498, lng: 74.3005 },
  'PU Old Campus': { name: 'PU Old Campus', full: 'University of the Punjab, Allama Iqbal (Old) Campus', city: 'Lahore', lat: 31.5719, lng: 74.3104 },
  'FAST Lahore': { name: 'FAST Lahore', full: 'FAST-NUCES Lahore', city: 'Lahore', lat: 31.4811, lng: 74.3034 },
  'COMSATS Lahore': { name: 'COMSATS Lahore', full: 'COMSATS University Islamabad, Lahore Campus', city: 'Lahore', lat: 31.4023, lng: 74.2094 },
  UCP: { name: 'UCP', full: 'University of Central Punjab', city: 'Lahore', lat: 31.4473, lng: 74.2681 },
  UMT: { name: 'UMT', full: 'University of Management and Technology', city: 'Lahore', lat: 31.4514, lng: 74.2941 },
  UOL: { name: 'UOL', full: 'The University of Lahore, Defence Road', city: 'Lahore', lat: 31.391, lng: 74.2416 },
  GCU: { name: 'GCU', full: 'Government College University Lahore', city: 'Lahore', lat: 31.5732, lng: 74.3084 },
  FCCU: { name: 'FCCU', full: 'Forman Christian College', city: 'Lahore', lat: 31.5215, lng: 74.3339 },
  'Kinnaird College': { name: 'Kinnaird College', full: 'Kinnaird College for Women', city: 'Lahore', lat: 31.5736, lng: 74.3345 },
  LCWU: { name: 'LCWU', full: 'Lahore College for Women University', city: 'Lahore', lat: 31.5447, lng: 74.3265 },
  ITU: { name: 'ITU', full: 'Information Technology University (Arfa Tower)', city: 'Lahore', lat: 31.4761, lng: 74.3426 },
  NCA: { name: 'NCA', full: 'National College of Arts', city: 'Lahore', lat: 31.5683, lng: 74.3072 },
  KEMU: { name: 'KEMU', full: 'King Edward Medical University', city: 'Lahore', lat: 31.5707, lng: 74.3142 },
  BNU: { name: 'BNU', full: 'Beaconhouse National University, Tarogil', city: 'Lahore', lat: 31.3648, lng: 74.2161 },
  'Riphah Lahore': { name: 'Riphah Lahore', full: 'Riphah International University, Lahore Campus', city: 'Lahore', lat: 31.378, lng: 74.2319 },
  UVAS: { name: 'UVAS', full: 'University of Veterinary and Animal Sciences', city: 'Lahore', lat: 31.5749, lng: 74.2996 },
  'University of Education': { name: 'University of Education', full: 'University of Education, Township Campus', city: 'Lahore', lat: 31.4505, lng: 74.2996 },

  // ─── Karachi ───
  IBA: { name: 'IBA', full: 'Institute of Business Administration', city: 'Karachi', lat: 24.9351, lng: 67.135 },
  NED: { name: 'NED', full: 'NED University of Engineering & Technology', city: 'Karachi', lat: 24.9319, lng: 67.1128 },
};

/** Names as they appear in `Hostel.universities`, in a stable display order. */
export const CAMPUS_NAMES = Object.keys(CAMPUSES);

export function getCampus(name) {
  return CAMPUSES[name] || null;
}

/** Every campus whose city matches, used to widen a listing's distance table. */
export function campusesInCity(city) {
  return CAMPUS_NAMES.map((k) => CAMPUSES[k]).filter((c) => c.city === city);
}

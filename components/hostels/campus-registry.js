/**
 * Merges admin-managed universities into the static campus lists.
 *
 * Every list that names universities is a plain array or object imported all
 * over the app, so rather than thread a new prop through each caller the rows
 * are applied to those same objects in place. The server applies them after
 * each database connect (see lib/campuses-server.js) and the browser applies
 * the copy the root layout hands to <CampusBootstrap>.
 *
 * Safe to import from client components: no mongoose in here.
 */
import { CAMPUSES, CAMPUS_NAMES } from './campuses';
import { UNIVERSITIES as OWNER_UNIS } from '@/components/owner/constants';
import { UNIVERSITIES as STUDENT_UNIS } from '@/components/student/constants';
import { CAMPUSES as MAP_CAMPUSES, UNIVERSITIES as MAP_UNIS } from '@/components/map/config';

const state = (globalThis.__hostelloCampusState ||= {
  builtinKeys: new Set(CAMPUS_NAMES),
  originals: {},
  added: new Set(),
  signature: '',
});

function removeFrom(list, value) {
  const i = list.indexOf(value);
  if (i !== -1) list.splice(i, 1);
}

function addTo(list, value, sorted) {
  if (list.includes(value)) return;
  if (!sorted) {
    list.push(value);
    return;
  }
  const i = list.findIndex((v) => v.localeCompare(value, 'en', { sensitivity: 'base' }) > 0);
  if (i === -1) list.push(value);
  else list.splice(i, 0, value);
}

function mapId(key) {
  return `custom-${String(key).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

/** Rows: [{ key, full, city, sector, lat, lng, active }] */
export function applyCampusRows(rows = []) {
  const clean = (rows || []).filter((r) => r && r.key);
  const signature = JSON.stringify(clean);
  if (signature === state.signature) return;
  state.signature = signature;

  // Undo the previous pass so edits and deletes take effect.
  for (const key of state.added) {
    delete CAMPUSES[key];
    removeFrom(CAMPUS_NAMES, key);
    removeFrom(OWNER_UNIS, key);
    removeFrom(STUDENT_UNIS, key);
    removeFrom(MAP_UNIS, key);
  }
  state.added.clear();
  for (let i = MAP_CAMPUSES.length - 1; i >= 0; i -= 1) {
    if (MAP_CAMPUSES[i].custom) MAP_CAMPUSES.splice(i, 1);
  }
  for (const [key, original] of Object.entries(state.originals)) {
    CAMPUSES[key] = original;
    addTo(CAMPUS_NAMES, key, false);
  }

  for (const r of clean) {
    const key = String(r.key);
    const point = {
      name: key,
      full: r.full || key,
      city: r.city || '',
      lat: Number(r.lat) || 0,
      lng: Number(r.lng) || 0,
    };

    if (state.builtinKeys.has(key)) {
      // Built-ins can be corrected but not hidden, since listings rely on them.
      if (!state.originals[key]) state.originals[key] = CAMPUSES[key];
      CAMPUSES[key] = point;
      continue;
    }

    if (r.active === false) continue;
    CAMPUSES[key] = point;
    state.added.add(key);
    addTo(CAMPUS_NAMES, key, false);
    addTo(OWNER_UNIS, key, false);
    addTo(STUDENT_UNIS, key, false);
    addTo(MAP_UNIS, key, true);
    MAP_CAMPUSES.push({
      id: mapId(key),
      name: key,
      full: point.full,
      sector: r.sector || '',
      city: point.city,
      university: key,
      lat: point.lat,
      lng: point.lng,
      custom: true,
    });
  }

  // Keep the map pins in line with edited built-in coordinates.
  for (const c of MAP_CAMPUSES) {
    if (c.custom) continue;
    if (!c.original) c.original = { lat: c.lat, lng: c.lng };
    const override = clean.find((r) => r.key === c.university);
    const p = override ? CAMPUSES[c.university] : c.original;
    c.lat = p.lat;
    c.lng = p.lng;
  }
}

export function isBuiltinCampus(key) {
  return state.builtinKeys.has(key);
}

/** The built-in value for a key, ignoring any admin override. */
export function builtinCampus(key) {
  return state.originals[key] || (state.builtinKeys.has(key) ? CAMPUSES[key] : null);
}

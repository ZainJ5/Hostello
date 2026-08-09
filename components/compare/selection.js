/**
 * URL grammar for the comparison. Client safe: no model, no database.
 *
 * THE COMPARISON LIVES IN THE URL. Client state alone would make a comparison
 * unshareable, and sharing it is most of the point: the frame's own second
 * call to action is "send all three to your family". So the selection is
 * `?h=slug,slug,slug`, the campus the distance row measures from is
 * `?campus=NUST`, and the page is a Server Component that renders from those.
 *
 *   /compare?h=a,b,c&campus=NUST
 */

export const MAX_COMPARE = 4;

/** Accepts an awaited `searchParams` object or a `URLSearchParams`. */
function read(sp, key) {
  if (sp && typeof sp.get === 'function') return sp.get(key);
  const v = sp?.[key];
  return Array.isArray(v) ? v[0] : (v ?? null);
}

export function parseSelection(sp) {
  const raw = String(read(sp, 'h') || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // A slug repeated in a hand-edited URL would produce two identical columns.
  const slugs = [...new Set(raw)].slice(0, MAX_COMPARE);

  return {
    slugs,
    campus: String(read(sp, 'campus') || '').trim().slice(0, 60),
  };
}

export function compareHref({ slugs = [], campus = '' } = {}) {
  const p = new URLSearchParams();
  if (slugs.length) p.set('h', slugs.join(','));
  if (campus) p.set('campus', campus);
  const s = p.toString();
  return s ? `/compare?${s}` : '/compare';
}

/** The href that drops one column, used by the remove control in each header. */
export function withoutSlug(selection, slug) {
  return compareHref({ ...selection, slugs: selection.slugs.filter((s) => s !== slug) });
}

/** The href that adds one, capped so the table never outgrows the screen. */
export function withSlug(selection, slug) {
  if (selection.slugs.includes(slug) || selection.slugs.length >= MAX_COMPARE) {
    return compareHref(selection);
  }
  return compareHref({ ...selection, slugs: [...selection.slugs, slug] });
}

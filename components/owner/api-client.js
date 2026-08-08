/**
 * Thin fetch wrapper for the owner console.
 *
 * The API layer answers `{ error, fieldErrors? }` on failure (see `@/lib/api`),
 * so every caller gets one predictable error object: `err.message` for the
 * banner/toast and `err.fieldErrors` for inline field errors.
 */
export async function apiSend(url, { method = 'POST', body, form, signal } = {}) {
  const init = { method, signal };

  if (form) {
    // Never set Content-Type for FormData — the browser has to add the boundary.
    init.body = form;
  } else if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = res.status;
    err.fieldErrors = normaliseFieldErrors(data.fieldErrors);
    throw err;
  }
  return data;
}

/** `{ name: ['too short'] }` from Zod's flatten → `{ name: 'too short' }`. */
function normaliseFieldErrors(input) {
  if (!input || typeof input !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = Array.isArray(value) ? value[0] : String(value);
  }
  return out;
}

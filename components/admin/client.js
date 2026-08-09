'use client';

/**
 * Thin wrapper over fetch for every admin mutation. It always resolves, so
 * callers branch on `res.ok` and surface `res.error` in a toast rather than
 * trying to catch across an await boundary.
 */
export async function apiSend(url, { method = 'POST', body, signal } = {}) {
  try {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const res = await fetch(url, {
      method,
      signal,
      headers: isForm || body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: data?.error || `Request failed (${res.status})`,
        fieldErrors: data?.fieldErrors || null,
      };
    }
    return { ok: true, status: res.status, data, error: null, fieldErrors: null };
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { ok: false, aborted: true, error: 'Cancelled', data: null, fieldErrors: null };
    }
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Network error. Check your connection and try again',
      fieldErrors: null,
    };
  }
}

export function apiGet(url, opts) {
  return apiSend(url, { method: 'GET', ...opts });
}

/** 12 Aug 2026, 14:05, used wherever a bare date is too coarse. */
export function formatDateTime(value) {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Axis ticks: "12 Aug" */
export function shortDay(value) {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/**
 * Thin fetch wrapper for the auth endpoints.
 *
 * Never throws on a non-2xx: every auth failure — wrong password, unverified
 * email, rate limited — is a normal outcome the form has to render, so the
 * caller gets `{ ok, status, data }` and branches on it. Only a dropped
 * connection produces `status: 0`.
 */
export async function apiRequest(path, { method = 'POST', body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: "Couldn't reach the server. Check your connection and try again." },
    };
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  return { ok: res.ok, status: res.status, data };
}

/** First inline message for a field from a 422 `fieldErrors` payload. */
export function fieldErrors(data) {
  const raw = data?.fieldErrors;
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(
    Object.entries(raw)
      .map(([key, messages]) => [key, Array.isArray(messages) ? messages[0] : messages])
      .filter(([, message]) => Boolean(message))
  );
}

export const GENERIC_ERROR = 'Something went wrong. Please try again.';

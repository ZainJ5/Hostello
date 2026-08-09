'use client';

/**
 * One JSON helper for every community form, so an error from the API is
 * surfaced the same way whichever form produced it, and a 429 never reaches a
 * student as a blank screen.
 */
export async function postJson(url, body, method = 'POST') {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Try again');
    err.status = res.status;
    err.fieldErrors = data.fieldErrors || null;
    err.href = data.href || null;
    throw err;
  }

  return data;
}

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function ok(data, init) {
  return NextResponse.json(data ?? { ok: true }, init);
}

export function created(data) {
  return NextResponse.json(data, { status: 201 });
}

export function fail(message, status = 400, extra) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Wraps a route handler so thrown errors become clean JSON instead of an
 * HTML stack trace. Zod issues are mapped to a fieldErrors object the forms
 * render inline; anything unexpected is logged and reported as a 500 without
 * leaking internals to the client.
 */
export function handler(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        return fail('Please check the highlighted fields', 422, {
          fieldErrors: err.flatten().fieldErrors,
        });
      }
      if (err?.status) {
        return fail(err.message, err.status);
      }
      // Duplicate key — surface which field collided.
      if (err?.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || 'value';
        return fail(`That ${field} is already in use`, 409);
      }
      console.error('[api]', err);
      return fail('Something went wrong on our end', 500);
    }
  };
}

/** Parses a JSON body, tolerating an empty one. */
export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

/** Best-effort client IP, for rate limiting behind a proxy. */
export function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '127.0.0.1';
}

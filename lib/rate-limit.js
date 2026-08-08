/**
 * Fixed-window limiter held in process memory. Adequate for a single Node
 * instance; move to Redis if the app is ever scaled horizontally, since each
 * instance would otherwise keep its own counters.
 */
const buckets = globalThis._rateBuckets || (globalThis._rateBuckets = new Map());

// Bound the map so a flood of distinct keys can't grow it without limit.
const MAX_KEYS = 10_000;

export function rateLimit(key, { max = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    if (buckets.size > MAX_KEYS) {
      for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfter: 0 };
  }

  if (entry.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true, remaining: max - entry.count, retryAfter: 0 };
}

/** Throws a 429 the api handler turns into JSON. */
export function enforceRateLimit(key, opts) {
  const res = rateLimit(key, opts);
  if (!res.allowed) {
    const err = new Error(
      `Too many attempts. Try again in ${res.retryAfter}s.`
    );
    err.status = 429;
    throw err;
  }
  return res;
}

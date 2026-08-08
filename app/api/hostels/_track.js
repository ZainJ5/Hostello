import crypto from 'node:crypto';
import { clientIp } from '@/lib/api';
import Hostel from '@/models/Hostel';
import PageView from '@/models/PageView';

/**
 * Shared engagement-tracking helper for the `/view` and `/contact` endpoints.
 * Not a route file — only `route.js` becomes an endpoint, so this module is
 * private to `app/api/hostels/**`.
 */

/**
 * Salted, truncated hash of IP + user agent. `PageView.visitor` is documented
 * as "enough to deduplicate without storing IPs", so the raw address never
 * reaches the database and the salt stops the 32-hex digest from being
 * reversed by hashing every address in a /24.
 */
export function visitorHash(req) {
  const salt = process.env.AUTH_SECRET || 'hostello';
  const ua = req.headers.get('user-agent') || '';
  return crypto
    .createHash('sha256')
    .update(`${clientIp(req)}|${ua}|${salt}`)
    .digest('hex')
    .slice(0, 32);
}

/** Prefers what the client reported, falls back to the Referer header. */
export function safeReferrer(reported, req) {
  const raw = String(reported || req.headers.get('referer') || '').trim();
  if (!raw) return '';
  return raw.slice(0, 300);
}

/**
 * Increments a denormalised counter on the listing and appends the matching
 * `PageView` row the owner and admin dashboards chart from. Returns null when
 * the slug doesn't resolve to a published listing.
 *
 * The counter update and the event row are two writes rather than one
 * transaction on purpose: an analytics row that fails to land must never cost
 * the student their page view, and Mongo standalone has no transactions here.
 */
export async function recordEngagement({ req, slug, counter, kind, referrer }) {
  const hostel = await Hostel.findOneAndUpdate(
    { slug, status: 'published' },
    { $inc: { [counter]: 1 } },
    { new: true, projection: { _id: 1, ownerId: 1, [counter]: 1 } }
  ).lean();

  if (!hostel) return null;

  try {
    await PageView.create({
      hostelId: hostel._id,
      ownerId: hostel.ownerId || null,
      kind,
      visitor: visitorHash(req),
      referrer: safeReferrer(referrer, req),
    });
  } catch (err) {
    console.error('[hostels/track] page view insert failed', err);
  }

  return hostel;
}

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import User from '@/models/User';
import Hostel from '@/models/Hostel';
import Booking from '@/models/Booking';
import Review from '@/models/Review';
import Payment from '@/models/Payment';
import PageView from '@/models/PageView';

/**
 * Every read on the owner console funnels through this module so the
 * `ownerId` filter is applied in exactly one place and can be audited at a
 * glance. Nothing here ever runs an unscoped query.
 */

// Pakistan Standard Time is UTC+5 with no daylight saving, so a fixed offset is
// exact. Charts bucket by PKT day, not UTC day; otherwise an evening view in
// Islamabad lands on the previous day's column.
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
export const PKT_OFFSET = '+05:00';

export function pktStartOfDay(input) {
  const ms = input instanceof Date ? input.getTime() : Number(input);
  return new Date(Math.floor((ms + PKT_OFFSET_MS) / 86400000) * 86400000 - PKT_OFFSET_MS);
}

export function pktDayKey(date) {
  return new Date(date.getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Inclusive window of `days` PKT days ending with today. */
export function windowOf(days) {
  const since = pktStartOfDay(Date.now() - (days - 1) * 86400000);
  const prevSince = new Date(since.getTime() - days * 86400000);
  return { since, prevSince, days };
}

/** Signed percentage change, guarding the divide-by-zero case. */
export function delta(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) return cur === 0 ? 0 : 100;
  return Math.round(((cur - prev) / prev) * 100);
}

function toObjectId(value) {
  const str = String(value || '');
  if (!mongoose.Types.ObjectId.isValid(str)) return null;
  return new mongoose.Types.ObjectId(str);
}

export function notFound(message = 'Not found') {
  const err = new Error(message);
  err.status = 404;
  return err;
}

/**
 * Casts a route parameter to an ObjectId, answering 404 rather than letting
 * Mongoose throw a CastError that would surface as a 500.
 */
export function objectIdOr404(value, label = 'record') {
  const oid = toObjectId(value);
  if (!oid) throw notFound(`That ${label} no longer exists`);
  return oid;
}

/**
 * Resolves the session and the owner whose data is in scope.
 *
 * - `owner` sessions are pinned to their own `_id`. There is no parameter that
 *   can move an owner off their own scope.
 * - `admin` sessions may pass an explicit `ownerId` (query string on pages,
 *   body field on routes) to inspect one owner's console. With no override an
 *   admin sees their own (normally empty) scope; the cross-owner view lives
 *   in /admin.
 */
export async function getOwnerContext(overrideOwnerId) {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const isAdmin = session.role === 'admin';

  let ownerId = toObjectId(session.userId);
  let impersonating = false;

  if (isAdmin && overrideOwnerId) {
    const forced = toObjectId(overrideOwnerId);
    if (forced) {
      ownerId = forced;
      impersonating = true;
    }
  }

  if (!ownerId) {
    const err = new Error('Your session is no longer valid. Sign in again.');
    err.status = 401;
    throw err;
  }

  return { session, ownerId, ownerIdStr: String(ownerId), isAdmin, impersonating };
}

/**
 * The ownership gate. Called on every document a mutation touches.
 *
 * Admins bypass it, explicitly and only when `session.role === 'admin'`. The
 * comparison below runs for every other session with no early exit above it.
 * A document that exists but belongs to someone else answers 404, not 403, so
 * an owner cannot probe for the existence of a competitor's listing.
 */
export function assertOwned(doc, session, label = 'record') {
  if (!doc) throw notFound(`That ${label} no longer exists`);
  if (session.role === 'admin') return doc;
  if (String(doc.ownerId || '') !== String(session.userId)) {
    throw notFound(`That ${label} no longer exists`);
  }
  return doc;
}

/** Loads a hostel by id and asserts the session owns it. */
export async function loadOwnedHostel(id, session) {
  const oid = toObjectId(id);
  if (!oid) throw notFound('That listing no longer exists');
  const hostel = await Hostel.findById(oid);
  return assertOwned(hostel, session, 'listing');
}

/** Hostel ids belonging to this owner: the join key for every child query. */
export async function ownedHostelIds(ownerId) {
  const rows = await Hostel.find({ ownerId }).select('_id').lean();
  return rows.map((r) => r._id);
}

export async function getOwnerProfile(ownerId) {
  const user = await User.findById(ownerId)
    .select('name email phone city businessName cnic avatar role createdAt')
    .lean();
  return user;
}

// ─── Layout banner ──────────────────────────────────────────────────────

/**
 * Small, cheap counts the sidebar shell needs on every owner page. Anything
 * heavier belongs on the dashboard, not in the layout.
 */
export async function getActionSummary(ownerId) {
  const ids = await ownedHostelIds(ownerId);

  const [statusRows, pendingBookings, unrepliedReviews, rejectedPayments] = await Promise.all([
    Hostel.aggregate([
      { $match: { ownerId } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    ids.length
      ? Booking.countDocuments({ hostelId: { $in: ids }, status: 'pending' })
      : 0,
    ids.length
      ? Review.countDocuments({
          hostelId: { $in: ids },
          status: 'published',
          $or: [{ ownerReply: '' }, { ownerReply: { $exists: false } }],
        })
      : 0,
    Payment.countDocuments({ ownerId, status: 'rejected' }),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r._id, r.n]));
  return {
    total: ids.length,
    draft: byStatus.draft || 0,
    pendingPayment: byStatus.pending_payment || 0,
    pendingReview: byStatus.pending_review || 0,
    published: byStatus.published || 0,
    rejected: byStatus.rejected || 0,
    suspended: byStatus.suspended || 0,
    pendingBookings,
    unrepliedReviews,
    rejectedPayments,
  };
}

// ─── Dashboard ──────────────────────────────────────────────────────────

const PAGEVIEW_KINDS = ['view', 'contact', 'save'];

/** { view: n, contact: n, save: n } for one window, scoped by ownerId. */
async function eventTotals(ownerId, since, until) {
  const match = { ownerId, createdAt: until ? { $gte: since, $lt: until } : { $gte: since } };
  const rows = await PageView.aggregate([
    { $match: match },
    { $group: { _id: '$kind', n: { $sum: 1 } } },
  ]);
  const out = { view: 0, contact: 0, save: 0 };
  for (const r of rows) if (PAGEVIEW_KINDS.includes(r._id)) out[r._id] = r.n;
  return out;
}

/** Daily [{ date, views, contacts, saves }] with zero-filled gaps. */
async function dailySeries(ownerId, since, days) {
  const rows = await PageView.aggregate([
    { $match: { ownerId, createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          d: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: PKT_OFFSET },
          },
          k: '$kind',
        },
        n: { $sum: 1 },
      },
    },
  ]);

  const map = new Map();
  for (const r of rows) {
    const entry = map.get(r._id.d) || { views: 0, contacts: 0, saves: 0 };
    if (r._id.k === 'view') entry.views = r.n;
    else if (r._id.k === 'contact') entry.contacts = r.n;
    else if (r._id.k === 'save') entry.saves = r.n;
    map.set(r._id.d, entry);
  }

  const series = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(since.getTime() + i * 86400000);
    const key = pktDayKey(day);
    series.push({ date: key, ...(map.get(key) || { views: 0, contacts: 0, saves: 0 }) });
  }
  return series;
}

/** Per-hostel event counts inside a window: Map<hostelId, {view,contact,save}>. */
async function eventsByHostel(ownerId, since) {
  const rows = await PageView.aggregate([
    { $match: { ownerId, createdAt: { $gte: since } } },
    { $group: { _id: { h: '$hostelId', k: '$kind' }, n: { $sum: 1 } } },
  ]);
  const map = new Map();
  for (const r of rows) {
    const key = String(r._id.h);
    const entry = map.get(key) || { view: 0, contact: 0, save: 0 };
    entry[r._id.k] = r.n;
    map.set(key, entry);
  }
  return map;
}

export async function getDashboard(ownerId) {
  const { since, prevSince } = windowOf(30);

  const hostels = await Hostel.find({ ownerId })
    .select(
      'name slug status images city area price rating reviewCount views contactClicks ' +
        'saveCount rejectionReason available createdAt updatedAt publishedAt'
    )
    .sort({ updatedAt: -1 })
    .lean();

  const ids = hostels.map((h) => h._id);
  const hasListings = ids.length > 0;

  const [
    current,
    previous,
    series,
    perHostel,
    bookingStatus,
    bookingsCurrent,
    bookingsPrevious,
    recentBookings,
    ratingAgg,
    ratingPrevAgg,
    unrepliedReviews,
    payments,
  ] = await Promise.all([
    eventTotals(ownerId, since),
    eventTotals(ownerId, prevSince, since),
    dailySeries(ownerId, since, 30),
    eventsByHostel(ownerId, since),
    hasListings
      ? Booking.aggregate([
          { $match: { hostelId: { $in: ids } } },
          { $group: { _id: '$status', n: { $sum: 1 } } },
        ])
      : [],
    hasListings
      ? Booking.countDocuments({ hostelId: { $in: ids }, createdAt: { $gte: since } })
      : 0,
    hasListings
      ? Booking.countDocuments({
          hostelId: { $in: ids },
          createdAt: { $gte: prevSince, $lt: since },
        })
      : 0,
    hasListings
      ? Booking.find({ hostelId: { $in: ids } })
          .sort({ status: 1, createdAt: -1 })
          .limit(8)
          .lean()
      : [],
    hasListings
      ? Review.aggregate([
          { $match: { hostelId: { $in: ids }, status: 'published' } },
          { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
        ])
      : [],
    hasListings
      ? Review.aggregate([
          {
            $match: {
              hostelId: { $in: ids },
              status: 'published',
              createdAt: { $lt: since },
            },
          },
          { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
        ])
      : [],
    hasListings
      ? Review.find({
          hostelId: { $in: ids },
          status: 'published',
          $or: [{ ownerReply: '' }, { ownerReply: { $exists: false } }],
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      : [],
    Payment.find({ ownerId }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  const bookingCounts = Object.fromEntries(bookingStatus.map((r) => [r._id, r.n]));
  const nameById = new Map(hostels.map((h) => [String(h._id), h.name]));

  // Per-listing performance table, ordered by 30-day views.
  const performance = hostels
    .map((h) => {
      const e = perHostel.get(String(h._id)) || { view: 0, contact: 0, save: 0 };
      return {
        _id: String(h._id),
        name: h.name,
        slug: h.slug,
        status: h.status,
        rating: h.rating,
        reviewCount: h.reviewCount,
        views: e.view,
        contacts: e.contact,
        saves: e.save,
        lifetimeViews: h.views,
        bookings: 0,
      };
    })
    .sort((a, b) => b.views - a.views);

  if (hasListings) {
    const bookingsPerHostel = await Booking.aggregate([
      { $match: { hostelId: { $in: ids }, createdAt: { $gte: since } } },
      { $group: { _id: '$hostelId', n: { $sum: 1 } } },
    ]);
    const bmap = new Map(bookingsPerHostel.map((r) => [String(r._id), r.n]));
    for (const row of performance) row.bookings = bmap.get(row._id) || 0;
  }

  const statusCounts = hostels.reduce((acc, h) => {
    acc[h.status] = (acc[h.status] || 0) + 1;
    return acc;
  }, {});

  const avgRating = ratingAgg[0]?.avg || 0;
  const prevAvgRating = ratingPrevAgg[0]?.avg || 0;

  return {
    hostels: hostels.map((h) => ({ ...h, _id: String(h._id) })),
    statusCounts,
    stats: {
      listings: hostels.length,
      published: statusCounts.published || 0,
      pending:
        (statusCounts.pending_payment || 0) +
        (statusCounts.pending_review || 0) +
        (statusCounts.draft || 0),
      views: current.view,
      viewsDelta: delta(current.view, previous.view),
      contacts: current.contact,
      contactsDelta: delta(current.contact, previous.contact),
      saves: current.save,
      savesDelta: delta(current.save, previous.save),
      bookings: bookingsCurrent,
      bookingsDelta: delta(bookingsCurrent, bookingsPrevious),
      pendingBookings: bookingCounts.pending || 0,
      rating: Math.round(avgRating * 10) / 10,
      ratingCount: ratingAgg[0]?.n || 0,
      ratingDelta:
        prevAvgRating > 0
          ? Math.round(((avgRating - prevAvgRating) / prevAvgRating) * 100)
          : null,
    },
    series,
    performance,
    bookingCounts,
    recentBookings: recentBookings.map((b) => ({
      ...b,
      _id: String(b._id),
      hostelName: nameById.get(String(b.hostelId)) || 'Listing removed',
    })),
    unrepliedReviews: unrepliedReviews.map((r) => ({
      ...r,
      _id: String(r._id),
      hostelName: nameById.get(String(r.hostelId)) || 'Listing removed',
    })),
    payments: payments.map((p) => ({
      ...p,
      _id: String(p._id),
      hostelName: nameById.get(String(p.hostelId)) || 'Listing removed',
    })),
  };
}

// ─── Listings ───────────────────────────────────────────────────────────

export async function getOwnerListings(ownerId, { status } = {}) {
  const query = { ownerId };
  if (status && status !== 'all') query.status = status;

  const hostels = await Hostel.find(query)
    .select(
      'name slug status city area gender price priceMin priceMax images rating reviewCount ' +
        'views contactClicks saveCount rejectionReason available verified featured ' +
        'createdAt updatedAt publishedAt universities'
    )
    .sort({ updatedAt: -1 })
    .lean();

  const ids = hostels.map((h) => h._id);
  const [bookingRows, paymentRows, statusRows] = await Promise.all([
    ids.length
      ? Booking.aggregate([
          { $match: { hostelId: { $in: ids } } },
          { $group: { _id: { h: '$hostelId', s: '$status' }, n: { $sum: 1 } } },
        ])
      : [],
    ids.length
      ? Payment.find({ ownerId, hostelId: { $in: ids } })
          .sort({ createdAt: -1 })
          .select('hostelId status amount createdAt reviewNote')
          .lean()
      : [],
    Hostel.aggregate([{ $match: { ownerId } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);

  const bookingMap = new Map();
  for (const r of bookingRows) {
    const key = String(r._id.h);
    const entry = bookingMap.get(key) || { total: 0, pending: 0 };
    entry.total += r.n;
    if (r._id.s === 'pending') entry.pending += r.n;
    bookingMap.set(key, entry);
  }

  const paymentMap = new Map();
  for (const p of paymentRows) {
    const key = String(p.hostelId);
    if (!paymentMap.has(key)) paymentMap.set(key, p); // newest first
  }

  return {
    counts: Object.fromEntries(statusRows.map((r) => [r._id, r.n])),
    total: statusRows.reduce((n, r) => n + r.n, 0),
    listings: hostels.map((h) => {
      const b = bookingMap.get(String(h._id)) || { total: 0, pending: 0 };
      const p = paymentMap.get(String(h._id)) || null;
      return {
        ...h,
        _id: String(h._id),
        bookings: b.total,
        pendingBookings: b.pending,
        latestPayment: p ? { ...p, _id: String(p._id), hostelId: String(p.hostelId) } : null,
      };
    }),
  };
}

// ─── Bookings ───────────────────────────────────────────────────────────

export async function getOwnerBookings(ownerId, { status, hostelId } = {}) {
  const hostels = await Hostel.find({ ownerId }).select('_id name slug').lean();
  const ids = hostels.map((h) => h._id);
  const nameById = new Map(hostels.map((h) => [String(h._id), h.name]));

  if (!ids.length) {
    return { bookings: [], hostels: [], counts: {}, total: 0 };
  }

  // A hostelId filter is intersected with the owner's own ids, so a forged
  // value can only ever narrow the scope, never widen it.
  let scoped = ids;
  if (hostelId && hostelId !== 'all') {
    scoped = ids.filter((id) => String(id) === String(hostelId));
    if (!scoped.length) scoped = [];
  }

  const query = { hostelId: { $in: scoped } };
  if (status && status !== 'all') query.status = status;

  const [bookings, counts] = await Promise.all([
    Booking.find(query).sort({ createdAt: -1 }).limit(200).lean(),
    Booking.aggregate([
      { $match: { hostelId: { $in: ids } } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
  ]);

  return {
    hostels: hostels.map((h) => ({ _id: String(h._id), name: h.name, slug: h.slug })),
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    total: counts.reduce((n, c) => n + c.n, 0),
    bookings: bookings.map((b) => ({
      ...b,
      _id: String(b._id),
      hostelId: String(b.hostelId),
      studentId: String(b.studentId),
      hostelName: nameById.get(String(b.hostelId)) || 'Listing removed',
    })),
  };
}

// ─── Reviews ────────────────────────────────────────────────────────────

export async function getOwnerReviews(ownerId, { filter, hostelId } = {}) {
  const hostels = await Hostel.find({ ownerId }).select('_id name slug rating reviewCount').lean();
  const ids = hostels.map((h) => h._id);
  const nameById = new Map(hostels.map((h) => [String(h._id), h.name]));

  if (!ids.length) return { reviews: [], hostels: [], counts: {}, average: 0, breakdown: [] };

  let scoped = ids;
  if (hostelId && hostelId !== 'all') {
    scoped = ids.filter((id) => String(id) === String(hostelId));
  }

  const query = { hostelId: { $in: scoped } };
  if (filter === 'unreplied') {
    query.status = 'published';
    query.$or = [{ ownerReply: '' }, { ownerReply: { $exists: false } }];
  } else if (filter === 'replied') {
    query.ownerReply = { $nin: ['', null] };
  } else if (filter === 'flagged') {
    query.status = 'flagged';
  }

  const [reviews, all] = await Promise.all([
    Review.find(query).sort({ createdAt: -1 }).limit(200).lean(),
    Review.find({ hostelId: { $in: ids } }).select('rating status ownerReply').lean(),
  ]);

  const published = all.filter((r) => r.status === 'published');
  const average = published.length
    ? published.reduce((s, r) => s + r.rating, 0) / published.length
    : 0;

  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: published.filter((r) => Math.round(r.rating) === star).length,
  }));

  return {
    hostels: hostels.map((h) => ({ _id: String(h._id), name: h.name })),
    counts: {
      all: all.length,
      unreplied: all.filter((r) => r.status === 'published' && !r.ownerReply).length,
      replied: all.filter((r) => !!r.ownerReply).length,
      flagged: all.filter((r) => r.status === 'flagged').length,
    },
    average: Math.round(average * 10) / 10,
    breakdown,
    reviews: reviews.map((r) => ({
      ...r,
      _id: String(r._id),
      hostelId: String(r.hostelId),
      studentId: String(r.studentId),
      hostelName: nameById.get(String(r.hostelId)) || 'Listing removed',
    })),
  };
}

// ─── Payments ───────────────────────────────────────────────────────────

export async function getOwnerPayments(ownerId) {
  const payments = await Payment.find({ ownerId }).sort({ createdAt: -1 }).lean();
  const hostelIds = [...new Set(payments.map((p) => String(p.hostelId)))];
  const hostels = hostelIds.length
    ? await Hostel.find({ _id: { $in: hostelIds }, ownerId }).select('name slug status').lean()
    : [];
  const byId = new Map(hostels.map((h) => [String(h._id), h]));

  const approved = payments.filter((p) => p.status === 'approved');
  return {
    payments: payments.map((p) => ({
      ...p,
      _id: String(p._id),
      hostelId: String(p.hostelId),
      hostel: byId.get(String(p.hostelId))
        ? {
            name: byId.get(String(p.hostelId)).name,
            slug: byId.get(String(p.hostelId)).slug,
            status: byId.get(String(p.hostelId)).status,
          }
        : null,
    })),
    totals: {
      count: payments.length,
      paid: approved.reduce((s, p) => s + (p.amount || 0), 0),
      pending: payments.filter((p) => p.status === 'pending').length,
      rejected: payments.filter((p) => p.status === 'rejected').length,
    },
  };
}

/** The payment record a listing is currently working against, if any. */
export async function getLatestPaymentFor(ownerId, hostelId) {
  const payment = await Payment.findOne({ ownerId, hostelId }).sort({ createdAt: -1 }).lean();
  return payment ? { ...payment, _id: String(payment._id), hostelId: String(payment.hostelId) } : null;
}

// ─── Analytics ──────────────────────────────────────────────────────────

const REFERRER_LABELS = {
  google: 'Google',
  direct: 'Direct',
  facebook: 'Facebook',
  instagram: 'Instagram',
  '': 'Unknown',
};

export async function getOwnerAnalytics(ownerId, days = 30) {
  const { since, prevSince } = windowOf(days);

  const hostels = await Hostel.find({ ownerId })
    .select('name slug status rating reviewCount views contactClicks saveCount')
    .lean();
  const ids = hostels.map((h) => h._id);
  const hasListings = ids.length > 0;

  const [current, previous, series, perHostel, referrerRows, bookingRows, reviewRows] =
    await Promise.all([
      eventTotals(ownerId, since),
      eventTotals(ownerId, prevSince, since),
      dailySeries(ownerId, since, days),
      eventsByHostel(ownerId, since),
      PageView.aggregate([
        { $match: { ownerId, kind: 'view', createdAt: { $gte: since } } },
        { $group: { _id: '$referrer', n: { $sum: 1 } } },
        { $sort: { n: -1 } },
      ]),
      hasListings
        ? Booking.aggregate([
            { $match: { hostelId: { $in: ids }, createdAt: { $gte: since } } },
            { $group: { _id: '$status', n: { $sum: 1 } } },
          ])
        : [],
      hasListings
        ? Review.find({ hostelId: { $in: ids }, status: 'published' })
            .select('rating createdAt')
            .sort({ createdAt: 1 })
            .lean()
        : [],
    ]);

  const bookingCounts = Object.fromEntries(bookingRows.map((r) => [r._id, r.n]));
  const bookingsTotal = bookingRows.reduce((n, r) => n + r.n, 0);

  // Conversion funnel across the selected window.
  const funnel = [
    { stage: 'Views', value: current.view },
    { stage: 'Contacts', value: current.contact },
    { stage: 'Requests', value: bookingsTotal },
    { stage: 'Confirmed', value: bookingCounts.confirmed || 0 },
  ].map((step, i, arr) => ({
    ...step,
    rate: arr[0].value ? Math.round((step.value / arr[0].value) * 1000) / 10 : 0,
    stepRate:
      i === 0 || !arr[i - 1].value
        ? 100
        : Math.round((step.value / arr[i - 1].value) * 1000) / 10,
  }));

  // Rating trend: the running average of every published review up to the end
  // of each day in the window, plus how many landed that day.
  const ratingTrend = [];
  let cumulativeSum = 0;
  let cumulativeCount = 0;
  let cursor = 0;
  const sorted = reviewRows;
  for (let i = 0; i < days; i++) {
    const dayEnd = new Date(since.getTime() + (i + 1) * 86400000);
    let newToday = 0;
    while (cursor < sorted.length && new Date(sorted[cursor].createdAt) < dayEnd) {
      cumulativeSum += sorted[cursor].rating;
      cumulativeCount += 1;
      if (new Date(sorted[cursor].createdAt) >= new Date(dayEnd.getTime() - 86400000)) {
        newToday += 1;
      }
      cursor += 1;
    }
    ratingTrend.push({
      date: pktDayKey(new Date(since.getTime() + i * 86400000)),
      rating: cumulativeCount ? Math.round((cumulativeSum / cumulativeCount) * 100) / 100 : null,
      reviews: newToday,
    });
  }

  const comparison = hostels
    .map((h) => {
      const e = perHostel.get(String(h._id)) || { view: 0, contact: 0, save: 0 };
      return {
        _id: String(h._id),
        name: h.name,
        status: h.status,
        rating: h.rating,
        views: e.view,
        contacts: e.contact,
        saves: e.save,
        conversion: e.view ? Math.round((e.contact / e.view) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.views - a.views);

  return {
    range: days,
    hasListings,
    listingCount: hostels.length,
    totals: {
      views: current.view,
      viewsDelta: delta(current.view, previous.view),
      contacts: current.contact,
      contactsDelta: delta(current.contact, previous.contact),
      saves: current.save,
      savesDelta: delta(current.save, previous.save),
      bookings: bookingsTotal,
      conversion: current.view
        ? Math.round((current.contact / current.view) * 1000) / 10
        : 0,
    },
    series,
    comparison,
    funnel,
    referrers: referrerRows.map((r) => ({
      source: REFERRER_LABELS[r._id] ?? (r._id || 'Unknown'),
      value: r.n,
    })),
    bookingBreakdown: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'].map(
      (s) => ({ status: s, value: bookingCounts[s] || 0 })
    ),
    ratingTrend,
  };
}

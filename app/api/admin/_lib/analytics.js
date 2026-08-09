import Hostel from '@/models/Hostel';
import User from '@/models/User';
import Booking from '@/models/Booking';
import Review from '@/models/Review';
import Payment from '@/models/Payment';
import PageView from '@/models/PageView';
import AuditLog from '@/models/AuditLog';

export const RANGES = [7, 30, 90];

export function normalizeRange(value) {
  const n = Number(value);
  return RANGES.includes(n) ? n : 30;
}

/** Signed period-over-period change, or null when there is no prior baseline. */
export function deltaPct(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) return cur === 0 ? 0 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

function startOfDayUTC(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function dayKey(d) {
  return startOfDayUTC(d).toISOString().slice(0, 10);
}

/** Continuous day axis, so charts never skip a day just because it had no rows. */
function dayAxis(days, endDate = new Date()) {
  const out = [];
  const end = startOfDayUTC(endDate);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const kindSum = (kind) => ({ $sum: { $cond: [{ $eq: ['$kind', kind] }, 1, 0] } });

/** PageView rows bucketed per day, split by kind, over the last `days` days. */
async function trafficSeries(days) {
  const since = startOfDayUTC(new Date());
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const rows = await PageView.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        views: kindSum('view'),
        contacts: kindSum('contact'),
        saves: kindSum('save'),
      },
    },
  ]);

  const byDay = new Map(rows.map((r) => [r._id, r]));
  return dayAxis(days).map((date) => {
    const r = byDay.get(date);
    return {
      date,
      views: r?.views || 0,
      contacts: r?.contacts || 0,
      saves: r?.saves || 0,
    };
  });
}

async function countPageViews(kind, from, to) {
  const match = { createdAt: { $gte: from, $lt: to } };
  if (kind) match.kind = kind;
  return PageView.countDocuments(match);
}

// ─── Overview ────────────────────────────────────────────────────────────

export async function getOverview() {
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const d60 = new Date(now.getTime() - 60 * 86400000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [
    statusCounts,
    roleCounts,
    listingsNew,
    listingsPrev,
    usersNew,
    usersPrev,
    bookingsThisMonth,
    bookingsLastMonth,
    pendingPayments,
    prevPendingPayments,
    views30,
    viewsPrev30,
    flaggedReviews,
    series,
  ] = await Promise.all([
    Hostel.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
    Hostel.countDocuments({ createdAt: { $gte: d30 } }),
    Hostel.countDocuments({ createdAt: { $gte: d60, $lt: d30 } }),
    User.countDocuments({ createdAt: { $gte: d30 } }),
    User.countDocuments({ createdAt: { $gte: d60, $lt: d30 } }),
    Booking.countDocuments({ createdAt: { $gte: monthStart } }),
    Booking.countDocuments({ createdAt: { $gte: prevMonthStart, $lt: monthStart } }),
    Payment.countDocuments({ status: 'pending' }),
    Payment.countDocuments({ status: 'pending', createdAt: { $lt: d30 } }),
    countPageViews('view', d30, now),
    countPageViews('view', d60, d30),
    Review.countDocuments({ status: 'flagged' }),
    trafficSeries(30),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((r) => [r._id, r.n]));
  const byRole = Object.fromEntries(roleCounts.map((r) => [r._id, r.n]));
  const totalListings = statusCounts.reduce((a, r) => a + r.n, 0);
  const totalUsers = roleCounts.reduce((a, r) => a + r.n, 0);

  const [queue, pendingListings, recentAudit, recentUsers, recentBookings, top] =
    await Promise.all([
      Payment.find({ status: 'pending' })
        .sort({ createdAt: 1 })
        .limit(6)
        .populate('hostelId', 'name slug city status')
        .populate('ownerId', 'name email')
        .lean(),
      Hostel.find({ status: 'pending_review' })
        .sort({ createdAt: 1 })
        .limit(6)
        .populate('ownerId', 'name email')
        .lean(),
      AuditLog.find({}).sort({ createdAt: -1 }).limit(10).lean(),
      User.find({}).sort({ createdAt: -1 }).limit(5).select('name email role createdAt').lean(),
      Booking.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('hostelId', 'name slug')
        .select('studentName status createdAt hostelId')
        .lean(),
      topListings(30, 6),
    ]);

  const activity = [
    ...recentAudit.map((a) => ({
      id: `audit-${a._id}`,
      kind: 'audit',
      action: a.action,
      actor: a.actorEmail || 'system',
      target: a.targetType,
      at: a.createdAt,
      meta: a.meta,
    })),
    ...recentUsers.map((u) => ({
      id: `user-${u._id}`,
      kind: 'signup',
      action: 'user.signup',
      actor: u.email,
      target: u.role,
      at: u.createdAt,
      meta: { name: u.name },
    })),
    ...recentBookings.map((b) => ({
      id: `booking-${b._id}`,
      kind: 'booking',
      action: 'booking.created',
      actor: b.studentName || 'A student',
      target: b.hostelId?.name || 'a listing',
      at: b.createdAt,
      meta: { status: b.status },
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 12);

  return {
    stats: {
      totalListings,
      published: byStatus.published || 0,
      pendingReview: byStatus.pending_review || 0,
      pendingPaymentListings: byStatus.pending_payment || 0,
      draft: byStatus.draft || 0,
      suspended: byStatus.suspended || 0,
      rejected: byStatus.rejected || 0,
      listingsDelta: deltaPct(listingsNew, listingsPrev),
      totalUsers,
      students: byRole.student || 0,
      owners: byRole.owner || 0,
      admins: byRole.admin || 0,
      usersDelta: deltaPct(usersNew, usersPrev),
      bookingsThisMonth,
      bookingsDelta: deltaPct(bookingsThisMonth, bookingsLastMonth),
      pendingPayments,
      pendingPaymentsDelta: deltaPct(pendingPayments, prevPendingPayments),
      views30,
      viewsDelta: deltaPct(views30, viewsPrev30),
      flaggedReviews,
    },
    series,
    queue,
    pendingListings,
    activity,
    top,
  };
}

/** Engagement leaderboard for a window, joined back to the listing. */
export async function topListings(days, limit = 10) {
  const since = new Date(Date.now() - days * 86400000);

  const rows = await PageView.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: '$hostelId',
        views: kindSum('view'),
        contacts: kindSum('contact'),
        saves: kindSum('save'),
      },
    },
    { $sort: { views: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'hostels',
        localField: '_id',
        foreignField: '_id',
        as: 'hostel',
      },
    },
    { $unwind: '$hostel' },
    {
      $project: {
        _id: 1,
        views: 1,
        contacts: 1,
        saves: 1,
        name: '$hostel.name',
        slug: '$hostel.slug',
        city: '$hostel.city',
        status: '$hostel.status',
        rating: '$hostel.rating',
        reviewCount: '$hostel.reviewCount',
      },
    },
  ]);

  if (!rows.length) return [];

  const ids = rows.map((r) => r._id);
  const bookings = await Booking.aggregate([
    { $match: { hostelId: { $in: ids }, createdAt: { $gte: since } } },
    { $group: { _id: '$hostelId', n: { $sum: 1 } } },
  ]);
  const bookingBy = new Map(bookings.map((b) => [String(b._id), b.n]));

  return rows.map((r) => {
    const bookingCount = bookingBy.get(String(r._id)) || 0;
    return {
      ...r,
      bookings: bookingCount,
      // Contact clicks per view is the only conversion the platform can observe.
      conversion: r.views ? Math.round((r.contacts / r.views) * 1000) / 10 : 0,
    };
  });
}

// ─── Analytics page ──────────────────────────────────────────────────────

const PRICE_BUCKETS = [
  { label: 'Under 8k', min: 0, max: 8000 },
  { label: '8–12k', min: 8000, max: 12000 },
  { label: '12–16k', min: 12000, max: 16000 },
  { label: '16–20k', min: 16000, max: 20000 },
  { label: '20–25k', min: 20000, max: 25000 },
  { label: '25–30k', min: 25000, max: 30000 },
  { label: '30k+', min: 30000, max: Infinity },
];

export async function getAnalytics(daysInput) {
  const days = normalizeRange(daysInput);
  const since = new Date(Date.now() - days * 86400000);

  const [series, hostels, bookingAgg, ratingAgg, userRows, topViews, topBookingRows] =
    await Promise.all([
      trafficSeries(days),
      Hostel.find({}).select('price city universities gender status').lean(),
      Booking.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
      Review.aggregate([
        { $match: { status: { $ne: 'removed' } } },
        { $group: { _id: '$rating', n: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              role: '$role',
            },
            n: { $sum: 1 },
          },
        },
      ]),
      topListings(days, 10),
      Booking.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$hostelId', bookings: { $sum: 1 } } },
        { $sort: { bookings: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'hostels', localField: '_id', foreignField: '_id', as: 'h' } },
        { $unwind: '$h' },
        {
          $project: {
            bookings: 1,
            name: '$h.name',
            slug: '$h.slug',
            city: '$h.city',
            status: '$h.status',
          },
        },
      ]),
    ]);

  // ── Listing composition (reduced in JS so labels stay exact) ──
  const cityMap = new Map();
  const uniMap = new Map();
  const genderMap = new Map();
  const priceCounts = PRICE_BUCKETS.map((b) => ({ label: b.label, count: 0 }));

  for (const h of hostels) {
    cityMap.set(h.city || 'Unknown', (cityMap.get(h.city || 'Unknown') || 0) + 1);
    genderMap.set(h.gender || 'Mixed', (genderMap.get(h.gender || 'Mixed') || 0) + 1);
    for (const u of h.universities || []) uniMap.set(u, (uniMap.get(u) || 0) + 1);
    const idx = PRICE_BUCKETS.findIndex((b) => h.price >= b.min && h.price < b.max);
    if (idx >= 0) priceCounts[idx].count += 1;
  }

  const toSorted = (map, limit) =>
    [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  // ── Funnel ──
  const totals = series.reduce(
    (a, d) => ({
      views: a.views + d.views,
      contacts: a.contacts + d.contacts,
      saves: a.saves + d.saves,
    }),
    { views: 0, contacts: 0, saves: 0 }
  );
  const bookingByStatus = Object.fromEntries(bookingAgg.map((r) => [r._id, r.n]));
  const bookingTotal = bookingAgg.reduce((a, r) => a + r.n, 0);
  const confirmed = (bookingByStatus.confirmed || 0) + (bookingByStatus.completed || 0);

  const funnel = [
    { stage: 'Views', value: totals.views },
    { stage: 'Contacts', value: totals.contacts },
    { stage: 'Bookings', value: bookingTotal },
    { stage: 'Confirmed', value: confirmed },
  ].map((s, i, arr) => ({
    ...s,
    // Rate against the previous stage, and against the top of the funnel.
    stepRate: i === 0 ? 100 : arr[i - 1].value ? round1((s.value / arr[i - 1].value) * 100) : 0,
    overallRate: arr[0].value ? round1((s.value / arr[0].value) * 100) : 0,
  }));

  // ── New users per day, split by role ──
  const userBy = new Map();
  for (const r of userRows) userBy.set(`${r._id.day}|${r._id.role}`, r.n);
  const newUsers = dayAxis(days).map((date) => ({
    date,
    student: userBy.get(`${date}|student`) || 0,
    owner: userBy.get(`${date}|owner`) || 0,
    admin: userBy.get(`${date}|admin`) || 0,
  }));

  const ratingBy = Object.fromEntries(ratingAgg.map((r) => [r._id, r.n]));
  const ratings = [1, 2, 3, 4, 5].map((stars) => ({
    label: `${stars} star${stars > 1 ? 's' : ''}`,
    stars,
    count: ratingBy[stars] || 0,
  }));

  return {
    days,
    series,
    totals,
    funnel,
    bookingByStatus,
    byCity: toSorted(cityMap, 10),
    byUniversity: toSorted(uniMap, 10),
    byGender: [...genderMap.entries()].map(([label, count]) => ({ label, count })),
    byPrice: priceCounts,
    ratings,
    newUsers,
    topByViews: topViews,
    topByBookings: topBookingRows,
    totalListings: hostels.length,
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

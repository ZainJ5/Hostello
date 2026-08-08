/**
 * Production seeder. Loads ONLY the real listing dataset — the 124 hostels in
 * data/hostels.json recovered from the legacy platform — and creates a single
 * administrator from the environment.
 *
 * It deliberately does NOT create any of the demo material that
 * scripts/seed.js generates for local development: no invented student
 * accounts, no synthetic reviews, no fabricated bookings, no page-view
 * traffic, and no sample "pending approval" listings or payment receipts.
 *
 * Listings carry `ownerId: null` because they are directory entries carried
 * over from the legacy platform, not owner-submitted records. A real owner
 * claims a listing later; attributing them to a made-up account now would be
 * exactly the false data this script exists to avoid.
 *
 * Usage:
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/seed-production.js
 *   node scripts/seed-production.js --purge-demo   # also strip dev seed data
 */
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load .env.local the way Next does, without pulling in dotenv.
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

const PURGE_DEMO = process.argv.includes('--purge-demo');

const strict = { strict: false, timestamps: true };
const User = mongoose.model('User', new mongoose.Schema({}, strict), 'users');
const Hostel = mongoose.model('Hostel', new mongoose.Schema({}, strict), 'hostels');
const Review = mongoose.model('Review', new mongoose.Schema({}, strict), 'reviews');
const Booking = mongoose.model('Booking', new mongoose.Schema({}, strict), 'bookings');
const Payment = mongoose.model('Payment', new mongoose.Schema({}, strict), 'payments');
const PageView = mongoose.model('PageView', new mongoose.Schema({}, strict), 'pageviews');

/** Demo artefacts written by scripts/seed.js, identified so they can be removed. */
const DEMO_USER_EMAILS = [
  'admin@hostello.tech',
  'owner@hostello.tech',
  'owner2@hostello.tech',
  'student@hostello.tech',
];
const DEMO_HOSTEL_SLUGS = [
  'al-noor-girls-hostel-g-11',
  'scholars-inn-boys-hostel',
  'elite-residency-h-13',
];

async function purgeDemoData() {
  const demoUsers = await User.find({
    $or: [
      { email: { $in: DEMO_USER_EMAILS } },
      { email: /@example\.com$/i },
    ],
  })
    .select('_id')
    .lean();
  const demoIds = demoUsers.map((u) => u._id);

  const demoHostels = await Hostel.find({ slug: { $in: DEMO_HOSTEL_SLUGS } })
    .select('_id')
    .lean();
  const demoHostelIds = demoHostels.map((h) => h._id);

  // Every review, booking and page view in a dev database is generated, so
  // these collections are emptied wholesale rather than filtered.
  const results = {
    reviews: (await Review.deleteMany({})).deletedCount,
    bookings: (await Booking.deleteMany({})).deletedCount,
    pageviews: (await PageView.deleteMany({})).deletedCount,
    payments: (await Payment.deleteMany({})).deletedCount,
    users: (await User.deleteMany({ _id: { $in: demoIds } })).deletedCount,
    hostels: (await Hostel.deleteMany({ _id: { $in: demoHostelIds } })).deletedCount,
  };

  // Engagement counters on surviving listings were rolled up from the deleted
  // page-view rows, so they no longer describe anything real.
  await Hostel.updateMany({}, { $set: { views: 0, contactClicks: 0, saveCount: 0 } });

  console.log('purged development seed data:');
  for (const [k, n] of Object.entries(results)) {
    console.log(`  ${String(n).padStart(6)} ${k}`);
  }
  console.log('  reset view/contact/save counters to 0\n');
}

async function upsertAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || 'Administrator';

  if (!email || !password) {
    console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin creation.\n');
    return;
  }
  if (password.length < 12) {
    console.error('ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }

  const existing = await User.findOne({ email }).select('_id').lean();
  if (existing) {
    console.log(`admin ${email} already exists — left untouched\n`);
    return;
  }

  await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
    emailVerified: true,
    status: 'active',
    savedHostels: [],
  });
  console.log(`created admin ${email}\n`);
}

async function importListings() {
  const dataFile = path.join(__dirname, '..', 'data', 'hostels.json');
  if (!fs.existsSync(dataFile)) {
    console.error('data/hostels.json missing — run: node scripts/build-dataset.js');
    process.exit(1);
  }
  const dataset = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

  let created = 0;
  let updated = 0;

  for (const h of dataset) {
    const existing = await Hostel.findOne({ slug: h.slug }).select('_id').lean();

    await Hostel.updateOne(
      { slug: h.slug },
      {
        $set: {
          name: h.name,
          slug: h.slug,
          city: h.city,
          area: h.area,
          universities: h.universities,
          gender: h.gender,
          price: h.price,
          priceMin: h.priceMin,
          priceMax: h.priceMax,
          description: h.description,
          facilities: h.facilities,
          images: h.images,
          messMenuImages: h.messMenuImages,
          messMenu: h.messMenu,
          lat: h.lat,
          lng: h.lng,
          distanceKm: h.distanceKm,
          contact: h.contact,
          status: 'published',
          available: h.available,
          verified: h.verified,
          // Rating and review count are genuine aggregates carried over from
          // the legacy platform's database, and the listing descriptions quote
          // them. They are preserved rather than recomputed, because there are
          // no Review documents here to recompute from.
          rating: h.rating,
          reviewCount: h.reviewCount,
          // Lead with listings that have real photography and a strong score.
          featured:
            h.images.some((i) => i.startsWith('/uploads/')) && h.rating >= 4.3,
        },
        $setOnInsert: {
          ownerId: null,
          publishedAt: new Date(),
          views: 0,
          contactClicks: 0,
          saveCount: 0,
        },
      },
      { upsert: true }
    );

    if (existing) updated++;
    else created++;
  }

  const withPhotos = dataset.filter((h) =>
    h.images.some((i) => i.startsWith('/uploads/'))
  ).length;

  console.log(`listings: ${created} created, ${updated} updated`);
  console.log(`  ${withPhotos} carry restored photography from public/uploads`);
  console.log(`  ${dataset.length - withPhotos} fall back to stock or no imagery\n`);
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log(`connected: ${MONGODB_URI.replace(/\/\/[^@]*@/, '//***@')}\n`);

  if (PURGE_DEMO) await purgeDemoData();

  await importListings();
  await upsertAdmin();

  const counts = {
    hostels: await Hostel.countDocuments({}),
    published: await Hostel.countDocuments({ status: 'published' }),
    users: await User.countDocuments({}),
    reviews: await Review.countDocuments({}),
    bookings: await Booking.countDocuments({}),
    pageviews: await PageView.countDocuments({}),
    payments: await Payment.countDocuments({}),
  };
  console.log('database now holds:');
  for (const [k, n] of Object.entries(counts)) {
    console.log(`  ${String(n).padStart(6)} ${k}`);
  }

  await mongoose.disconnect();
  console.log('\ndone.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

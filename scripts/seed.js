/**
 * Local seeder. Loads data/hostels.json (produced by build-dataset.js) and
 * adds a fixed account set plus generated reviews, bookings and traffic so
 * the dashboards have data to chart on a fresh install.
 *
 * Not for production: use scripts/seed-production.js there, which imports the
 * real listings only.
 *
 * Usage:
 *   node scripts/seed.js          # upsert hostels, keep existing users
 *   node scripts/seed.js --fresh  # drop all collections first
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

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hostello';
const FRESH = process.argv.includes('--fresh');

// ─── Schemas ────────────────────────────────────────────────────────────
// Declared loosely here so this script stays runnable under plain Node
// without transpiling the ESM model files.
const strict = { strict: false, timestamps: true };
const User = mongoose.model('User', new mongoose.Schema({}, strict), 'users');
const Hostel = mongoose.model('Hostel', new mongoose.Schema({}, strict), 'hostels');
const Review = mongoose.model('Review', new mongoose.Schema({}, strict), 'reviews');
const Booking = mongoose.model('Booking', new mongoose.Schema({}, strict), 'bookings');
const Payment = mongoose.model('Payment', new mongoose.Schema({}, strict), 'payments');
const PageView = mongoose.model('PageView', new mongoose.Schema({}, strict), 'pageviews');

// ─── Deterministic pseudo-randomness ────────────────────────────────────
// A seeded PRNG keeps demo data identical across runs, so screenshots and
// dashboard numbers don't churn every time the script is re-run.
let _seed = 20260805;
function rnd() {
  _seed = (_seed * 1664525 + 1013904223) % 4294967296;
  return _seed / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const FIRST_F = ['Ayesha', 'Fatima', 'Zainab', 'Hira', 'Maryam', 'Sana', 'Iqra', 'Noor', 'Amna', 'Rabia'];
const FIRST_M = ['Ali', 'Hassan', 'Bilal', 'Usman', 'Ahmed', 'Hamza', 'Zain', 'Faizan', 'Umar', 'Saad'];
const LAST = ['Khan', 'Ahmed', 'Malik', 'Butt', 'Raza', 'Shah', 'Iqbal', 'Javed', 'Siddiqui', 'Qureshi'];

const REVIEW_SNIPPETS = [
  ['Great value for the price', 'Rooms are clean and the mess food is decent. Warden is cooperative and the location saves me a lot of commute time.'],
  ['Good but WiFi is slow', 'Overall a solid place to stay. Security is tight and the staff is friendly, but the internet struggles during exam season.'],
  ['Very homely environment', 'Been here two semesters now. Food quality is consistent and the study room is quiet enough for late-night prep.'],
  ['Clean and well managed', 'Housekeeping comes daily and the washrooms are maintained properly. Would recommend to anyone studying nearby.'],
  ['Decent, could be better', 'Location and price are unbeatable. Rooms are a bit tight if you are sharing with three others.'],
  ['Excellent security', 'CCTV everywhere and the gate is manned round the clock. My parents were satisfied after visiting.'],
  ['Food needs improvement', 'Everything else is fine. The building is new and rooms are airy, though the mess menu gets repetitive.'],
  ['Perfect for university students', 'Walking distance from campus, backup power during load shedding, and the owner responds quickly to complaints.'],
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log(`connected: ${MONGODB_URI}\n`);

  if (FRESH) {
    for (const M of [User, Hostel, Review, Booking, Payment, PageView]) {
      await M.deleteMany({});
    }
    console.log('cleared all collections (--fresh)\n');
  }

  // ─── Accounts ─────────────────────────────────────────────────────────
  const pw = await bcrypt.hash('Password123!', 12);
  const accounts = [
    { name: 'Hostello Admin', email: 'admin@hostello.tech', role: 'admin', city: 'Islamabad' },
    { name: 'Zahra Jamshaid', email: 'owner@hostello.tech', role: 'owner', city: 'Islamabad', businessName: 'Jamshaid Hostels' },
    { name: 'Bilal Ahmed', email: 'owner2@hostello.tech', role: 'owner', city: 'Rawalpindi', businessName: 'Ahmed Residency' },
    { name: 'Ayesha Khan', email: 'student@hostello.tech', role: 'student', city: 'Islamabad', university: 'NUST', gender: 'Female' },
  ];

  const users = {};
  for (const a of accounts) {
    const doc = await User.findOneAndUpdate(
      { email: a.email },
      {
        $set: { ...a, emailVerified: true, status: 'active' },
        $setOnInsert: { passwordHash: pw, savedHostels: [] },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    users[a.role === 'owner' ? a.email : a.role] = doc;
    console.log(`  user  ${a.email.padEnd(26)} ${a.role}`);
  }
  const owners = [users['owner@hostello.tech'], users['owner2@hostello.tech']];

  // A pool of students so reviews aren't all authored by one person.
  const studentDocs = [users.student];
  for (let i = 0; i < 24; i++) {
    const female = rnd() > 0.5;
    const name = `${pick(female ? FIRST_F : FIRST_M)} ${pick(LAST)}`;
    const email = `student${i + 1}@example.com`;
    const doc = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          email,
          role: 'student',
          emailVerified: true,
          status: 'active',
          gender: female ? 'Female' : 'Male',
          city: pick(['Islamabad', 'Rawalpindi', 'Lahore']),
          university: pick(['NUST', 'FAST', 'QAU', 'COMSATS', 'NUML', 'Bahria University']),
        },
        $setOnInsert: { passwordHash: pw, savedHostels: [] },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    studentDocs.push(doc);
  }
  console.log(`  +${studentDocs.length - 1} demo students\n`);

  // ─── Hostels ──────────────────────────────────────────────────────────
  const dataFile = path.join(__dirname, '..', 'data', 'hostels.json');
  if (!fs.existsSync(dataFile)) {
    console.error('data/hostels.json missing. Run: node scripts/build-dataset.js');
    process.exit(1);
  }
  const dataset = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

  const hostelIds = [];
  let idx = 0;
  for (const h of dataset) {
    // Spread ownership across the demo owners so both dashboards have data.
    const owner = owners[idx % owners.length];
    const doc = await Hostel.findOneAndUpdate(
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
          ownerId: owner._id,
          status: 'published',
          publishedAt: new Date(),
          available: h.available,
          verified: h.verified,
          // Feature the strongest listings that actually have photography.
          featured: h.images.some((i) => i.startsWith('/uploads/')) && h.rating >= 4.3,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    hostelIds.push(doc);
    idx++;
  }
  console.log(`  ${hostelIds.length} hostels upserted`);

  // ─── Reviews ──────────────────────────────────────────────────────────
  await Review.deleteMany({});
  const reviews = [];
  for (const hostel of hostelIds) {
    const n = between(0, 9);
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const student = studentDocs[between(0, studentDocs.length - 1)];
      if (used.has(String(student._id))) continue;
      used.add(String(student._id));
      const [title, comment] = pick(REVIEW_SNIPPETS);
      const rating = between(3, 5);
      reviews.push({
        hostelId: hostel._id,
        studentId: student._id,
        studentName: student.name,
        rating,
        cleanliness: Math.min(5, Math.max(1, rating + between(-1, 1))),
        food: Math.min(5, Math.max(1, rating + between(-1, 1))),
        security: Math.min(5, Math.max(1, rating + between(-1, 1))),
        location: Math.min(5, Math.max(1, rating + between(-1, 1))),
        valueForMoney: Math.min(5, Math.max(1, rating + between(-1, 1))),
        title,
        comment,
        status: 'published',
        createdAt: new Date(Date.now() - between(1, 180) * 86400000),
      });
    }
  }
  if (reviews.length) await Review.insertMany(reviews);

  // Recompute the denormalised rating/count on each hostel from its reviews.
  const agg = await Review.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$hostelId', avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  const byHostel = new Map(agg.map((a) => [String(a._id), a]));
  for (const h of hostelIds) {
    const a = byHostel.get(String(h._id));
    await Hostel.updateOne(
      { _id: h._id },
      {
        $set: {
          rating: a ? Math.round(a.avg * 10) / 10 : 0,
          reviewCount: a ? a.n : 0,
        },
      }
    );
  }
  console.log(`  ${reviews.length} reviews`);

  // ─── Bookings ─────────────────────────────────────────────────────────
  await Booking.deleteMany({});
  const bookings = [];
  const statuses = ['pending', 'pending', 'confirmed', 'confirmed', 'rejected', 'completed', 'cancelled'];
  for (let i = 0; i < 140; i++) {
    const hostel = hostelIds[between(0, hostelIds.length - 1)];
    const student = studentDocs[between(0, studentDocs.length - 1)];
    const createdAt = new Date(Date.now() - between(0, 120) * 86400000);
    const status = pick(statuses);
    bookings.push({
      hostelId: hostel._id,
      studentId: student._id,
      studentName: student.name,
      studentEmail: student.email,
      studentPhone: `+92 3${between(0, 4)}${between(0, 9)} ${between(1000000, 9999999)}`,
      roomType: pick(['Single', 'Double', 'Triple', 'Quad']),
      moveInDate: new Date(createdAt.getTime() + between(7, 60) * 86400000),
      durationMonths: pick([3, 6, 6, 12]),
      message: 'Looking for a room starting next semester. Please share availability.',
      status,
      respondedAt: status === 'pending' ? null : new Date(createdAt.getTime() + 86400000),
      createdAt,
      updatedAt: createdAt,
    });
  }
  await Booking.insertMany(bookings);
  console.log(`  ${bookings.length} bookings`);

  // ─── Traffic ──────────────────────────────────────────────────────────
  // 90 days of views weighted toward recent dates and toward featured
  // listings, so the analytics charts show a believable trend.
  await PageView.deleteMany({});
  const views = [];
  for (const h of hostelIds) {
    const popularity = (h.featured ? 3 : 1) * (0.4 + rnd());
    for (let d = 89; d >= 0; d--) {
      const recency = 1 + (90 - d) / 60;
      const count = Math.floor(rnd() * 3 * popularity * recency);
      for (let v = 0; v < count; v++) {
        const when = new Date(Date.now() - d * 86400000 - between(0, 86399) * 1000);
        views.push({
          hostelId: h._id,
          ownerId: h.ownerId,
          kind: rnd() > 0.88 ? 'contact' : rnd() > 0.82 ? 'save' : 'view',
          visitor: `v${between(1, 4000)}`,
          referrer: pick(['', 'google', 'direct', 'facebook', 'instagram']),
          createdAt: when,
        });
      }
    }
  }
  // Insert in chunks, since a single 100k-document insert can exceed the BSON limit.
  for (let i = 0; i < views.length; i += 5000) {
    await PageView.insertMany(views.slice(i, i + 5000), { ordered: false });
  }

  // Roll the event rows up onto each hostel's lifetime counters.
  const counts = await PageView.aggregate([
    { $group: { _id: { h: '$hostelId', k: '$kind' }, n: { $sum: 1 } } },
  ]);
  const totals = new Map();
  for (const c of counts) {
    const key = String(c._id.h);
    const t = totals.get(key) || { view: 0, contact: 0, save: 0 };
    t[c._id.k] = c.n;
    totals.set(key, t);
  }
  for (const [id, t] of totals) {
    await Hostel.updateOne(
      { _id: id },
      { $set: { views: t.view, contactClicks: t.contact, saveCount: t.save } }
    );
  }
  console.log(`  ${views.length} page views`);

  // ─── Pending submissions for the admin queue ──────────────────────────
  await Payment.deleteMany({});
  const pendingSamples = [
    { name: 'Al-Noor Girls Hostel G-11', city: 'Islamabad', gender: 'Female', price: 18000, unis: ['NUML', 'QAU'] },
    { name: 'Scholars Inn Boys Hostel', city: 'Rawalpindi', gender: 'Male', price: 14000, unis: ['Arid Agriculture', 'RMU'] },
    { name: 'Elite Residency H-13', city: 'Islamabad', gender: 'Mixed', price: 26000, unis: ['NUST', 'FAST'] },
  ];
  const payments = [];
  for (let i = 0; i < pendingSamples.length; i++) {
    const s = pendingSamples[i];
    const owner = owners[i % owners.length];
    const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const doc = await Hostel.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: s.name,
          slug,
          city: s.city,
          area: 'Submitted by owner, awaiting review',
          universities: s.unis,
          gender: s.gender,
          price: s.price,
          priceMin: s.price,
          priceMax: Math.round(s.price * 1.3),
          description:
            'Newly submitted listing awaiting admin approval. Rooms are furnished with attached washrooms, backup power and three meals a day.',
          facilities: ['WiFi', 'Meals', 'Security', 'Power Backup', 'Laundry'],
          images: [],
          lat: 33.68 + rnd() * 0.06,
          lng: 73.02 + rnd() * 0.06,
          contact: { name: owner.name, phone: '+92 300 1234567', whatsapp: '+92 300 1234567' },
          ownerId: owner._id,
          status: 'pending_review',
          available: true,
          verified: false,
          featured: false,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    payments.push({
      hostelId: doc._id,
      ownerId: owner._id,
      amount: 5000,
      method: pick(['Bank Transfer', 'JazzCash', 'Easypaisa']),
      transactionRef: `TXN${between(100000, 999999)}`,
      paidAt: new Date(Date.now() - between(1, 5) * 86400000),
      // Placeholder path; a real upload replaces this when an owner submits.
      screenshot: '/uploads/payments/sample-receipt.png',
      status: 'pending',
      planMonths: 6,
      createdAt: new Date(Date.now() - between(1, 5) * 86400000),
    });
  }
  await Payment.insertMany(payments);
  console.log(`  ${payments.length} pending listings + payments awaiting approval`);

  console.log('\n─── demo accounts (password: Password123!) ───');
  console.log('  admin@hostello.tech    admin');
  console.log('  owner@hostello.tech    owner');
  console.log('  owner2@hostello.tech   owner');
  console.log('  student@hostello.tech  student');

  await mongoose.disconnect();
  console.log('\ndone.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

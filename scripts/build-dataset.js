/**
 * Builds the canonical hostel dataset at data/hostels.json by merging two
 * sources recovered from the legacy Hostello project:
 *
 *   1. data/legacy/hostels.json, a production DB export recovered from git
 *      history (commit f9466fa, later deleted). 66 records whose `images`
 *      point at real uploaded photos now living in public/uploads/hostels.
 *      This is authoritative for photography and live pricing.
 *
 *   2. backend/seeds/*.js in the legacy repo, ~145 records with wider
 *      coverage (Rawalpindi, RMU, FJWU, Arid, SZABIST, Riphah) but only
 *      Unsplash stock URLs for imagery.
 *
 * Records are matched on a normalised name. Where both sources describe the
 * same hostel the DB export wins, with seed fields filling any gaps.
 *
 * Usage: node scripts/build-dataset.js [pathToLegacyRepo]
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const LEGACY_REPO =
  process.argv[2] || 'C:/Users/DELL/OneDrive/Documents/GitHub/hostello';
const SEEDS_DIR = path.join(LEGACY_REPO, 'backend', 'seeds');
const ROOT = path.join(__dirname, '..');
const DB_EXPORT = path.join(ROOT, 'data', 'legacy', 'hostels.json');
const IMAGE_DIR = path.join(ROOT, 'public', 'uploads', 'hostels');
const OUT_FILE = path.join(ROOT, 'data', 'hostels.json');

const SEED_FILES = [
  'seed.js',
  'seed-batch2.js',
  'seed-batch3.js',
  'seed-batch4.js',
  'seed-nust-hostels.js',
  'seed-rmu.js',
];

// ─── Normalisation helpers ──────────────────────────────────────────────

// Facility strings are free-form across sources ("WiFi", "Wi-Fi", "3 meals/day").
// Collapse onto a controlled vocabulary so filters and icons stay coherent.
const FACILITY_CANON = [
  [/wi-?fi|internet/i, 'WiFi'],
  [/meals?|mess|food|dining|breakfast|lunch|dinner/i, 'Meals'],
  [/laundry|washing/i, 'Laundry'],
  [/cctv|camera|surveillance/i, 'CCTV'],
  [/security|guard|warden|watchman/i, 'Security'],
  [/\bac\b|air.?condition/i, 'AC'],
  [/generator|ups|backup|load.?shed|solar/i, 'Power Backup'],
  [/parking/i, 'Parking'],
  [/study|library|reading/i, 'Study Room'],
  [/gym|fitness|exercise/i, 'Gym'],
  [/kitchen|cooking/i, 'Kitchen'],
  [/geyser|hot water|water heater/i, 'Hot Water'],
  [/clean|housekeep|maid|sweep/i, 'Housekeeping'],
  [/prayer|masjid|mosque|namaz/i, 'Prayer Area'],
  [/lawn|garden|courtyard|terrace|rooftop/i, 'Outdoor Area'],
  [/attach|washroom|bathroom|toilet/i, 'Attached Bath'],
  [/transport|shuttle|van|pick.?up/i, 'Transport'],
  [/canteen|tuck|shop|stationery|photocopier|fruit/i, 'On-site Shop'],
  [/tv|lounge|common room|recreation|indoor game/i, 'Common Lounge'],
  [/water cooler|filter|mineral|ro plant/i, 'Filtered Water'],
  [/lift|elevator/i, 'Elevator'],
  [/furnish|bed|almirah|cupboard|wardrobe|table/i, 'Furnished'],
];

function canonFacilities(list) {
  const out = new Set();
  for (const raw of list || []) {
    const s = String(raw).trim();
    if (!s) continue;
    const hit = FACILITY_CANON.find(([re]) => re.test(s));
    if (hit) out.add(hit[1]);
  }
  return [...out];
}

// Sources abbreviate campuses inconsistently ("Air" vs "Air University",
// "Bahria" vs "Bahria University"), which would split the campus filter into
// duplicate entries. Map every spelling onto one canonical label.
const UNIVERSITY_CANON = [
  [/^nust$|national university of sciences/i, 'NUST'],
  [/^fast$|fast.?nu|national university of computer/i, 'FAST'],
  [/^qau$|quaid.?i.?azam/i, 'QAU'],
  [/^comsats$/i, 'COMSATS'],
  [/^numl$/i, 'NUML'],
  [/^szabist$/i, 'SZABIST'],
  [/^riphah$/i, 'Riphah'],
  [/^rmu$|rawalpindi medical/i, 'RMU'],
  [/^fjwu$|fatima jinnah/i, 'FJWU'],
  [/^arid|pmas|barani/i, 'Arid Agriculture'],
  [/^air\b/i, 'Air University'],
  [/^bahria\b/i, 'Bahria University'],
  [/^foundation\b|^fui$/i, 'Foundation University'],
  [/^iiui$|international islamic/i, 'IIUI'],
  [/^lums$/i, 'LUMS'],
  [/^uet$/i, 'UET'],
  [/^pu$|^punjab university/i, 'Punjab University'],
  [/^iba$/i, 'IBA'],
  [/^ned$/i, 'NED'],
];

function canonUniversity(u) {
  const s = String(u || '').trim();
  if (!s) return null;
  const hit = UNIVERSITY_CANON.find(([re]) => re.test(s));
  return hit ? hit[1] : s;
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// The export stored absolute dev URLs (http://localhost:3000/uploads/...).
// Keep only the path so images resolve against whatever host serves them.
function normaliseImage(url) {
  const s = String(url || '');
  if (!s) return null;
  const m = s.match(/\/uploads\/[^\s"']+/);
  if (m) return m[0];
  return /^https?:\/\//.test(s) ? s : null;
}

// ─── Seed-file parsing ──────────────────────────────────────────────────

/**
 * Scans from an opening bracket to its match, skipping strings, template
 * literals and comments so brackets inside them don't affect the depth count.
 */
function matchBracket(src, start) {
  const open = src[start];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i);
      if (i === -1) return -1;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i + 2);
      if (i === -1) return -1;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < src.length; i++) {
        if (src[i] === '\\') i++;
        else if (src[i] === c) break;
      }
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * Seeds vary in shape: some declare a helper lookup (`const IMG = {...}`) the
 * hostel array references, others nest the array inside a function under an
 * arbitrary name. Evaluate every object/array declaration into one shared
 * sandbox, then pick the array that actually holds hostel records.
 */
function extractSeedArray(src, file) {
  const ctx = vm.createContext(Object.create(null));
  const decl = /(?:^|[\s;{(])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?=[[{])/g;
  const names = [];
  let m;

  while ((m = decl.exec(src)) !== null) {
    const braceAt = decl.lastIndex;
    const end = matchBracket(src, braceAt);
    if (end === -1) continue;
    try {
      vm.runInContext(`var ${m[1]} = (${src.slice(braceAt, end)});`, ctx, {
        timeout: 5000,
      });
      names.push(m[1]);
    } catch {
      // References a runtime value (require, mongoose, and so on), so it is
      // not the array we are looking for.
    }
    decl.lastIndex = end;
  }

  const isHostelArray = (v) =>
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((x) => x && typeof x === 'object' && x.name && x.city);

  let best = null;
  for (const n of names) {
    const v = ctx[n];
    if (isHostelArray(v) && (!best || v.length > best.length)) best = v;
  }
  if (!best) console.warn(`  ! no hostel array found in ${file}`);
  return best || [];
}

function loadSeeds() {
  if (!fs.existsSync(SEEDS_DIR)) {
    console.warn(`  ! legacy seeds not found at ${SEEDS_DIR}, skipping`);
    return [];
  }
  let out = [];
  for (const file of SEED_FILES) {
    const full = path.join(SEEDS_DIR, file);
    if (!fs.existsSync(full)) {
      console.warn(`  - ${file} missing`);
      continue;
    }
    const arr = extractSeedArray(fs.readFileSync(full, 'utf8'), file);
    console.log(`  + ${file}: ${arr.length}`);
    out = out.concat(arr);
  }
  return out;
}

// ─── Shaping ────────────────────────────────────────────────────────────

function shape(h, source, availableImages) {
  const images = (h.images || [])
    .map(normaliseImage)
    .filter(Boolean)
    // Drop upload paths whose file is missing from public/uploads/hostels.
    .filter((u) => !u.startsWith('/uploads/') || availableImages.has(path.basename(u)));

  const base = Number(h.price) || 0;
  const priceMin = Number(h.priceMin) || base;
  const priceMax =
    Number(h.priceMax) || Math.max(base, Math.round((base * 1.35) / 500) * 500);

  return {
    slug: slugify(h.name),
    name: String(h.name).trim(),
    city: String(h.city || '').trim(),
    area: String(h.area || '').trim(),
    universities: [
      ...new Set(
        []
          .concat(h.university || h.universities || [])
          .map(canonUniversity)
          .filter(Boolean)
      ),
    ],
    gender: ['Male', 'Female', 'Mixed'].includes(h.gender) ? h.gender : 'Male',
    price: base,
    priceMin,
    priceMax,
    rating: Number(h.rating) || 0,
    reviewCount: Number(h.reviews) || 0,
    available: h.available !== false,
    verified: Boolean(h.verified),
    featured: Boolean(h.featured),
    facilities: canonFacilities(h.facilities),
    rawFacilities: (h.facilities || []).map(String),
    description: String(h.description || '').trim(),
    images,
    messMenuImages: (h.messMenuImages || []).map(normaliseImage).filter(Boolean),
    messMenu: h.messMenu && typeof h.messMenu === 'object' ? h.messMenu : {},
    lat: Number(h.lat) || 0,
    lng: Number(h.lng) || 0,
    distanceKm: Number(h.distanceKm) || 0,
    // Sources differ: some nest contact under `owner`, later seeds put a bare
    // `phone` on the record itself.
    contact: {
      name: (h.owner && h.owner.name) || '',
      phone: (h.owner && h.owner.phone) || h.phone || '',
      whatsapp: (h.owner && h.owner.whatsapp) || h.whatsapp || h.phone || '',
    },
    source,
  };
}

/** Fills empty fields on `into` from `from` without overwriting real values. */
function backfill(into, from) {
  const empty = (v) =>
    v === undefined ||
    v === null ||
    v === '' ||
    v === 0 ||
    (Array.isArray(v) && v.length === 0);

  for (const k of Object.keys(from)) {
    if (k === 'source' || k === 'images') continue;
    if (empty(into[k]) && !empty(from[k])) into[k] = from[k];
  }
  // Union the universities so campus filters stay as broad as either source.
  into.universities = [...new Set([...into.universities, ...from.universities])];
  into.facilities = [...new Set([...into.facilities, ...from.facilities])];
  return into;
}

function main() {
  const availableImages = fs.existsSync(IMAGE_DIR)
    ? new Set(fs.readdirSync(IMAGE_DIR))
    : new Set();
  console.log(`images on disk: ${availableImages.size}\n`);

  console.log('reading legacy seeds:');
  const seeds = loadSeeds();

  console.log('\nreading recovered DB export:');
  const dbRecords = fs.existsSync(DB_EXPORT)
    ? JSON.parse(fs.readFileSync(DB_EXPORT, 'utf8'))
    : [];
  console.log(`  + hostels.json: ${dbRecords.length}`);

  // DB export first, because it owns real photography and current pricing.
  const merged = new Map();
  for (const r of dbRecords) {
    const key = norm(r.name);
    if (!key) continue;
    const shaped = shape(r, 'db', availableImages);
    if (merged.has(key)) backfill(merged.get(key), shaped);
    else merged.set(key, shaped);
  }

  let added = 0;
  let enriched = 0;
  for (const r of seeds) {
    const key = norm(r.name);
    if (!key) continue;
    const shaped = shape(r, 'seed', availableImages);
    if (merged.has(key)) {
      const target = merged.get(key);
      backfill(target, shaped);
      // Only borrow seed stock imagery when the record has no real photos.
      if (target.images.length === 0 && shaped.images.length) {
        target.images = shaped.images;
      }
      enriched++;
    } else {
      merged.set(key, shaped);
      added++;
    }
  }

  const hostels = [...merged.values()].sort((a, b) => {
    // Real-photo, verified listings lead, since they present best on the grid.
    const score = (h) =>
      (h.images.some((i) => i.startsWith('/uploads/')) ? 4 : 0) +
      (h.verified ? 2 : 0) +
      (h.featured ? 1 : 0);
    return score(b) - score(a) || b.rating - a.rating || a.name.localeCompare(b.name);
  });

  // Slugs are the public URL key, so they must be unique.
  const slugSeen = new Map();
  for (const h of hostels) {
    const n = (slugSeen.get(h.slug) || 0) + 1;
    slugSeen.set(h.slug, n);
    if (n > 1) h.slug = `${h.slug}-${n}`;
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(hostels, null, 2));

  const tally = (fn) =>
    hostels.reduce((acc, h) => {
      for (const k of [].concat(fn(h))) if (k) acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
  const realPhoto = hostels.filter((h) =>
    h.images.some((i) => i.startsWith('/uploads/'))
  ).length;
  const usedFiles = new Set(
    hostels.flatMap((h) => h.images.concat(h.messMenuImages))
      .filter((i) => i.startsWith('/uploads/'))
      .map((i) => path.basename(i))
  );

  console.log(`\nmerged: ${dbRecords.length} from DB + ${added} new from seeds` +
    ` (${enriched} enriched) = ${hostels.length} hostels`);
  console.log(`-> ${path.relative(ROOT, OUT_FILE)}\n`);
  console.log('cities:      ', tally((h) => h.city));
  console.log('universities:', tally((h) => h.universities));
  console.log('gender:      ', tally((h) => h.gender));
  console.log('facilities:  ', tally((h) => h.facilities));
  console.log(
    `\nreal photos: ${realPhoto}/${hostels.length} hostels` +
      ` using ${usedFiles.size}/${availableImages.size} files on disk`
  );
  console.log(
    `stock only:  ${hostels.filter((h) => h.images.length && !h.images.some((i) => i.startsWith('/uploads/'))).length}` +
      ` | no images: ${hostels.filter((h) => !h.images.length).length}`
  );
  console.log(
    `coords: ${hostels.filter((h) => h.lat && h.lng).length}` +
      ` | phone: ${hostels.filter((h) => h.contact.phone).length}`
  );
  const prices = hostels.map((h) => h.price).filter(Boolean);
  console.log(
    `price: PKR ${Math.min(...prices).toLocaleString()} – ${Math.max(...prices).toLocaleString()}`
  );
}

main();

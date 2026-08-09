import { connectDB } from '@/lib/db';
import Hostel from '@/models/Hostel';

/**
 * The directory lives on Google, so every crawlable URL is listed here: the
 * static pages, all 124 listings, and the three landing templates.
 *
 * Auth, account, roommate, notice board and compare routes are deliberately
 * absent. They are behind a session or carry no indexable content.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostello.tech';

const STATIC = [
  ['', 1.0, 'daily'],
  ['/hostels', 0.9, 'daily'],
  ['/map', 0.7, 'weekly'],
  ['/about', 0.5, 'monthly'],
  ['/safety', 0.5, 'monthly'],
  ['/list-your-hostel', 0.6, 'monthly'],
  ['/reviews', 0.5, 'weekly'],
  ['/community', 0.6, 'daily'],
  ['/terms', 0.3, 'yearly'],
  ['/privacy', 0.3, 'yearly'],
];

export default async function sitemap() {
  const now = new Date();
  const rows = [];

  for (const [path, priority, changeFrequency] of STATIC) {
    rows.push({ url: `${SITE}${path}`, lastModified: now, changeFrequency, priority });
  }

  try {
    await connectDB();

    const listings = await Hostel.find({ status: 'published' })
      .select('slug city gender updatedAt')
      .lean();

    for (const h of listings) {
      rows.push({
        url: `${SITE}/hostels/${h.slug}`,
        lastModified: h.updatedAt || now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
      // Ask residents threads are indexable content and get their own URL.
      rows.push({
        url: `${SITE}/hostels/${h.slug}/ask`,
        lastModified: h.updatedAt || now,
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }

    // Only cities and campuses that actually have listings. A landing page
    // with nothing on it is worse than no landing page.
    const cities = [...new Set(listings.map((h) => h.city).filter(Boolean))];
    for (const city of cities) {
      const slug = city.toLowerCase();
      rows.push({
        url: `${SITE}/hostels/in/${slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.9,
      });

      for (const [gender, seg] of [['Female', 'girls'], ['Male', 'boys'], ['Mixed', 'mixed']]) {
        const has = listings.some((h) => h.city === city && h.gender === gender);
        if (!has) continue;
        rows.push({
          url: `${SITE}/hostels/in/${slug}/${seg}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }

    // Campus landing pages, one per university a listing actually records.
    const campusRows = await Hostel.find({ status: 'published' })
      .select('universities')
      .lean();

    const referenced = new Set();
    for (const h of campusRows) {
      for (const u of h.universities || []) referenced.add(u);
    }

    for (const u of referenced) {
      const slug = String(u)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (!slug) continue;
      rows.push({
        url: `${SITE}/hostels/near/${slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.9,
      });
    }
  } catch {
    // A database outage must not take the sitemap down with it. The static
    // routes above are still worth serving.
  }

  return rows;
}

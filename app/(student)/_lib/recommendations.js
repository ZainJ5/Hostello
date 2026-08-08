import Hostel from '@/models/Hostel';
import { HOSTEL_CARD_FIELDS } from '@/components/student/constants';

/**
 * "Recommended for you" — a widening fallback chain rather than a single query,
 * so a student always sees something useful no matter how thin their profile is.
 *
 * Each step runs only while the shelf is still short, and every step:
 *   • filters `status: 'published'` (never surface a draft or suspended listing);
 *   • excludes hostels the student has already saved — recommending a
 *     bookmark back to them is noise, not a recommendation;
 *   • excludes anything an earlier step already picked, so the shelf can't
 *     repeat a listing as the net widens;
 *   • orders by rating then review count, so a lone 5.0 never outranks a
 *     well-reviewed 4.7.
 *
 * The chain, sharpest signal first:
 *
 *   1. university + city  — the strongest match we can make. They told us
 *                           where they study and where they want to live.
 *   2. university only    — same campus, any city. Covers Rawalpindi students
 *                           at an Islamabad university, which is the single
 *                           most common commute in this dataset.
 *   3. top rated in city  — reached when no university is on file. We still
 *                           know the city, so show the best of it.
 *   4. top rated overall  — a brand-new profile with neither field set. Show
 *                           the best of the platform; the profile prompt on
 *                           this same page is what fixes it next time.
 *
 * Returns `{ items, reason }` where `reason` explains the basis of the shelf,
 * taken from the first step that actually produced results.
 */
export async function getRecommendations({ university, city, excludeIds = [], limit = 3 }) {
  const steps = [];

  if (university && city) {
    steps.push({
      reason: `Near ${university}, in ${city}`,
      filter: { universities: university, city },
    });
  }
  if (university) {
    steps.push({ reason: `Near ${university}`, filter: { universities: university } });
  }
  if (city) {
    steps.push({ reason: `Top rated in ${city}`, filter: { city } });
  }
  steps.push({ reason: 'Top rated on Hostello', filter: {} });

  const picked = new Map();
  let reason = '';

  for (const step of steps) {
    const remaining = limit - picked.size;
    if (remaining <= 0) break;

    const rows = await Hostel.find({
      status: 'published',
      _id: { $nin: [...excludeIds.map(String), ...picked.keys()] },
      ...step.filter,
    })
      .sort({ rating: -1, reviewCount: -1, featured: -1 })
      .limit(remaining)
      .select(HOSTEL_CARD_FIELDS)
      .lean();

    for (const row of rows) picked.set(String(row._id), row);
    if (rows.length && !reason) reason = step.reason;
  }

  return { items: [...picked.values()], reason };
}

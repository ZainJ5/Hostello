import { z } from 'zod';
import Hostel from '@/models/Hostel';
import University from '@/models/University';
import { CAMPUSES } from '@/components/hostels/campuses';
import { builtinCampus, isBuiltinCampus } from '@/components/hostels/campus-registry';
import { CAMPUSES as MAP_CAMPUSES } from '@/components/map/config';

export const CITY_OPTIONS = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi'];

export const universityInput = z.object({
  key: z
    .string()
    .trim()
    .min(2, 'Short name needs at least 2 characters')
    .max(60)
    .regex(/^[\p{L}\p{N} .&'()-]+$/u, 'Use letters, numbers, spaces and . & \' ( ) - only'),
  full: z.string().trim().min(3, 'Add the full university name').max(160),
  city: z.string().trim().min(2, 'Pick a city').max(60),
  sector: z.string().trim().max(80).optional().default(''),
  lat: z.coerce.number().min(-90).max(90).refine((v) => v !== 0, 'Add the latitude'),
  lng: z.coerce.number().min(-180).max(180).refine((v) => v !== 0, 'Add the longitude'),
  active: z.boolean().optional().default(true),
});

function sectorFor(key) {
  return MAP_CAMPUSES.find((c) => c.university === key)?.sector || '';
}

/** Built-ins plus admin rows, one entry per key, with listing counts. */
export async function listUniversities() {
  const [docs, counts] = await Promise.all([
    University.find({}).lean(),
    Hostel.aggregate([
      { $unwind: '$universities' },
      { $group: { _id: '$universities', n: { $sum: 1 } } },
    ]),
  ]);
  const countBy = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  const docBy = Object.fromEntries(docs.map((d) => [d.key, d]));

  const keys = new Set([...Object.keys(CAMPUSES), ...docs.map((d) => d.key)]);
  const rows = [...keys].map((key) => {
    const doc = docBy[key];
    const base = builtinCampus(key);
    const src = doc || base || CAMPUSES[key];
    return {
      key,
      full: src.full,
      city: src.city,
      sector: doc?.sector || sectorFor(key),
      lat: src.lat,
      lng: src.lng,
      active: doc ? doc.active !== false : true,
      builtin: isBuiltinCampus(key),
      edited: Boolean(doc && isBuiltinCampus(key)),
      listings: countBy[key] || 0,
      updatedAt: doc?.updatedAt || null,
    };
  });

  return rows.sort((a, b) => a.city.localeCompare(b.city) || a.key.localeCompare(b.key));
}

import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import University from '@/models/University';
import Hostel from '@/models/Hostel';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import { universityInput } from '@/app/api/admin/_lib/universities';
import { loadCampusRows } from '@/lib/campuses-server';
import { isBuiltinCampus } from '@/components/hostels/campus-registry';
import { serialize } from '@/lib/utils';

async function keyFrom(ctx) {
  const { key } = await ctx.params;
  return decodeURIComponent(String(key || '')).trim();
}

/** Edit name, city or pin. The key itself is the listing tag and stays fixed. */
export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('admin');
  const key = await keyFrom(ctx);

  const existing = await University.findOne({ key }).lean();
  if (!existing && !isBuiltinCampus(key)) return fail('That university is not on the list', 404);

  const body = await readJson(req);
  const input = universityInput.parse({ ...body, key });
  if (isBuiltinCampus(key)) input.active = true;

  const doc = await University.findOneAndUpdate(
    { key },
    { $set: input },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  await loadCampusRows({ force: true });

  await writeAudit(req, session, {
    action: 'university.update',
    targetType: 'University',
    targetId: doc._id,
    meta: {
      key,
      before: existing
        ? { full: existing.full, city: existing.city, lat: existing.lat, lng: existing.lng, active: existing.active }
        : 'built-in',
      after: { full: doc.full, city: doc.city, lat: doc.lat, lng: doc.lng, active: doc.active },
    },
  });

  return ok({ university: serialize(doc) });
});

/**
 * Custom universities are deleted outright, as long as no listing is tagged
 * with them. For a built-in this only resets it to the original values.
 */
export const DELETE = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('admin');
  const key = await keyFrom(ctx);
  const builtin = isBuiltinCampus(key);

  const doc = await University.findOne({ key }).lean();
  if (!doc) {
    return builtin
      ? fail('Built-in universities cannot be deleted', 409)
      : ok({ deleted: false, alreadyGone: true });
  }

  if (!builtin) {
    const used = await Hostel.countDocuments({ universities: key });
    if (used) {
      return fail(
        `${used} listing${used === 1 ? ' is' : 's are'} tagged with ${key}. Hide it instead, or retag those listings first.`,
        409
      );
    }
  }

  await University.deleteOne({ _id: doc._id });
  await loadCampusRows({ force: true });

  await writeAudit(req, session, {
    action: builtin ? 'university.reset' : 'university.delete',
    targetType: 'University',
    targetId: doc._id,
    meta: { key, full: doc.full, city: doc.city },
  });

  return ok({ deleted: true, reset: builtin });
});

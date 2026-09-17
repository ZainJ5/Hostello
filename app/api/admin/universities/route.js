import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import University from '@/models/University';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import { listUniversities, universityInput, recomputeAllDistances } from '@/app/api/admin/_lib/universities';
import { loadCampusRows } from '@/lib/campuses-server';
import { CAMPUSES } from '@/components/hostels/campuses';
import { serialize } from '@/lib/utils';

export const GET = handler(async () => {
  await connectDB();
  await requireRole('admin');
  return ok({ rows: serialize(await listUniversities()) });
});

export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('admin');

  const input = universityInput.parse(await readJson(req));
  const clash = Object.keys(CAMPUSES).find((k) => k.toLowerCase() === input.key.toLowerCase());
  if (clash || (await University.exists({ key: input.key }))) {
    return fail(`"${clash || input.key}" is already on the list. Edit that one instead.`, 409);
  }

  const doc = await University.create(input);
  await loadCampusRows({ force: true });
  const distances = await recomputeAllDistances();

  await writeAudit(req, session, {
    action: 'university.create',
    targetType: 'University',
    targetId: doc._id,
    meta: { key: doc.key, full: doc.full, city: doc.city, lat: doc.lat, lng: doc.lng },
  });

  return ok({ university: serialize(doc.toObject()), distances }, { status: 201 });
});

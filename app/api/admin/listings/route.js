import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, created, readJson } from '@/lib/api';
import Hostel from '@/models/Hostel';
import { hostelInput, normalizeHostel, uniqueSlug } from '@/app/api/admin/_lib/hostel';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import { serialize } from '@/lib/utils';

/** Lightweight list endpoint — the pages render server-side, this backs tooling. */
export const GET = handler(async (req) => {
  await connectDB();
  await requireRole('admin');

  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Number(sp.get('limit')) || 25, 100);
  const query = {};
  if (sp.get('status')) query.status = sp.get('status');
  if (sp.get('city')) query.city = sp.get('city');

  const [rows, total] = await Promise.all([
    Hostel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name slug city status price rating views ownerId')
      .lean(),
    Hostel.countDocuments(query),
  ]);

  return ok({ total, rows: serialize(rows) });
});

export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('admin');

  const body = await readJson(req);
  const data = hostelInput.parse(body);

  const slug = await uniqueSlug(data.slug || data.name);
  const payload = normalizeHostel({ ...data, slug });
  if (payload.status === 'published') payload.publishedAt = new Date();

  const doc = await Hostel.create(payload);

  await writeAudit(req, session, {
    action: 'listing.create',
    targetType: 'Hostel',
    targetId: doc._id,
    meta: { name: doc.name, status: doc.status, city: doc.city },
  });

  return created({ hostel: serialize(doc.toObject()) });
});

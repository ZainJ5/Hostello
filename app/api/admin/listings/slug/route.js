import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok } from '@/lib/api';
import Hostel from '@/models/Hostel';
import { slugify } from '@/lib/utils';
import { uniqueSlug } from '@/app/api/admin/_lib/hostel';

const OID = /^[a-f0-9]{24}$/i;

/** Live uniqueness check behind the slug field on the listing form. */
export const GET = handler(async (req) => {
  await connectDB();
  await requireRole('admin');

  const sp = new URL(req.url).searchParams;
  const raw = sp.get('slug') || sp.get('name') || '';
  const excludeId = sp.get('excludeId');

  const slug = slugify(raw);
  if (!slug) return ok({ slug: '', available: false, suggestion: '' });

  const clash = await Hostel.exists({
    slug,
    ...(excludeId && OID.test(excludeId) ? { _id: { $ne: excludeId } } : {}),
  });

  return ok({
    slug,
    available: !clash,
    suggestion: clash ? await uniqueSlug(slug, OID.test(excludeId || '') ? excludeId : null) : slug,
  });
});

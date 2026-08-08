import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, readJson } from '@/lib/api';
import Settings, { SETTINGS_KEY } from '@/models/Settings';
import { PAYMENT_METHODS } from '@/models/Payment';
import { getSettings } from '@/app/api/admin/_lib/settings';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import { serialize } from '@/lib/utils';

const settingsInput = z.object({
  listingFee: z.coerce.number().min(0).max(1_000_000),
  listingPeriodMonths: z.coerce.number().int().min(1).max(60),
  paymentInstructions: z.string().max(2000).default(''),
  accounts: z
    .array(
      z.object({
        label: z.string().trim().max(80).default(''),
        method: z.enum(PAYMENT_METHODS).default('Bank Transfer'),
        accountName: z.string().trim().max(120).default(''),
        accountNumber: z.string().trim().max(64).default(''),
      })
    )
    .max(8)
    .default([]),
  featuredSlots: z.coerce.number().int().min(0).max(200),
  supportEmail: z.union([z.literal(''), z.string().trim().email()]).default(''),
  supportPhone: z.string().trim().max(32).default(''),
  autoPublishOnApproval: z.coerce.boolean().default(true),
});

export const GET = handler(async () => {
  await connectDB();
  await requireRole('admin');
  return ok({ settings: serialize(await getSettings()) });
});

export const PUT = handler(async (req) => {
  await connectDB();
  const session = await requireRole('admin');

  const before = await getSettings();
  const data = settingsInput.parse(await readJson(req));

  const doc = await Settings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { ...data, updatedBy: session.userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  // Record only what actually moved, so the audit trail stays readable.
  const changed = {};
  for (const key of Object.keys(data)) {
    if (JSON.stringify(before?.[key]) !== JSON.stringify(doc?.[key])) {
      changed[key] = { from: before?.[key], to: doc?.[key] };
    }
  }

  if (Object.keys(changed).length) {
    await writeAudit(req, session, {
      action: 'settings.update',
      targetType: 'Settings',
      targetId: SETTINGS_KEY,
      meta: { changed },
    });
  }

  return ok({ settings: serialize(doc), changed: Object.keys(changed) });
});

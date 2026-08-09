import { handler, created, fail, clientIp } from '@/lib/api';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import Payment from '@/models/Payment';
import { serialize } from '@/lib/utils';
import { enforceRateLimit } from '@/lib/rate-limit';
import { paymentSchema } from '@/components/owner/schemas';
import { loadOwnedHostel } from '@/app/(owner)/_lib/owner-data';
import { savePaymentScreenshot } from '@/app/(owner)/_lib/uploads';
import { getBillingConfig } from '@/app/(owner)/_lib/billing';
import { auditOwner } from '@/app/(owner)/_lib/audit';

/**
 * Records an out-of-band listing-fee transfer and moves the listing into the
 * admin queue: `pending_payment` → `pending_review`.
 *
 * There is no gateway to call, so the screenshot is the receipt. Approving the
 * `Payment` in the admin panel is what publishes the hostel; this route never
 * sets `published` itself.
 */
export const POST = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { id } = await ctx.params;
  const hostel = await loadOwnedHostel(id, session);

  enforceRateLimit(`owner-payment:${session.userId}:${clientIp(req)}`, {
    max: 10,
    windowMs: 10 * 60_000,
  });

  if (hostel.status === 'published') {
    return fail('This listing is already live, so no further payment is due.', 409);
  }
  if (hostel.status === 'draft') {
    return fail('Finish and submit the listing before paying the fee.', 409);
  }
  if (hostel.status === 'suspended') {
    return fail('Suspended listings can only be restored by an admin.', 409);
  }

  const existingPending = await Payment.findOne({
    hostelId: hostel._id,
    ownerId: hostel.ownerId,
    status: 'pending',
  }).lean();
  if (existingPending) {
    return fail(
      'A payment for this listing is already awaiting review. You can re-upload once an admin responds.',
      409
    );
  }

  const form = await req.formData();
  const fields = paymentSchema.parse({
    amount: form.get('amount'),
    method: form.get('method'),
    transactionRef: form.get('transactionRef'),
    paidAt: form.get('paidAt'),
  });

  const paidAt = new Date(fields.paidAt);
  if (Number.isNaN(paidAt.getTime())) return fail('That payment date is not valid', 422);
  if (paidAt.getTime() > Date.now() + 86400000) {
    return fail('The payment date cannot be in the future', 422);
  }

  const file = form.get('screenshot');
  if (!file || typeof file === 'string') {
    return fail('Attach a screenshot of the transfer, since it is how we verify the payment.', 422);
  }
  // Validated (MIME + size + magic bytes) and written with an unguessable name.
  const screenshot = await savePaymentScreenshot(file);

  const billing = await getBillingConfig();
  const payment = await Payment.create({
    hostelId: hostel._id,
    ownerId: hostel.ownerId,
    amount: fields.amount,
    method: fields.method,
    transactionRef: fields.transactionRef,
    paidAt,
    screenshot,
    status: 'pending',
    planMonths: billing.planMonths,
  });

  hostel.status = 'pending_review';
  hostel.rejectionReason = '';
  await hostel.save();

  await auditOwner(req, session, 'owner.payment.submitted', {
    targetType: 'Payment',
    targetId: payment._id,
    meta: {
      hostelId: String(hostel._id),
      amount: payment.amount,
      method: payment.method,
      expected: billing.amount,
      // Flag a short payment for the reviewing admin instead of rejecting it
      // here, because partial transfers happen and are a human conversation.
      short: payment.amount < billing.amount,
    },
  });

  return created({
    payment: serialize({ ...payment.toObject(), screenshot: undefined }),
    listing: serialize(hostel.toObject()),
  });
});

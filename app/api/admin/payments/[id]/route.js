import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import { sendNotification } from '@/lib/mail';
import Payment from '@/models/Payment';
import Hostel from '@/models/Hostel';
import User from '@/models/User';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import { getSettings } from '@/app/api/admin/_lib/settings';
import { formatPKR, serialize } from '@/lib/utils';

const OID = /^[a-f0-9]{24}$/i;

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Approve or reject a listing-fee screenshot.
 *
 * Both branches are idempotent: the status transition is a conditional update,
 * so a double-click, a retried request, or two admins working the queue at the
 * same time still produces exactly one state change, one audit row and one
 * email. A repeat call returns 200 with `alreadyDone` rather than an error —
 * the caller's intent is already satisfied.
 */
export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('admin');

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('Not a valid payment id', 400);

  const { action, note, reason } = await readJson(req);
  if (!['approve', 'reject'].includes(action)) return fail('Unknown action', 422);

  const payment = await Payment.findById(id).lean();
  if (!payment) return fail('That payment no longer exists', 404);

  const [hostel, owner, settings] = await Promise.all([
    Hostel.findById(payment.hostelId),
    User.findById(payment.ownerId).select('name email').lean(),
    getSettings(),
  ]);

  // ─── Approve ───────────────────────────────────────────────────────────
  if (action === 'approve') {
    if (payment.status === 'approved') {
      return ok({ alreadyDone: true, status: 'approved' });
    }

    const expiresAt =
      payment.expiresAt ||
      new Date(Date.now() + (payment.planMonths || 1) * 30 * 86400000);

    const res = await Payment.updateOne(
      { _id: payment._id, status: { $ne: 'approved' } },
      {
        $set: {
          status: 'approved',
          reviewedBy: session.userId,
          reviewedAt: new Date(),
          reviewNote: String(note || ''),
          expiresAt,
        },
      }
    );
    // Another request won the race and already approved it.
    if (res.modifiedCount === 0) return ok({ alreadyDone: true, status: 'approved' });

    const shouldPublish = settings?.autoPublishOnApproval !== false;
    let publishedNow = false;
    if (hostel && shouldPublish && hostel.status !== 'published') {
      hostel.status = 'published';
      hostel.publishedAt = hostel.publishedAt || new Date();
      hostel.rejectionReason = '';
      await hostel.save();
      publishedNow = true;
    }

    await writeAudit(req, session, {
      action: 'payment.approve',
      targetType: 'Payment',
      targetId: payment._id,
      meta: {
        amount: payment.amount,
        method: payment.method,
        transactionRef: payment.transactionRef,
        hostel: hostel?.name || String(payment.hostelId),
        hostelId: String(payment.hostelId),
        published: publishedNow,
        note: note || '',
      },
    });

    if (owner?.email) {
      await sendNotification({
        to: owner.email,
        subject: publishedNow ? 'Your Hostello listing is live' : 'Your Hostello payment is approved',
        heading: publishedNow ? 'Your listing is live' : 'Payment approved',
        body: publishedNow
          ? `We verified your ${formatPKR(payment.amount)} listing fee for “${hostel?.name || 'your listing'}”. It is now published and visible to students searching Hostello.`
          : `We verified your ${formatPKR(payment.amount)} listing fee for “${hostel?.name || 'your listing'}”. It will go live once a final review is complete.`,
        cta: hostel?.slug
          ? { label: 'View your listing', href: `${siteUrl()}/hostels/${hostel.slug}` }
          : { label: 'Open your dashboard', href: `${siteUrl()}/owner` },
      }).catch((err) => console.error('[payments] approval email failed', err));
    }

    return ok({
      status: 'approved',
      published: publishedNow,
      payment: serialize(await Payment.findById(payment._id).lean()),
    });
  }

  // ─── Reject ────────────────────────────────────────────────────────────
  const why = String(reason || '').trim();
  if (why.length < 5) {
    return fail('Give the owner a reason of at least 5 characters', 422, {
      fieldErrors: { reason: ['A reason is required so the owner can fix it'] },
    });
  }

  if (payment.status === 'rejected') {
    return ok({ alreadyDone: true, status: 'rejected' });
  }

  const res = await Payment.updateOne(
    { _id: payment._id, status: { $ne: 'rejected' } },
    {
      $set: {
        status: 'rejected',
        reviewedBy: session.userId,
        reviewedAt: new Date(),
        reviewNote: why,
      },
    }
  );
  if (res.modifiedCount === 0) return ok({ alreadyDone: true, status: 'rejected' });

  if (hostel && hostel.status !== 'pending_payment') {
    hostel.status = 'pending_payment';
    hostel.rejectionReason = why;
    await hostel.save();
  }

  await writeAudit(req, session, {
    action: 'payment.reject',
    targetType: 'Payment',
    targetId: payment._id,
    meta: {
      amount: payment.amount,
      method: payment.method,
      transactionRef: payment.transactionRef,
      hostel: hostel?.name || String(payment.hostelId),
      hostelId: String(payment.hostelId),
      reason: why,
    },
  });

  if (owner?.email) {
    await sendNotification({
      to: owner.email,
      subject: 'We could not verify your Hostello payment',
      heading: 'Payment needs another look',
      body: `We were unable to verify the ${formatPKR(payment.amount)} listing fee for “${hostel?.name || 'your listing'}”. Reason: ${why} — please upload a clearer screenshot or a corrected transaction reference.`,
      cta: { label: 'Upload a new receipt', href: `${siteUrl()}/owner/payments` },
    }).catch((err) => console.error('[payments] rejection email failed', err));
  }

  return ok({
    status: 'rejected',
    payment: serialize(await Payment.findById(payment._id).lean()),
  });
});

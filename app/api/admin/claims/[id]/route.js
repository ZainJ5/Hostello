import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { fail, handler, ok, readJson } from '@/lib/api';
import { sendNotification } from '@/lib/mail';
import { serialize } from '@/lib/utils';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import Claim from '@/models/Claim';
import Hostel from '@/models/Hostel';
import User from '@/models/User';

const OID = /^[a-f0-9]{24}$/i;

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Approve or reject a claim on a listing.
 *
 * APPROVING DOES FOUR THINGS, and they are worth naming because each one is a
 * thing an admin would otherwise have to remember:
 *
 *   the listing is assigned to the claimant, so it appears in their dashboard
 *   the number they gave replaces whatever was on the listing
 *   the listing's source becomes `owner`, because it is now kept by one
 *   a student account is promoted to owner, since they now run a listing
 *
 * Every other pending claim on the same listing is closed at the same time.
 * Two people cannot both be handed one hostel, and leaving the losers sitting
 * in the queue would mean an admin opening them later and wondering.
 *
 * Both branches are idempotent. The status change is a conditional update, so
 * a double-click or two admins in the queue at once still produce one state
 * change, one audit row and one email; a repeat returns 200 with `alreadyDone`
 * rather than an error, because the caller's intent is already satisfied.
 */
export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('admin');

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('Not a valid claim id', 400);

  const { action, note, reason } = await readJson(req);
  if (!['approve', 'reject'].includes(action)) return fail('Unknown action', 422);

  const claim = await Claim.findById(id).lean();
  if (!claim) return fail('That claim no longer exists', 404);

  // ─── Approve ───────────────────────────────────────────────────────────
  if (action === 'approve') {
    if (claim.status === 'approved') return ok({ alreadyDone: true, status: 'approved' });

    const [hostel, claimant] = await Promise.all([
      Hostel.findById(claim.hostelId),
      User.findById(claim.claimantId).select('name email role'),
    ]);
    if (!hostel) return fail('The listing this claim points at no longer exists', 409);
    if (!claimant) return fail('The account that filed this claim no longer exists', 409);
    if (hostel.ownerId && String(hostel.ownerId) !== String(claim.claimantId)) {
      return fail('That listing already belongs to another owner account', 409);
    }

    const res = await Claim.updateOne(
      { _id: claim._id, status: { $ne: 'approved' } },
      {
        $set: {
          status: 'approved',
          reviewedBy: session.userId,
          reviewedAt: new Date(),
          decisionNote: String(note || ''),
        },
      }
    );
    // Another request won the race.
    if (res.modifiedCount === 0) return ok({ alreadyDone: true, status: 'approved' });

    hostel.ownerId = claim.claimantId;
    // `contact` is a nested path rather than a subdocument, so the fields are
    // set individually: replacing the whole object would drop the email that
    // may already be on the listing.
    // "(via Houstel.pk)" was a placeholder for a contact we never had. Once a
    // real owner holds the listing it is just wrong.
    const currentName = String(hostel.contact.name || '')
      .replace(/\s*\(via [^)]*\)\s*/i, '')
      .trim();
    hostel.contact.name = currentName || claim.hostelName;
    hostel.contact.phone = claim.phone;
    hostel.contact.whatsapp = claim.whatsapp || claim.phone;
    // The listing is kept by its owner now, whatever it was built from.
    hostel.source = 'owner';
    await hostel.save();

    // Somebody who signed up to find a room and turns out to run a hostel
    // should not need a second account.
    let promoted = false;
    if (claimant.role === 'student') {
      claimant.role = 'owner';
      await claimant.save();
      promoted = true;
    }

    // One hostel, one owner. The others are answered rather than abandoned.
    const closed = await Claim.updateMany(
      { hostelId: claim.hostelId, status: 'pending', _id: { $ne: claim._id } },
      {
        $set: {
          status: 'rejected',
          reviewedBy: session.userId,
          reviewedAt: new Date(),
          decisionNote: 'Another claim on this listing was approved.',
        },
      }
    );

    await writeAudit(req, session, {
      action: 'claim.approve',
      targetType: 'Claim',
      targetId: claim._id,
      meta: {
        hostel: hostel.name,
        hostelId: String(hostel._id),
        claimant: claim.claimantEmail,
        phone: claim.phone,
        promotedToOwner: promoted,
        otherClaimsClosed: closed.modifiedCount,
        note: note || '',
      },
    });

    await sendNotification({
      to: claim.claimantEmail,
      subject: `${hostel.name} is yours on Hostello`,
      heading: 'Your claim was approved',
      body:
        `“${hostel.name}” is now on your account. The number you gave us is live on the listing, so students reach you directly.\n\n` +
        'You can change the rent, the photos and the facilities yourself from your dashboard, and enquiries come to you.' +
        (promoted ? '\n\nYour account is now an owner account, so the dashboard is where you manage it.' : ''),
      cta: { label: 'Open your dashboard', href: `${siteUrl()}/owner` },
    }).catch((err) => console.error('[claims] approval email failed', err));

    return ok({
      status: 'approved',
      promoted,
      otherClaimsClosed: closed.modifiedCount,
      claim: serialize(await Claim.findById(claim._id).lean()),
    });
  }

  // ─── Reject ────────────────────────────────────────────────────────────
  const why = String(reason || '').trim();
  if (why.length < 5) {
    return fail('Give the claimant a reason of at least 5 characters', 422, {
      fieldErrors: { reason: ['A reason is required so they know what to send'] },
    });
  }

  if (claim.status === 'rejected') return ok({ alreadyDone: true, status: 'rejected' });

  const res = await Claim.updateOne(
    { _id: claim._id, status: { $ne: 'rejected' } },
    {
      $set: {
        status: 'rejected',
        reviewedBy: session.userId,
        reviewedAt: new Date(),
        decisionNote: why,
      },
    }
  );
  if (res.modifiedCount === 0) return ok({ alreadyDone: true, status: 'rejected' });

  await writeAudit(req, session, {
    action: 'claim.reject',
    targetType: 'Claim',
    targetId: claim._id,
    meta: {
      hostel: claim.hostelName,
      hostelId: String(claim.hostelId),
      claimant: claim.claimantEmail,
      reason: why,
    },
  });

  await sendNotification({
    to: claim.claimantEmail,
    subject: `About your claim for ${claim.hostelName}`,
    heading: 'We could not approve that claim yet',
    body:
      `We looked at your claim for “${claim.hostelName}” and could not approve it. Reason: ${why}\n\n` +
      'If you can send something that settles it, file the claim again with that attached and we will take another look.',
    cta: { label: 'See the listing', href: `${siteUrl()}/hostels` },
  }).catch((err) => console.error('[claims] rejection email failed', err));

  return ok({
    status: 'rejected',
    claim: serialize(await Claim.findById(claim._id).lean()),
  });
});

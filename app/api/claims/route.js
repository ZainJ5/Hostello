import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { clientIp, created, fail, handler, ok, readJson } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { sendNotification } from '@/lib/mail';
import { normalizePhone, serialize } from '@/lib/utils';
import {
  CLAIM_ROLE_VALUES,
  MAX_CLAIM_PROOF,
  MIN_CLAIM_EVIDENCE,
  isClaimable,
} from '@/lib/claims';
import Claim from '@/models/Claim';
import Hostel from '@/models/Hostel';
import User from '@/models/User';

/** Where a claim reaches a person, the same inbox the listing reports use. */
const CLAIMS_INBOX = 'team@xaviot.com';

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const MOBILE = /^\+92(3[0-4]\d|355)\d{7}$/;

const phoneField = (label) =>
  z
    .string({ message: `${label} is required` })
    .trim()
    .transform((v) => normalizePhone(v))
    .refine((v) => MOBILE.test(v), {
      message: 'Write a Pakistani mobile number, like 0300 1234567',
    });

const schema = z.object({
  hostelSlug: z.string().trim().min(1, 'Which listing are you claiming?').max(200),
  role: z.enum(CLAIM_ROLE_VALUES, { message: 'Say what you are to this hostel' }),
  phone: phoneField('A phone number'),
  // Blank means "same as the phone number", which is the common case.
  whatsapp: z
    .union([z.literal(''), z.string().trim()])
    .default('')
    .transform((v) => (v ? normalizePhone(v) : ''))
    .refine((v) => v === '' || MOBILE.test(v), {
      message: 'Write a Pakistani mobile number, or leave this blank',
    }),
  // `.default('')` would skip the minimum when the field is missing, because a
  // zod default is not run back through the rules above it. The message on the
  // type is there for the same reason the length one is: an empty field and a
  // three word field are the same mistake to the person filling this in.
  evidence: z
    .string({ message: 'Tell us how we can tell this is yours' })
    .trim()
    .min(
      MIN_CLAIM_EVIDENCE,
      `Tell us how we can tell this is yours: at least ${MIN_CLAIM_EVIDENCE} characters`
    )
    .max(2000, 'Keep this under 2000 characters'),
  proof: z
    .array(z.string().trim().max(300))
    .max(MAX_CLAIM_PROOF, `Attach at most ${MAX_CLAIM_PROOF} photos`)
    .default([])
    // Only paths this site wrote. A claimant cannot point the admin console at
    // an arbitrary URL and have it rendered as evidence.
    .transform((list) => list.filter((p) => p.startsWith('/uploads/claims/'))),
});

/**
 * POST /api/claims: ask for a listing.
 *
 * AN ACCOUNT IS REQUIRED, unlike a listing report. A report is a favour a
 * stranger does us and the safety page promises it needs no account. A claim
 * is a request to be handed a listing, its number and every enquiry that
 * follows, so there has to be somebody on the other end of it who can be
 * emailed, held to what they said, and given the listing when it is approved.
 *
 * Students can claim too. Somebody who signed up to find a room and turns out
 * to run a hostel should not have to make a second account: the role is
 * changed to owner when the claim is approved, not before, because until then
 * nothing has been established.
 */
export const POST = handler(async (req) => {
  const session = await requireRole();
  await connectDB();

  // Two limits: one on the account, one on the address it is coming from, so a
  // handful of fresh accounts from one place cannot flood the queue.
  enforceRateLimit(`claim:create:${session.userId}`, { max: 5, windowMs: 24 * 60 * 60 * 1000 });
  enforceRateLimit(`claim:create:ip:${clientIp(req)}`, { max: 15, windowMs: 60 * 60 * 1000 });

  const body = schema.parse(await readJson(req));

  const hostel = await Hostel.findOne({ slug: body.hostelSlug })
    .select('_id name slug city area status ownerId')
    .lean();
  if (!hostel) return fail('That listing could not be found', 404);

  if (!isClaimable(hostel)) {
    return fail(
      hostel.ownerId
        ? 'That listing already belongs to an owner account. Email us if you think that is wrong.'
        : 'That listing is not published, so there is nothing to claim yet.',
      409
    );
  }

  const existing = await Claim.findOne({
    hostelId: hostel._id,
    claimantId: session.userId,
    status: 'pending',
  })
    .select('_id')
    .lean();
  if (existing) {
    return fail('You already have a claim on this listing waiting for review', 409);
  }

  const user = await User.findById(session.userId).select('name email').lean();
  if (!user) return fail('Sign in to continue', 401);

  const claim = await Claim.create({
    hostelId: hostel._id,
    hostelName: hostel.name,
    claimantId: session.userId,
    claimantName: user.name,
    claimantEmail: user.email,
    role: body.role,
    phone: body.phone,
    whatsapp: body.whatsapp || body.phone,
    evidence: body.evidence,
    proof: body.proof,
  });

  // Best effort on both. The claim is in the database, so a mail failure must
  // not tell the claimant their claim was lost.
  const where = [hostel.area, hostel.city].filter(Boolean).join(', ');
  try {
    await sendNotification({
      to: CLAIMS_INBOX,
      subject: `Listing claim: ${hostel.name}`,
      heading: 'Somebody claimed a listing',
      body:
        `${hostel.name}${where ? `, ${where}` : ''}\n\n` +
        `From: ${user.name} <${user.email}>\n` +
        `Says they are: ${body.role}\n` +
        `Number given: ${body.phone}\n` +
        `Photos attached: ${body.proof.length}\n\n` +
        `${body.evidence}\n\n` +
        `Claim id: ${claim._id}`,
      cta: { label: 'Open the claims queue', href: `${siteUrl()}/admin/claims` },
    });
  } catch (err) {
    console.error('[claims] could not notify:', err?.message || err);
  }

  try {
    await sendNotification({
      to: user.email,
      subject: `We have your claim for ${hostel.name}`,
      heading: 'Claim received',
      body:
        `Thanks. We have your claim for “${hostel.name}”${where ? ` in ${where}` : ''} and a person will look at it.\n\n` +
        'If it checks out, the listing moves to your account and the number you gave us goes on it, so students reach you rather than nobody. We will email you either way.',
      cta: { label: 'See the listing', href: `${siteUrl()}/hostels/${hostel.slug}` },
    });
  } catch (err) {
    console.error('[claims] could not confirm to claimant:', err?.message || err);
  }

  return created({ ok: true, claimId: String(claim._id) });
});

/** GET /api/claims: the signed in person's own claims, newest first. */
export const GET = handler(async () => {
  const session = await requireRole();
  await connectDB();

  const rows = await Claim.find({ claimantId: session.userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('hostelId hostelName status decisionNote createdAt reviewedAt')
    .lean();

  return ok({ rows: serialize(rows) });
});

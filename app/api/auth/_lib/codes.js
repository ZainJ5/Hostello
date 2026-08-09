import VerificationCode from '@/models/VerificationCode';
import { generateCode, hashCode, codeMatches } from '@/lib/auth';
import { sendVerificationCode } from '@/lib/mail';

/** Matches the "expires in 10 minutes" copy baked into the email template. */
export const CODE_TTL_MINUTES = 10;

/** A code is burnt after this many wrong guesses; the user must request a new one. */
export const MAX_ATTEMPTS = 5;

/**
 * True when a mail server is configured. When false, sendVerificationCode logs
 * the code server-side instead of transmitting it. Callers surface the result
 * as a boolean flag so the UI can tell the user whether to expect an email.
 * The code itself is never returned to the client.
 */
export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

function invalidCode(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Issues a fresh code for an email + purpose and emails it.
 *
 * Any outstanding code for the same pair is consumed first, so a resend
 * invalidates the previous one and only the newest code in the mailbox works.
 *
 * Returns only `{ delivered }`, never the code, on any path.
 */
export async function issueCode({ email, purpose }) {
  await VerificationCode.updateMany(
    { email, purpose, consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );

  const code = generateCode();
  await VerificationCode.create({
    email,
    purpose,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
  });

  const { delivered } = await sendVerificationCode({ to: email, code, purpose });
  return { delivered: Boolean(delivered) };
}

/**
 * Checks a submitted code against the newest unconsumed record.
 *
 * `consume: false` validates without spending the code. It is used by
 * /api/auth/verify for the `reset` and `delete-account` purposes, where the
 * follow-up request (reset-password, DELETE delete-account) is the call that
 * actually performs the state change and must be the one to consume it.
 * Wrong guesses still count against the attempt cap either way.
 */
export async function verifyCode({ email, purpose, code, consume = true }) {
  const record = await VerificationCode.findOne({
    email,
    purpose,
    consumedAt: null,
  }).sort({ createdAt: -1 });

  // Mongo's TTL monitor may already have removed an expired document, so a
  // missing record and an expired one get the same message.
  if (!record || record.expiresAt.getTime() <= Date.now()) {
    throw invalidCode('That code has expired. Request a new one.');
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    throw invalidCode('Too many incorrect attempts. Request a new code.', 429);
  }

  if (!codeMatches(code, record.codeHash)) {
    record.attempts += 1;
    // At the cap, burn the record so the next request needs a brand new code.
    if (record.attempts >= MAX_ATTEMPTS) record.consumedAt = new Date();
    await record.save();

    const left = MAX_ATTEMPTS - record.attempts;
    throw invalidCode(
      left > 0
        ? `That code is incorrect. ${left} attempt${left === 1 ? '' : 's'} left.`
        : 'Too many incorrect attempts. Request a new code.',
      left > 0 ? 400 : 429
    );
  }

  if (consume) {
    record.consumedAt = new Date();
    await record.save();
  }

  return record;
}

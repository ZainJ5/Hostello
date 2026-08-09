import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SESSION_COOKIE = 'hostello_session';
const SESSION_DAYS = 30;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too short: set a 32+ character value in .env.local'
    );
  }
  return new TextEncoder().encode(secret);
}

// ─── Passwords ──────────────────────────────────────────────────────────

export function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain, hash) {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(plain, hash);
}

// ─── Verification codes ─────────────────────────────────────────────────

/** Six digits, drawn from a CSPRNG rather than Math.random. */
export function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

/** Constant-time compare so a wrong code can't be found by timing. */
export function codeMatches(code, storedHash) {
  const a = Buffer.from(hashCode(code));
  const b = Buffer.from(String(storedHash || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ─── Sessions ───────────────────────────────────────────────────────────

export async function createSession({ userId, role, email, name }) {
  const token = await new SignJWT({ userId: String(userId), role, email, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  // cookies() is async in Next 16.
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  return token;
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Returns the session payload, or null when signed out or the token is bad. */
export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch {
    return null;
  }
}

/** Verifies a token string directly, for proxy.js, which has no cookie store. */
export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

/**
 * Route-handler guard. Returns the session, or throws an object the API
 * error helper turns into a 401/403.
 */
export async function requireRole(...roles) {
  const session = await getSession();
  if (!session) {
    const err = new Error('Sign in to continue');
    err.status = 401;
    throw err;
  }
  if (roles.length && !roles.includes(session.role)) {
    const err = new Error('You do not have access to this resource');
    err.status = 403;
    throw err;
  }
  return session;
}

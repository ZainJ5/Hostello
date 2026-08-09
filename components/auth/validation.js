/**
 * Client-side mirrors of the rules in `@/lib/validators/auth`.
 *
 * These exist so a typo gets an answer on blur instead of after a round trip.
 * They are a convenience only. The server schemas are the authority, and every
 * form still renders whatever `fieldErrors` comes back in a 422.
 *
 * Deliberately plain JS: importing the Zod schemas here would pull the whole
 * validator runtime into the auth bundle for four regexes.
 */

export const PASSWORD_MIN = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emailIssue(value) {
  const v = String(value ?? '').trim();
  if (!v) return 'Email is required';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address';
  if (v.length > 160) return 'That email address is too long';
  return '';
}

export function nameIssue(value) {
  const v = String(value ?? '').trim();
  if (!v) return 'Name is required';
  if (v.length < 2) return 'Enter your full name';
  if (v.length > 80) return 'Use 80 characters or fewer';
  return '';
}

export function passwordIssue(value) {
  const v = String(value ?? '');
  if (!v) return 'Password is required';
  if (v.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters`;
  if (v.length > 128) return 'Use 128 characters or fewer';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) {
    return 'Include at least one letter and one number';
  }
  return '';
}

export function codeIssue(value) {
  const v = String(value ?? '').trim();
  if (!v) return 'Enter the 6-digit code';
  if (!/^\d{6}$/.test(v)) return 'The code is 6 digits';
  return '';
}

/** The three checks the strength meter lists, in the order it lists them. */
export const PASSWORD_RULES = [
  { id: 'length', label: `${PASSWORD_MIN}+ characters`, test: (v) => v.length >= PASSWORD_MIN },
  { id: 'letter', label: 'A letter', test: (v) => /[A-Za-z]/.test(v) },
  { id: 'number', label: 'A number', test: (v) => /\d/.test(v) },
];

// Anything a credential-stuffing list opens with. Matched as a prefix so
// "password1" and "qwerty123" are caught alongside the bare words.
const OBVIOUS = /^(password|passw0rd|12345678|123456789|qwerty|iloveyou|welcome|abc123|letmein|hostello)/i;

/**
 * Scores a password 0–4 for the meter. Below the minimum policy the score is
 * pinned to 1, so a long-but-invalid password never looks safe.
 */
export function scorePassword(value) {
  const v = String(value ?? '');
  if (!v) return { score: 0, label: '', percent: 0 };

  let points = 0;
  if (v.length >= PASSWORD_MIN) points += 1;
  if (v.length >= 12) points += 1;
  if (v.length >= 16) points += 1;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) points += 1;
  if (/\d/.test(v)) points += 1;
  if (/[^A-Za-z0-9]/.test(v)) points += 1;

  let score = Math.min(4, Math.max(1, Math.ceil((points * 4) / 6)));
  if (passwordIssue(v)) score = 1;
  if (OBVIOUS.test(v)) score = 1;

  const label = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];
  return { score, label, percent: (score / 4) * 100 };
}

/**
 * Accepts only a same-origin path. `//evil.com` and `/\evil.com` are
 * protocol-relative URLs. The browser treats both as another origin, which is
 * how an open redirect gets in.
 */
export function safeNext(value) {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  if (!v.startsWith('/')) return '';
  if (v.startsWith('//') || v.startsWith('/\\')) return '';
  return v;
}

/** Mirrors HOME_FOR_ROLE in app/api/auth/_lib/users.js. */
export function homeForRole(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  return '/dashboard';
}

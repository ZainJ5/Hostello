import { normalizePhone } from '@/lib/utils';

/**
 * Who is answering for a listing, and what to do when nobody is.
 *
 * Most of the directory was built from hostels' own public listings rather
 * than from the owners, so a large share of it carries no way to reach the
 * person who runs the place. Those listings are the ones that ask to be
 * claimed, and this module is the single answer to "is anybody home", used by
 * the listing page, the claim form and the API that accepts a claim. Keeping
 * it in one place matters because the three have to agree: a page that offers
 * a claim button on a listing the API then refuses is worse than no button.
 */

/**
 * Numbers that are on a listing but reach nobody.
 *
 * The import put one shared number on hundreds of listings. It was a real
 * number once and it is dead now, so treating it as a contact means printing
 * a number that rings out, which is worse for a student than an honest blank.
 * Compared after `normalizePhone`, so 0311 4844284 and +92 311 4844284 are
 * the same entry.
 */
export const UNREACHABLE_NUMBERS = new Set(['+923114844284']);

/** Seeded placeholders that were never anybody's number. */
const PLACEHOLDER = /^\+92(3001234567|3009876543|3211234567)$/;

/**
 * Pakistani mobile prefixes in use: 030x to 034x across Jazz, Zong, Ufone and
 * Telenor, plus 0355 for SCO. A stored value outside them is a typo or a
 * landline, and either way it is not a number a student should be given.
 */
const MOBILE = /^\+92(3[0-4]\d|355)\d{7}$/;

/** The number a student can actually ring, or an empty string. */
export function reachablePhone(hostel) {
  const phone = normalizePhone(hostel?.contact?.phone);
  if (!phone || !MOBILE.test(phone)) return '';
  if (UNREACHABLE_NUMBERS.has(phone) || PLACEHOLDER.test(phone)) return '';
  return phone;
}

/** True when the listing has nobody a student can reach from the page. */
export function isUnreachable(hostel) {
  return !reachablePhone(hostel);
}

/**
 * True when an owner can take the listing over.
 *
 * A listing that already belongs to an account is not claimable: the owner it
 * belongs to changes it from their own dashboard, and a second claim on it
 * would be a request to take somebody else's listing away. Everything else is
 * fair game, including listings that do carry a number, because a number we
 * found on a directory is not the same as an owner who has signed up.
 */
export function isClaimable(hostel) {
  return Boolean(hostel) && !hostel.ownerId && hostel.status === 'published';
}

/** What the claimant is to the hostel. Stored so a decision has context. */
export const CLAIM_ROLES = [
  { value: 'owner', label: 'I own this hostel' },
  { value: 'manager', label: 'I manage it for the owner' },
  { value: 'staff', label: 'I work here' },
];

export const CLAIM_ROLE_VALUES = CLAIM_ROLES.map((r) => r.value);

export const CLAIM_STATUSES = ['pending', 'approved', 'rejected'];

/** Proof is optional in the form and this is what the form asks for. */
export const MIN_CLAIM_EVIDENCE = 20;
export const MAX_CLAIM_PROOF = 4;

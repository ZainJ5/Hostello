import Hostel, { FACILITIES, ROOM_TYPES } from '@/models/Hostel';
import { slugify } from '@/lib/utils';

/**
 * ══ Edit policy for a live listing ══════════════════════════════════════
 *
 * DECISION: editing a `published` listing does NOT send it back for
 * re-approval. The edit goes live immediately and the listing never leaves
 * public view.
 *
 * Why: the listing fee buys a publication period, not a publication event.
 * Taking a paid, ranked listing dark for a day because the owner corrected a
 * phone number or a rent figure punishes exactly the behaviour we want, and it
 * teaches owners to leave stale prices up rather than risk the downtime — which
 * is worse for students than the edit ever was.
 *
 * What we do instead, so the loophole is not free:
 *   1. Every edit is written to `AuditLog`, so admins have a full history.
 *   2. An edit that changes a *material* field (identity, location, price,
 *      gender, contact) clears `verified`. The listing stays live, but it loses
 *      its "Verified" trust badge until an admin re-checks it — reputation is
 *      re-earned, distribution is not interrupted.
 *   3. `rejected` and `suspended` listings are excluded: those are already out
 *      of public view and must go back through review.
 *
 * The one edit that *is* gated is resubmission from `rejected` — see
 * `nextStatusAfterSubmit` below.
 * ═══════════════════════════════════════════════════════════════════════
 */
const MATERIAL_FIELDS = [
  'name',
  'city',
  'area',
  'address',
  'price',
  'priceMin',
  'priceMax',
  'rooms',
  'gender',
  'universities',
  'contact',
  'lat',
  'lng',
];

/** Only these image sources may be written to a listing. */
function isAllowedImage(value) {
  if (typeof value !== 'string') return false;
  if (value.startsWith('/uploads/hostels/')) return !value.includes('..');
  // The 59 imported listings carry Unsplash URLs; both hosts are already
  // whitelisted in next.config.mjs. Nothing else is accepted, so an owner
  // cannot point a listing at an arbitrary or `javascript:` URL.
  return /^https:\/\/(images|plus)\.unsplash\.com\//.test(value);
}

/**
 * Builds a slug that is unique across the collection. Called only while a
 * listing is still a draft — once published, the slug is frozen so public
 * links and search rankings survive a rename.
 */
export async function uniqueSlug(name, excludeId) {
  const base = slugify(name) || 'hostel';
  let candidate = base;

  for (let attempt = 2; attempt < 30; attempt++) {
    const clash = await Hostel.findOne({ slug: candidate }).select('_id').lean();
    if (!clash || (excludeId && String(clash._id) === String(excludeId))) return candidate;
    candidate = `${base}-${attempt}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Applies a validated patch to a hostel document in place and reports whether
 * anything material changed. Vocabularies are re-checked against the model's
 * own exports here — the client's copy of the list is never trusted.
 */
export function applyListingPatch(hostel, patch) {
  let materialChanged = false;

  const set = (field, value) => {
    const before = JSON.stringify(hostel[field] ?? null);
    hostel[field] = value;
    const after = JSON.stringify(hostel[field] ?? null);
    if (before !== after && MATERIAL_FIELDS.includes(field)) materialChanged = true;
  };

  if (patch.name !== undefined) set('name', patch.name);
  if (patch.city !== undefined) set('city', patch.city);
  if (patch.area !== undefined) set('area', patch.area);
  if (patch.address !== undefined) set('address', patch.address);
  if (patch.gender !== undefined) set('gender', patch.gender);
  if (patch.universities !== undefined) {
    set('universities', patch.universities.filter(Boolean).slice(0, 10));
  }

  if (patch.price !== undefined) set('price', patch.price);
  if (patch.securityDeposit !== undefined) set('securityDeposit', patch.securityDeposit);

  if (patch.rooms !== undefined) {
    set(
      'rooms',
      patch.rooms
        .filter((r) => ROOM_TYPES.includes(r.type))
        .slice(0, 10)
        .map((r) => ({
          type: r.type,
          price: r.price,
          capacity: r.capacity,
          available: r.available,
        }))
    );
  }

  // Derive the advertised band from the room table when the owner left the
  // min/max blank — an empty range renders as a single price on the card.
  const rooms = hostel.rooms || [];
  const roomPrices = rooms.map((r) => r.price).filter((p) => Number(p) > 0);
  if (patch.priceMin !== undefined) set('priceMin', patch.priceMin);
  if (patch.priceMax !== undefined) set('priceMax', patch.priceMax);
  if (!hostel.priceMin && roomPrices.length) set('priceMin', Math.min(...roomPrices));
  if (!hostel.priceMax && roomPrices.length) set('priceMax', Math.max(...roomPrices));
  if (!hostel.priceMin && hostel.price) hostel.priceMin = hostel.price;
  if (!hostel.priceMax && hostel.price) hostel.priceMax = hostel.price;

  if (patch.description !== undefined) set('description', patch.description);
  if (patch.facilities !== undefined) {
    set('facilities', patch.facilities.filter((f) => FACILITIES.includes(f)));
  }
  if (patch.rules !== undefined) {
    set('rules', patch.rules.map((r) => String(r).trim()).filter(Boolean).slice(0, 20));
  }

  if (patch.images !== undefined) {
    set('images', patch.images.filter(isAllowedImage).slice(0, 15));
  }

  if (patch.lat !== undefined) set('lat', patch.lat);
  if (patch.lng !== undefined) set('lng', patch.lng);
  if (patch.available !== undefined) set('available', patch.available);

  if (patch.contact !== undefined) {
    const next = { ...(hostel.contact?.toObject?.() ?? hostel.contact ?? {}) };
    for (const key of ['name', 'phone', 'whatsapp', 'email']) {
      if (patch.contact[key] !== undefined) next[key] = patch.contact[key];
    }
    set('contact', next);
  }

  return { materialChanged };
}

/**
 * Where a listing goes when the owner presses Submit.
 *
 *   draft            → pending_payment   (the fee has never been paid)
 *   pending_payment  → pending_payment   (still owes the fee; no-op)
 *   rejected         → pending_review    if a payment is already approved or
 *                                        still under review — the owner should
 *                                        not pay twice for one listing period
 *                    → pending_payment   otherwise (no payment, or it was the
 *                                        payment itself that was rejected)
 *
 * `published` and `suspended` never call this: published edits stay published
 * (see the policy note above), and a suspended listing is an admin matter.
 */
export function nextStatusAfterSubmit(currentStatus, latestPayment) {
  if (currentStatus === 'draft' || currentStatus === 'pending_payment') return 'pending_payment';

  if (currentStatus === 'rejected') {
    if (latestPayment && (latestPayment.status === 'approved' || latestPayment.status === 'pending')) {
      return 'pending_review';
    }
    return 'pending_payment';
  }

  return currentStatus;
}

export { FACILITIES, ROOM_TYPES };

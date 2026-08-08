import { z } from 'zod';
import { PK_BOUNDS } from './constants';

/**
 * Isomorphic validation. The wizard runs these per step for inline feedback and
 * the route handlers run the same objects again server-side — the client copy is
 * a convenience, never the gate. Kept free of any `@/models` import so it can be
 * bundled for the browser.
 *
 * Facility and room-type vocabularies are checked in the route handlers against
 * the `FACILITIES` / `ROOM_TYPES` exports, which only exist server-side.
 */

const trimmed = (max) => z.string().trim().max(max);
const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]{7,20}$/, 'Enter a valid phone number');

export const roomSchema = z.object({
  type: z.string().trim().min(1, 'Pick a room type'),
  price: z.coerce.number().min(0, 'Price cannot be negative').max(500000),
  capacity: z.coerce.number().int().min(1, 'At least 1 bed').max(20),
  available: z.coerce.number().int().min(0, 'Cannot be negative').max(200),
});

// ─── Step schemas (wizard order) ────────────────────────────────────────

export const basicsSchema = z.object({
  name: z.string().trim().min(3, 'Give the hostel a name of at least 3 characters').max(120),
  city: z.string().trim().min(2, 'Which city is it in?').max(60),
  area: trimmed(120).optional().or(z.literal('')),
  address: trimmed(200).optional().or(z.literal('')),
  universities: z.array(z.string().trim().min(1)).max(10, 'Pick up to 10 universities'),
  gender: z.enum(['Male', 'Female', 'Mixed'], 'Choose who can stay here'),
});

const pricingShape = {
  price: z.coerce
    .number('Enter the monthly rent')
    .min(1000, 'Rent looks too low — enter the monthly amount in PKR')
    .max(500000, 'Rent looks too high'),
  priceMin: z.coerce.number().min(0).max(500000),
  priceMax: z.coerce.number().min(0).max(500000),
  securityDeposit: z.coerce.number().min(0).max(500000),
  rooms: z.array(roomSchema).max(10, 'Up to 10 room types'),
};

function checkPriceBand(val, ctx) {
  if (val.priceMax && val.priceMin && val.priceMax < val.priceMin) {
    ctx.addIssue({
      code: 'custom',
      path: ['priceMax'],
      message: 'Maximum must be at least the minimum',
    });
  }
}

export const pricingSchema = z.object(pricingShape).superRefine(checkPriceBand);

export const detailsSchema = z.object({
  description: z
    .string()
    .trim()
    .min(60, 'Write at least 60 characters — students skip listings with thin descriptions')
    .max(4000, 'Keep the description under 4000 characters'),
  facilities: z.array(z.string().trim()).min(1, 'Select at least one facility').max(40),
  rules: z.array(z.string().trim().min(1).max(160)).max(20),
});

export const photosSchema = z.object({
  images: z.array(z.string().trim().min(1)).min(1, 'Add at least one photo').max(15),
});

export const locationSchema = z.object({
  lat: z.coerce
    .number('Enter a latitude')
    .min(PK_BOUNDS.minLat, 'Latitude is outside Pakistan')
    .max(PK_BOUNDS.maxLat, 'Latitude is outside Pakistan'),
  lng: z.coerce
    .number('Enter a longitude')
    .min(PK_BOUNDS.minLng, 'Longitude is outside Pakistan')
    .max(PK_BOUNDS.maxLng, 'Longitude is outside Pakistan'),
});

export const contactSchema = z.object({
  contact: z.object({
    name: z.string().trim().min(2, 'Who should students ask for?').max(80),
    phone: phone,
    whatsapp: z.union([phone, z.literal('')]).optional(),
    email: z.union([z.email('Enter a valid email'), z.literal('')]).optional(),
  }),
});

/** Ordered steps for the create wizard. */
export const WIZARD_STEPS = [
  { key: 'basics', title: 'Basics', description: 'Name, location and who can stay', schema: basicsSchema },
  { key: 'pricing', title: 'Pricing', description: 'Rent, rooms and deposit', schema: pricingSchema },
  { key: 'details', title: 'Details', description: 'Description, facilities and rules', schema: detailsSchema },
  { key: 'photos', title: 'Photos', description: 'Show students the rooms', schema: photosSchema },
  { key: 'location', title: 'Location', description: 'Pin it on the map', schema: locationSchema },
  { key: 'contact', title: 'Contact', description: 'How students reach you', schema: contactSchema },
  { key: 'review', title: 'Review', description: 'Check everything and submit', schema: null },
];

/** Everything a listing needs before it can leave `draft`. */
export const submitListingSchema = z
  .object({
    ...basicsSchema.shape,
    ...pricingShape,
    ...detailsSchema.shape,
    ...photosSchema.shape,
    ...locationSchema.shape,
    ...contactSchema.shape,
  })
  .superRefine(checkPriceBand);

/**
 * Lenient shape used by autosave. Every field is optional so a half-finished
 * step still persists; the strict schema above is what gates submission.
 */
export const draftListingSchema = z.object({
  name: trimmed(120).optional(),
  city: trimmed(60).optional(),
  area: trimmed(120).optional(),
  address: trimmed(200).optional(),
  universities: z.array(z.string().trim().max(60)).max(10).optional(),
  gender: z.enum(['Male', 'Female', 'Mixed']).optional(),
  price: z.coerce.number().min(0).max(500000).optional(),
  priceMin: z.coerce.number().min(0).max(500000).optional(),
  priceMax: z.coerce.number().min(0).max(500000).optional(),
  securityDeposit: z.coerce.number().min(0).max(500000).optional(),
  rooms: z.array(roomSchema).max(10).optional(),
  description: trimmed(4000).optional(),
  facilities: z.array(z.string().trim().max(40)).max(40).optional(),
  rules: z.array(z.string().trim().max(160)).max(20).optional(),
  images: z.array(z.string().trim().max(300)).max(15).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  available: z.boolean().optional(),
  contact: z
    .object({
      name: trimmed(80).optional(),
      phone: trimmed(20).optional(),
      whatsapp: trimmed(20).optional(),
      email: trimmed(120).optional(),
    })
    .optional(),
});

// ─── Payment ────────────────────────────────────────────────────────────

export const paymentSchema = z.object({
  amount: z.coerce.number('Enter the amount you transferred').min(1, 'Enter the amount you transferred').max(1000000),
  method: z.enum(
    ['Bank Transfer', 'JazzCash', 'Easypaisa', 'Raast', 'Other'],
    'Choose how you paid'
  ),
  transactionRef: z
    .string()
    .trim()
    .min(3, 'Enter the transaction ID from your receipt')
    .max(80),
  paidAt: z.string().trim().min(1, 'When did you pay?'),
});

// ─── Bookings, reviews, profile ─────────────────────────────────────────

export const bookingResponseSchema = z.object({
  status: z.enum(['confirmed', 'rejected'], 'Choose confirm or decline'),
  message: z.string().trim().max(1000).optional(),
});

export const reviewReplySchema = z.object({
  reply: z
    .string()
    .trim()
    .min(5, 'Write at least a sentence')
    .max(1000, 'Keep your reply under 1000 characters'),
});

export const reviewReportSchema = z.object({
  reason: z.string().trim().min(10, 'Tell the moderators what is wrong with it').max(500),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  businessName: z.string().trim().max(120).optional().or(z.literal('')),
  phone: z.union([phone, z.literal('')]).optional(),
  city: z.string().trim().max(60).optional().or(z.literal('')),
  cnic: z
    .union([
      z.string().trim().regex(/^\d{5}-?\d{7}-?\d$/, 'CNIC looks like 35202-1234567-8'),
      z.literal(''),
    ])
    .optional(),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters')
      .max(72, 'Passwords are capped at 72 characters')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[0-9]/, 'Include a number'),
    confirmPassword: z.string().min(1, 'Repeat the new password'),
  })
  .superRefine((val, ctx) => {
    if (val.newPassword !== val.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
    }
    if (val.newPassword === val.currentPassword) {
      ctx.addIssue({ code: 'custom', path: ['newPassword'], message: 'Choose a different password' });
    }
  });

/**
 * Flattens a ZodError into `{ 'contact.phone': 'message' }` so a form can look
 * up an error by the same dotted path it uses for its state.
 */
export function fieldErrorsFrom(error) {
  const out = {};
  for (const issue of error?.issues || []) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Runs a schema and returns `{ ok, errors }` without throwing. */
export function validateWith(schema, value) {
  if (!schema) return { ok: true, errors: {} };
  const result = schema.safeParse(value);
  return result.success
    ? { ok: true, errors: {} }
    : { ok: false, errors: fieldErrorsFrom(result.error) };
}

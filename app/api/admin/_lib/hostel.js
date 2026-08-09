import { z } from 'zod';
import Hostel, { FACILITIES, HOSTEL_STATUSES, ROOM_TYPES } from '@/models/Hostel';
import { slugify } from '@/lib/utils';

const roomSchema = z.object({
  type: z.enum(ROOM_TYPES),
  price: z.coerce.number().min(0).max(1_000_000),
  capacity: z.coerce.number().int().min(1).max(20).default(1),
  available: z.coerce.number().int().min(0).max(500).default(0),
});

const contactSchema = z.object({
  name: z.string().trim().max(80).default(''),
  phone: z.string().trim().max(32).default(''),
  whatsapp: z.string().trim().max(32).default(''),
  email: z.union([z.literal(''), z.string().trim().email()]).default(''),
});

/** Mirrors models/Hostel.js so a bad payload never reaches Mongoose. */
export const hostelInput = z.object({
  name: z.string().trim().min(3, 'Give the listing a name').max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, 'Lowercase letters, numbers and dashes only')
    .optional()
    .default(''),

  city: z.string().trim().min(2, 'City is required').max(60),
  area: z.string().trim().max(200).default(''),
  address: z.string().trim().max(300).default(''),
  universities: z.array(z.string().trim().max(60)).max(20).default([]),
  gender: z.enum(['Male', 'Female', 'Mixed']).default('Male'),

  price: z.coerce.number().min(0, 'Price cannot be negative').max(1_000_000),
  priceMin: z.coerce.number().min(0).max(1_000_000).default(0),
  priceMax: z.coerce.number().min(0).max(1_000_000).default(0),
  rooms: z.array(roomSchema).max(10).default([]),
  securityDeposit: z.coerce.number().min(0).max(1_000_000).default(0),

  description: z.string().max(4000, 'Description is capped at 4000 characters').default(''),
  facilities: z.array(z.enum(FACILITIES)).max(FACILITIES.length).default([]),
  rules: z.array(z.string().trim().max(200)).max(30).default([]),

  images: z.array(z.string().trim().max(500)).max(30).default([]),

  lat: z.coerce.number().min(-90).max(90).default(0),
  lng: z.coerce.number().min(-180).max(180).default(0),

  contact: contactSchema.default({ name: '', phone: '', whatsapp: '', email: '' }),

  ownerId: z.union([z.literal(''), z.string().regex(/^[a-f0-9]{24}$/i)]).default(''),

  status: z.enum(HOSTEL_STATUSES).default('draft'),
  rejectionReason: z.string().trim().max(500).default(''),

  available: z.coerce.boolean().default(true),
  verified: z.coerce.boolean().default(false),
  featured: z.coerce.boolean().default(false),
});

/**
 * Finds a slug that is free, appending -2, -3 … when the preferred one is
 * taken. `excludeId` lets an edit keep its own slug.
 */
export async function uniqueSlug(preferred, excludeId) {
  const base = slugify(preferred) || 'hostel';
  let candidate = base;
  for (let i = 2; i < 200; i++) {
    const clash = await Hostel.exists({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (!clash) return candidate;
    candidate = `${base}-${i}`.slice(0, 80);
  }
  return `${base}-${Date.now()}`.slice(0, 80);
}

/**
 * Fills the derived fields the model expects but the form does not ask for,
 * so a listing saved from the admin console is stored in the same shape as
 * every other listing.
 */
export function normalizeHostel(data) {
  const roomPrices = (data.rooms || []).map((r) => Number(r.price) || 0).filter(Boolean);
  const priceMin = data.priceMin || (roomPrices.length ? Math.min(...roomPrices) : data.price);
  const priceMax = data.priceMax || (roomPrices.length ? Math.max(...roomPrices) : data.price);

  return {
    ...data,
    priceMin,
    priceMax: Math.max(priceMin, priceMax),
    universities: [...new Set((data.universities || []).filter(Boolean))],
    facilities: [...new Set((data.facilities || []).filter(Boolean))],
    rules: (data.rules || []).map((r) => r.trim()).filter(Boolean),
    images: (data.images || []).filter(Boolean),
    ownerId: data.ownerId || null,
  };
}

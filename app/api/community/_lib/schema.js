import { z } from 'zod';
import { ASK_TOPIC_VALUES } from '@/models/AskThread';
import { NOTICE_TYPES } from '@/models/NoticePost';
import {
  CONDITIONS,
  LOST_DIRECTIONS,
  MEALS,
  MESS_REASONS,
} from '@/components/community/notice-types';

/** Empty string from an untouched input means "not given", never zero. */
const optionalAmount = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().int().min(0).max(1_000_000).optional()
);

const amount = z.coerce.number().int().min(0).max(1_000_000);

const text = (max) => z.string().trim().min(1).max(max);
const optionalText = (max) =>
  z.preprocess((v) => (v === null || v === undefined ? '' : v), z.string().trim().max(max));

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Not a valid id');

// ─── Ask residents ──────────────────────────────────────────────────────

export const askCreateSchema = z.object({
  hostelSlug: z.string().trim().min(1).max(140),
  // Twelve characters is about the shortest real question ("wifi ok?" is not
  // one). Two hundred is the point at which it stops being a question.
  question: z
    .string()
    .trim()
    .min(12, 'Write the question out in full')
    .max(200, 'Keep it to one question')
    .refine((q) => (q.match(/\?/g) || []).length <= 1, {
      message: 'Ask one question at a time. A list of six does not get answered',
    }),
  topic: z.enum(ASK_TOPIC_VALUES).default('other'),
});

export const answerCreateSchema = z.object({
  body: z
    .string()
    .trim()
    .min(4, 'An answer needs a few words')
    .max(1200, 'That is longer than an answer needs to be'),
});

export const flagSchema = z.object({
  reason: z.string().trim().max(200).default(''),
});

export const idSchema = objectId;

// ─── Notice board ───────────────────────────────────────────────────────

/**
 * One schema per type. Written out rather than generated from the field
 * declarations, because the validation is the security boundary and it should
 * be readable on its own without running a generator in your head.
 */
const DETAIL_SCHEMAS = {
  ride: z.object({
    destination: text(60),
    leavingAt: z.coerce.date(),
    pickup: optionalText(60),
    seats: z.coerce.number().int().min(1).max(6),
    costEach: optionalAmount,
  }),

  room: z.object({
    roomLabel: text(24),
    freeFrom: z.coerce.date(),
    rent: optionalAmount,
    depositTransfers: z.boolean().default(false),
  }),

  selling: z.object({
    item: text(60),
    price: amount,
    condition: z.enum(CONDITIONS),
  }),

  mess: z.object({
    reason: z.enum(MESS_REASONS),
    onDate: z.coerce.date(),
    meals: z.array(z.enum(MEALS)).min(1, 'Say which meals'),
    note: optionalText(120),
  }),

  lost: z.object({
    direction: z.enum(LOST_DIRECTIONS),
    item: text(60),
    place: optionalText(60),
  }),
};

export const noticeEnvelopeSchema = z.object({
  hostelSlug: z.string().trim().min(1).max(140),
  type: z.enum(NOTICE_TYPES),
  room: z.string().trim().max(24).default(''),
  details: z.record(z.string(), z.unknown()).default({}),
});

export function parseNoticeDetails(type, raw) {
  const schema = DETAIL_SCHEMAS[type];
  if (!schema) {
    const err = new Error('That is not a post type');
    err.status = 400;
    throw err;
  }
  return schema.parse(raw || {});
}

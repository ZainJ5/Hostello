import { formatPKR } from '@/lib/utils';

/**
 * The five notice board post types, their fields, the sentence a reader sees
 * and the rule that decides when the post stops being true.
 *
 * There is no free text composer anywhere in this file. A student picks a type
 * and fills that type's fields; the headline and the detail line are composed
 * here from those fields. Two consequences worth stating: a post can never be
 * an essay, and the wording of every post already on the board improves the
 * day this file is edited, with no migration.
 *
 * Two fields are short labelled text: the thing you are selling, and the place
 * you lost something. A sixty character box labelled "What are you selling" is
 * not a composer, and there is nowhere on the board to write a paragraph.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Local end of the calendar day a date falls in. */
function endOfDay(value) {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
}

function fmtDay(value) {
  return new Date(value).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'long',
  });
}

function fmtShortDay(value) {
  return new Date(value).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
  });
}

function fmtTime(value) {
  return new Date(value).toLocaleTimeString('en-PK', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
}

/** Number of whole calendar days between two dates, by local midnight. */
function dayGap(value, now) {
  const a = new Date(value);
  a.setHours(0, 0, 0, 0);
  const b = new Date(now);
  b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / DAY);
}

/** "today", "tomorrow", "on 14 Sep" */
function dayPhrase(value, now = new Date()) {
  const gap = dayGap(value, now);
  if (gap === 0) return 'today';
  if (gap === 1) return 'tomorrow';
  if (gap === -1) return 'yesterday';
  return `on ${fmtShortDay(value)}`;
}

/** "tomorrow at 7:40" */
function whenPhrase(value, now = new Date()) {
  return `${dayPhrase(value, now)} at ${fmtTime(value)}`;
}

function sentences(parts) {
  return parts.filter(Boolean).join(' ');
}

function joinAnd(list) {
  const items = list.filter(Boolean);
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export const MEALS = ['Breakfast', 'Lunch', 'Dinner'];
export const CONDITIONS = ['New', 'Barely used', 'Used', 'Well used'];
export const MESS_REASONS = [
  'Mess is off',
  'Kitchen is closed',
  'Menu has changed',
  'Timing has changed',
];
export const LOST_DIRECTIONS = ['Lost', 'Found'];

/**
 * Field kinds the composer knows how to render. Keeping the form declarative
 * means a sixth type could never accidentally ship a blank textarea: it would
 * have to declare fields like every other type.
 */
export const NOTICE_TYPE_LIST = [
  {
    value: 'ride',
    filter: 'Rides',
    badge: 'Sharing a ride',
    picker: 'I am sharing a ride',
    pickerHint: 'A rickshaw or a car to campus, with seats to fill.',
    lifetime: 'A ride goes two hours after it leaves.',
    fields: [
      {
        name: 'destination',
        label: 'Where are you going',
        kind: 'text',
        required: true,
        maxLength: 60,
        placeholder: 'FJWU',
      },
      { name: 'leavingAt', label: 'Leaving at', kind: 'datetime', required: true },
      {
        name: 'pickup',
        label: 'Picking up from',
        kind: 'text',
        maxLength: 60,
        placeholder: 'the gate',
      },
      { name: 'seats', label: 'Seats free', kind: 'number', required: true, min: 1, max: 6 },
      { name: 'costEach', label: 'Split per person', kind: 'number', min: 0, suffix: 'PKR' },
    ],
    compose(d, now) {
      const headline = `Ride to ${d.destination} ${whenPhrase(d.leavingAt, now)}`;
      const detail = sentences([
        d.pickup ? `Leaving from ${d.pickup}.` : null,
        d.seats ? `${d.seats} ${d.seats === 1 ? 'seat' : 'seats'}.` : null,
        d.costEach ? `Split is about ${formatPKR(d.costEach)} each.` : null,
      ]);
      return { headline, detail };
    },
    // A ride is dead two hours after it leaves. Nothing on this board goes
    // stale faster, which is why the board needs an expiry at all.
    expiry: (d) => new Date(new Date(d.leavingAt).getTime() + 2 * 60 * 60 * 1000),
    maxAheadDays: 7,
  },

  {
    value: 'room',
    filter: 'Rooms',
    badge: 'Room going free',
    picker: 'A bed is coming free',
    pickerHint: 'You are moving out and somebody could take your place.',
    lifetime: 'A room goes on the date it comes free.',
    fields: [
      {
        name: 'roomLabel',
        label: 'Room',
        kind: 'text',
        required: true,
        maxLength: 24,
        placeholder: '2A',
      },
      { name: 'freeFrom', label: 'Free from', kind: 'date', required: true },
      { name: 'rent', label: 'Monthly rent', kind: 'number', min: 0, suffix: 'PKR' },
      {
        name: 'depositTransfers',
        label: 'The deposit transfers to whoever takes it',
        kind: 'checkbox',
      },
    ],
    compose(d) {
      const headline = `Bed in Room ${d.roomLabel} from ${fmtDay(d.freeFrom)}`;
      const detail = sentences([
        d.rent ? `Rent is ${formatPKR(d.rent)}.` : null,
        d.depositTransfers ? 'The deposit transfers.' : null,
      ]);
      return { headline, detail };
    },
    expiry: (d) => endOfDay(d.freeFrom),
    maxAheadDays: 180,
  },

  {
    value: 'selling',
    filter: 'Selling',
    badge: 'Selling something',
    picker: 'I am selling something',
    pickerHint: 'A kettle, a lamp, a mattress you are not taking with you.',
    lifetime: 'Anything for sale goes after two weeks.',
    fields: [
      {
        name: 'item',
        label: 'What are you selling',
        kind: 'text',
        required: true,
        maxLength: 60,
        placeholder: 'Study lamp and a kettle',
      },
      { name: 'price', label: 'Price', kind: 'number', required: true, min: 0, suffix: 'PKR' },
      { name: 'condition', label: 'Condition', kind: 'select', required: true, options: CONDITIONS },
    ],
    compose(d) {
      return {
        headline: d.item,
        detail: sentences([
          d.condition ? `${d.condition}.` : null,
          Number.isFinite(d.price) ? `${formatPKR(d.price)}.` : null,
        ]),
      };
    },
    expiry: () => new Date(Date.now() + 14 * DAY),
  },

  {
    value: 'mess',
    filter: 'Mess',
    badge: 'Mess notice',
    picker: 'Something is different at the mess',
    pickerHint: 'The mess is off, the timing moved, the menu changed.',
    lifetime: 'A mess notice goes at midnight on the day it is about.',
    fields: [
      { name: 'reason', label: 'What has changed', kind: 'select', required: true, options: MESS_REASONS },
      { name: 'onDate', label: 'Which day', kind: 'date', required: true },
      { name: 'meals', label: 'Which meals', kind: 'multiselect', required: true, options: MEALS },
      {
        name: 'note',
        label: 'Anything else worth saying',
        kind: 'text',
        maxLength: 120,
        placeholder: 'The kitchen on the ground floor is open',
      },
    ],
    compose(d, now) {
      const headline = `${d.reason} ${dayPhrase(d.onDate, now)}`;
      const meals = joinAnd(d.meals || []);
      return {
        headline,
        detail: sentences([meals ? `${meals}.` : null, d.note ? `${d.note}.` : null]),
      };
    },
    expiry: (d) => endOfDay(d.onDate),
    maxAheadDays: 30,
  },

  {
    value: 'lost',
    filter: 'Lost',
    badge: 'Lost or found',
    picker: 'I lost or found something',
    pickerHint: 'The most common thing on a real hostel board.',
    lifetime: 'A lost or found notice goes after a week.',
    fields: [
      {
        name: 'direction',
        label: 'Lost or found',
        kind: 'select',
        required: true,
        options: LOST_DIRECTIONS,
      },
      {
        name: 'item',
        label: 'What is it',
        kind: 'text',
        required: true,
        maxLength: 60,
        placeholder: 'A blue water bottle',
      },
      {
        name: 'place',
        label: 'Where',
        kind: 'text',
        maxLength: 60,
        placeholder: 'the study room',
      },
    ],
    compose(d) {
      const headline = `${d.direction}: ${d.item}`;
      let detail = '';
      if (d.place) {
        detail = d.direction === 'Found' ? `Left at ${d.place}.` : `Last seen near ${d.place}.`;
      }
      return { headline, detail };
    },
    expiry: () => new Date(Date.now() + 7 * DAY),
  },
];

export const NOTICE_TYPE_MAP = Object.fromEntries(
  NOTICE_TYPE_LIST.map((t) => [t.value, t])
);

/** Chips above the board. "Everything" is not a type, it is the absence of one. */
export const NOTICE_FILTERS = [
  { value: '', label: 'Everything' },
  ...NOTICE_TYPE_LIST.map((t) => ({ value: t.value, label: t.filter })),
];

export function noticeTypeDef(type) {
  return NOTICE_TYPE_MAP[type] || null;
}

/** The server side expiry rule. The client never sends an expiry. */
export function expiryFor(type, details) {
  const def = noticeTypeDef(type);
  if (!def) return null;
  const at = def.expiry(details || {});
  return at instanceof Date && !Number.isNaN(at.getTime()) ? at : null;
}

/** Badge, headline and detail line for one post. */
export function composeNotice(post, now = new Date()) {
  const def = noticeTypeDef(post?.type);
  if (!def) return { badge: '', headline: '', detail: '' };
  const { headline, detail } = def.compose(post.details || {}, now);
  return { badge: def.badge, headline: headline || '', detail: detail || '' };
}

/**
 * How long this post has left, in the board's own voice. Computed on the
 * server and passed down as a string, so the value cannot differ between the
 * server render and the first client render.
 */
export function expiryLabel(expiresAt, now = new Date()) {
  const end = new Date(expiresAt);
  const ms = end.getTime() - new Date(now).getTime();
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'gone';

  const mins = Math.round(ms / 60000);
  if (mins < 60) return `gone in ${mins} min`;

  const endsAtMidnight = end.getHours() === 23 && end.getMinutes() === 59;
  if (endsAtMidnight && dayGap(end, now) === 0) return 'expires at midnight';

  const hours = Math.round(ms / 3600000);
  if (hours < 48) return `gone in ${hours} h`;

  const days = Math.round(ms / DAY);
  if (days <= 14) return `expires in ${days} d`;

  return `expires ${fmtShortDay(end)}`;
}

/** The sentence under the board explaining why it keeps emptying. */
export const BOARD_LIFETIMES = NOTICE_TYPE_LIST.map((t) => t.lifetime);

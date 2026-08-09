/**
 * The six questions, their options and the rules for comparing two answers.
 *
 * Pure data and pure functions only. No mongoose, no server imports: the
 * questionnaire is a client component and the pipeline builder is a server
 * module, and both read this file.
 *
 * Every option carries a `value`, which is its place on that question's own
 * line from low to high. Comparison is one subtraction, which is what lets the
 * whole score be computed inside the database.
 *
 * The display order is NOT the value order on every question, and that is
 * deliberate. "How often do friends come over?" reads Rarely, Weekends, Most
 * days, I would rather nobody did, because that is the order a student scans;
 * on the line, "I would rather nobody did" is the low end. Keeping the two
 * apart is the difference between a scale that means something and a list of
 * radio buttons in the order somebody typed them.
 */

/**
 * The escape hatch for options that are not a point on the line at all. A
 * flexible answer reads as close to everything and equal to nothing except
 * another flexible answer.
 */
export const FLEX = 9;

/** Fixed order. The strip reads left to right in exactly this order, always. */
export const AXES = ['sleep', 'clean', 'study', 'guests', 'smoke', 'noise'];

export const QUESTIONS = [
  {
    axis: 'sleep',
    short: 'sleep',
    title: 'Sleep',
    label: 'How late do you usually go to sleep?',
    options: [
      { value: 0, label: 'Before 11', both: 'Both before 11' },
      { value: 1, label: 'Between 11 and 1', both: 'Both between 11 and 1' },
      { value: 2, label: 'After 1', both: 'Both after 1' },
      {
        value: FLEX,
        label: 'It changes week to week',
        both: 'It changes week to week for both of you',
      },
    ],
  },
  {
    axis: 'clean',
    short: 'clean',
    title: 'Clean',
    label: 'How often do you tidy your own side?',
    options: [
      { value: 0, label: 'Every day', both: 'Both tidy up daily' },
      { value: 1, label: 'Once or twice a week', both: 'Both tidy once or twice a week' },
      { value: 2, label: 'When it gets bad', both: 'Both tidy when it gets bad' },
      { value: 3, label: 'I am honestly messy', both: 'Both honestly messy' },
    ],
  },
  {
    axis: 'study',
    short: 'study',
    title: 'Study',
    /**
     * The line here is how much of the studying happens in the room, because
     * that is the part a roommate feels. The library answer sits at the low
     * end; a desk and a bed are next to each other, since both keep a light on
     * after midnight.
     */
    label: 'Where do you study?',
    options: [
      { value: 2, label: 'At a desk in the room', both: 'Both at a desk, not in bed' },
      { value: 3, label: 'In bed', both: 'Both study in bed' },
      { value: 0, label: 'In the library, not the room', both: 'Both study out of the room' },
      {
        value: FLEX,
        label: 'Wherever there is space',
        both: 'Both study wherever there is space',
      },
    ],
  },
  {
    axis: 'guests',
    short: 'guests',
    title: 'Guests',
    label: 'How often do friends come over?',
    options: [
      { value: 1, label: 'Rarely', both: 'Both rarely have friends over' },
      { value: 2, label: 'Weekends', both: 'Both have friends over at weekends' },
      { value: 3, label: 'Most days', both: 'Both have friends over most days' },
      {
        value: 0,
        label: 'I would rather nobody did',
        both: 'Neither of you wants friends over',
      },
    ],
  },
  {
    axis: 'smoke',
    short: 'smoke',
    title: 'Smoke',
    label: 'Does anybody in the room smoke?',
    options: [
      {
        value: 0,
        label: 'No, and I would rather nobody did',
        both: 'Neither of you, and neither of you wants it',
      },
      { value: 1, label: 'No, but I do not mind', both: 'Neither of you' },
      { value: 2, label: 'Yes, outside only', both: 'Both smoke, outside only' },
      { value: 3, label: 'Yes', both: 'Both smoke' },
    ],
  },
  {
    axis: 'noise',
    short: 'noise',
    title: 'Noise',
    label: 'How much noise is alright after 11?',
    options: [
      { value: 0, label: 'Silence', both: 'Both want silence after 11' },
      {
        value: 1,
        label: 'Headphones and quiet talking',
        both: 'Both fine with headphones and quiet talking',
      },
      { value: 2, label: 'Normal talking is fine', both: 'Both fine with normal talking' },
      { value: 3, label: 'I sleep through anything', both: 'Both sleep through anything' },
    ],
  },
];

export const QUESTION_BY_AXIS = Object.fromEntries(QUESTIONS.map((q) => [q.axis, q]));

export function optionFor(axis, value) {
  const q = QUESTION_BY_AXIS[axis];
  if (!q || typeof value !== 'number') return null;
  return q.options.find((o) => o.value === value) || null;
}

/** True when the value is one this question actually offers. */
export function isValidAnswer(axis, value) {
  return Boolean(optionFor(axis, value));
}

/**
 * Three levels, and only three.
 *
 *   2  match, the same answer
 *   1  close, one step apart, or one of the two is flexible
 *   0  clash, two or more steps apart
 *
 * Buckets rather than a raw distance, on purpose. A raw distance plus your own
 * answer would often pin down the other student's answer exactly, and their
 * answers are the one thing this feature never discloses. Three buckets keeps
 * the strip meaningful and keeps most of that inference off the table. See the
 * note in components/roommates/query.js for what is still inferable.
 */
export const LEVEL_MATCH = 2;
export const LEVEL_CLOSE = 1;
export const LEVEL_CLASH = 0;

export function levelName(level) {
  if (level === LEVEL_MATCH) return 'Match';
  if (level === LEVEL_CLOSE) return 'Close';
  return 'Clash';
}

/**
 * Compares two answers on one axis. Used on the client only for previewing a
 * comparison the server already computed; the real scoring runs in Mongo.
 */
export function compareAnswers(mine, theirs) {
  if (typeof mine !== 'number' || typeof theirs !== 'number') return LEVEL_CLASH;
  if (mine === FLEX && theirs === FLEX) return LEVEL_MATCH;
  if (mine === FLEX || theirs === FLEX) return LEVEL_CLOSE;
  const gap = Math.abs(mine - theirs);
  if (gap === 0) return LEVEL_MATCH;
  if (gap === 1) return LEVEL_CLOSE;
  return LEVEL_CLASH;
}

/**
 * The sentence beside one axis on a match page.
 *
 * A match may echo the answer, because on a match their answer is your answer
 * and you already know it. Close and clash may not: they name your own answer
 * and the distance, and never a word about what the other student picked.
 */
export function axisSentence({ axis, level, myValue, firstName }) {
  const option = optionFor(axis, myValue);
  const who = firstName || 'They';
  if (!option) return '';
  if (level === LEVEL_MATCH) return option.both;
  const mine = `You said ${lowerFirst(option.label)}.`;
  if (level === LEVEL_CLOSE) return `${mine} ${who} answered next to that, not the same.`;
  return `${mine} ${who} answered a good way from that.`;
}

function lowerFirst(s) {
  const text = String(s || '');
  if (!text) return text;
  // "I am honestly messy" and "I would rather nobody did" keep their capital I.
  if (text.startsWith('I ')) return text;
  return text[0].toLowerCase() + text.slice(1);
}

const COUNT_WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'All six'];

/** "Four match. Close on noise, clash on guests." */
export function compatSummary(axes) {
  if (!axes) return '';
  const matched = AXES.filter((a) => axes[a] === LEVEL_MATCH);
  const close = AXES.filter((a) => axes[a] === LEVEL_CLOSE);
  const clash = AXES.filter((a) => axes[a] === LEVEL_CLASH);

  const head =
    matched.length === 6
      ? 'All six match.'
      : matched.length === 0
        ? 'None of the six match.'
        : `${COUNT_WORDS[matched.length]} match.`;

  const tail = [];
  if (close.length) tail.push(`Close on ${joinWords(close)}`);
  if (clash.length) tail.push(`clash on ${joinWords(clash)}`);
  if (!tail.length) return head;
  return `${head} ${tail.join(', ')}.`;
}

function joinWords(list) {
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/** The words under a compatibility strip that has no room for a sentence. */
export function compatAria(axes) {
  const matched = AXES.filter((a) => axes?.[a] === LEVEL_MATCH).length;
  return `Compatibility: ${matched} of six answers line up. ${compatSummary(axes)}`;
}

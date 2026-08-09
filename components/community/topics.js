/**
 * The six questions students ask most about a hostel, which are the six
 * segments of the answer coverage strip.
 *
 * THIS FILE IS THE SOURCE AND IT IMPORTS NOTHING. `models/AskThread.js` reads
 * its enum from here rather than the other way round, because the ask form is
 * a client component and an import back into the model would drag Mongoose,
 * and every Node builtin it touches, into the browser bundle.
 *
 * The set is fixed rather than derived from what has been asked, because the
 * strip has to mean the same thing on every listing: a listing with two of six
 * answered and a listing with five of six answered have to be comparable at a
 * glance. A vocabulary that grew with the questions would make the strip a
 * picture of how chatty a listing is instead of how well it is documented.
 *
 * `other` is not in the strip. It exists so a real question is never bent into
 * the wrong bucket just to make the drawing look fuller.
 */
export const TOPICS = [
  { value: 'water', strip: 'water', question: 'Water and bathrooms', open: 'water' },
  { value: 'power', strip: 'power', question: 'Power and load shedding', open: 'power' },
  { value: 'mess', strip: 'mess', question: 'Mess and food', open: 'the mess' },
  { value: 'safety', strip: 'safety', question: 'Safety and gate timing', open: 'safety' },
  { value: 'wifi', strip: 'wifi', question: 'Wifi and study space', open: 'wifi' },
  { value: 'owner', strip: 'owner', question: 'The owner and the deposit', open: 'the owner' },
];

/** The six, as stored. The model's enum is built from this plus `other`. */
export const TOPIC_VALUES = TOPICS.map((t) => t.value);

export const TOPIC_OPTIONS = [
  ...TOPICS.map((t) => ({ value: t.value, label: t.question })),
  { value: 'other', label: 'Something else' },
];

export function topicLabel(value) {
  const found = TOPICS.find((t) => t.value === value);
  return found ? found.question : 'Something else';
}

const WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'All six'];

/** "water, wifi and the owner" */
function listPhrase(names) {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function sentenceCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Turns the set of topics that have at least one published answer into the six
 * segment strip and the sentence underneath it.
 *
 * The empty case is the day one case on every listing and it says so plainly.
 * It never pretends a listing is documented when nobody has answered anything.
 */
export function answerCoverage(answeredTopics) {
  const answered = new Set(
    (answeredTopics || []).filter((t) => TOPIC_VALUES.includes(t))
  );

  const segments = TOPICS.map((t) => ({
    value: t.value,
    label: t.strip,
    answered: answered.has(t.value),
  }));

  const open = TOPICS.filter((t) => !answered.has(t.value));
  const count = TOPICS.length - open.length;

  let caption;
  if (count === 0) {
    caption =
      'None of the six questions students ask most have been answered here yet.';
  } else if (open.length === 0) {
    caption = 'All six of the questions students ask most are answered.';
  } else {
    const verb = count === 1 ? 'is' : 'are';
    const openVerb = open.length === 1 ? 'is' : 'are';
    caption =
      `${WORDS[count]} of the six questions students ask most ${verb} answered. ` +
      `${sentenceCase(listPhrase(open.map((t) => t.open)))} ${openVerb} still open.`;
  }

  return { segments, count, total: TOPICS.length, caption };
}

import crypto from 'crypto';
import { slugify } from '@/lib/utils';
import { publicName } from '@/components/community/identity';
import { composeNotice, expiryLabel } from '@/components/community/notice-types';

/**
 * Every community route returns one of these shapes and never a Mongoose
 * document. A raw document would carry `__v`, the full author name, flag
 * counts and the ObjectId of everybody who has touched it, and it would do so
 * by default rather than by decision.
 *
 * Name minimisation happens here rather than in a component, so no route can
 * leak a full name by rendering the wrong thing.
 */

/** Strips punctuation and case so the same question twice is one thread. */
export function questionKey(question) {
  return String(question || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A readable, permanent URL segment. The question supplies the words, which is
 * what makes the URL worth indexing, and six random hex characters guarantee
 * uniqueness without leaking the document id or the order it was created in.
 */
export function makeThreadSlug(question) {
  const base = slugify(question).slice(0, 60).replace(/-+$/, '') || 'question';
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

export function shapeAnswer(answer) {
  return {
    id: String(answer._id),
    body: answer.body,
    authorId: String(answer.authorId),
    author: publicName(answer.authorName),
    createdAt: answer.createdAt ? new Date(answer.createdAt).toISOString() : null,
  };
}

/**
 * Threads carry a `published` view of their answers. Flagged and removed
 * answers are dropped here, not in the query, because they live inside the
 * document and Mongo would otherwise hand back the whole array.
 */
export function shapeThread(thread, { withAnswers = true } = {}) {
  const answers = (thread.answers || []).filter((a) => a.status === 'published');

  return {
    id: String(thread._id),
    slug: thread.threadSlug,
    hostelSlug: thread.hostelSlug,
    hostelName: thread.hostelName || '',
    question: thread.question,
    topic: thread.topic,
    askedBy: publicName(thread.askedByName),
    answerCount: answers.length,
    nudgeCount: thread.nudgeCount || 0,
    createdAt: thread.createdAt ? new Date(thread.createdAt).toISOString() : null,
    lastAnswerAt: thread.lastAnswerAt ? new Date(thread.lastAnswerAt).toISOString() : null,
    href: `/hostels/${thread.hostelSlug}/ask/${thread.threadSlug}`,
    ...(withAnswers ? { answers: answers.map(shapeAnswer) } : {}),
  };
}

export function shapeNotice(notice, now = new Date()) {
  const composed = composeNotice(notice, now);
  return {
    id: String(notice._id),
    type: notice.type,
    badge: composed.badge,
    headline: composed.headline,
    detail: composed.detail,
    author: publicName(notice.authorName),
    authorId: String(notice.authorId),
    room: notice.authorRoom || '',
    expiresAt: notice.expiresAt ? new Date(notice.expiresAt).toISOString() : null,
    expiryLabel: expiryLabel(notice.expiresAt, now),
    createdAt: notice.createdAt ? new Date(notice.createdAt).toISOString() : null,
  };
}

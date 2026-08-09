'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import { TextArea, TextField } from '@/components/content/Fields';
import { Callout } from '@/components/content/Blocks';
import { MIN_REVIEW_LENGTH, REVIEW_SUBSCORES } from '@/components/student/constants';
import { cn } from '@/lib/utils';
import RatingScale from './RatingScale';

/**
 * Write or edit a review, as a page rather than a drawer.
 *
 * The account area already has a drawer version of this form. This one exists
 * because the design gives writing a review its own frame with its own URL,
 * which is the right call: a review is the longest thing a student writes on
 * this site, and a drawer that can be dismissed by a stray tap is the wrong
 * container for it. A page also means the half written state survives a back
 * button and the URL can be sent to somebody.
 *
 * Eligibility is NOT decided here. The server refuses a review from anybody
 * without a confirmed or completed enquiry, and the page above this one has
 * already asked. This form only ever renders for somebody who is allowed to
 * write, and the API stays the thing that enforces it.
 */

/** The five optional sub-scores, drawn as native selects for the platform picker. */
function SubScores({ values, onChange, disabled }) {
  return (
    <fieldset className="flex w-full flex-col gap-3">
      <legend className="ds-body-m-strong mb-1.5 text-ds-ink">
        Score the details{' '}
        <span className="ds-body-s text-ds-ink-muted">(optional)</span>
      </legend>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {REVIEW_SUBSCORES.map((s) => (
          <label key={s.key} className="flex flex-col gap-1.5">
            <span className="ds-body-s-strong text-ds-ink">{s.label}</span>
            <span className="flex rounded-ds-slot p-[var(--ds-focus-gap)] focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt">
              <select
                value={values[s.key]}
                disabled={disabled}
                onChange={(e) => onChange(s.key, e.target.value)}
                className={cn(
                  'ds-body-m h-[var(--ds-control-h)] w-full rounded-ds-inner border border-solid',
                  'border-ds-control bg-ds-surface-raised px-3 text-ds-ink',
                  'transition-colors duration-150 motion-reduce:transition-none',
                  'hover:border-ds-cobalt focus:outline-none',
                  disabled && 'cursor-not-allowed border-ds-hairline bg-ds-surface-sunken text-ds-ink-muted'
                )}
              >
                <option value="">Not rated</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} out of 5
                  </option>
                ))}
              </select>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function WriteReviewForm({ hostel, review, displayName }) {
  const router = useRouter();
  const editing = Boolean(review?._id);

  const [rating, setRating] = useState(review?.rating || 0);
  const [title, setTitle] = useState(review?.title || '');
  const [comment, setComment] = useState(review?.comment || '');
  const [scores, setScores] = useState(() =>
    Object.fromEntries(REVIEW_SUBSCORES.map((s) => [s.key, review?.[s.key] ?? '']))
  );

  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  function setScore(key, value) {
    setScores((s) => ({ ...s, [key]: value }));
  }

  function validate() {
    const next = {};
    if (!rating) next.rating = 'Pick a rating from one to five';
    if (comment.trim().length < MIN_REVIEW_LENGTH) {
      next.comment = `At least ${MIN_REVIEW_LENGTH} characters. What would you tell a friend?`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = { rating, title, comment, ...scores };
      if (!editing) payload.hostelId = String(hostel._id);

      const res = await fetch(editing ? `/api/reviews/${review._id}` : '/api/reviews', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.fieldErrors) {
          setErrors(
            Object.fromEntries(
              Object.entries(data.fieldErrors).map(([k, v]) => [k, v?.[0]])
            )
          );
        }
        throw new Error(data.error || 'Could not save your review');
      }

      setDone(true);
      // The listing average and the review list both change, so the cached
      // server render of the listing has to go.
      router.refresh();
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <Alert title={editing ? 'Your review is updated' : 'Your review is published'}>
          It is on {hostel.name} now, under your first name and the initial of your surname. The
          owner can reply once. Nobody, including the owner and including us, can delete it.
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button href={`/hostels/${hostel.slug}`}>Back to {hostel.name}</Button>
          <Button href="/reviews" variant="secondary">
            Read other reviews
          </Button>
        </div>
      </div>
    );
  }

  const remaining = MIN_REVIEW_LENGTH - comment.trim().length;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {error ? (
        <Alert tone="error" title="That did not save">
          {error}
        </Alert>
      ) : null}

      <RatingScale
        value={rating}
        onChange={(v) => {
          setRating(v);
          setErrors((e) => (e.rating ? { ...e, rating: undefined } : e));
        }}
        error={errors.rating}
        disabled={saving}
      />

      <TextArea
        label="What should the next student know?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        rows={6}
        disabled={saving}
        placeholder="Water pressure drops on the third floor after 8pm, so fill a bucket earlier. The warden actually answers at night, which mattered more than I expected. Mess breakfast is weak, lunch and dinner are good."
        error={errors.comment}
        hint={
          remaining > 0
            ? 'Specific beats general. Rent, deposit, water, power and how the owner behaved are the things people search for.'
            : `${comment.length} of 2000 characters`
        }
      />

      <TextField
        label="Headline"
        optional
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        disabled={saving}
        placeholder="Strict gate timing, and that is the point"
        hint="One line other students see first."
        error={errors.title}
      />

      <SubScores values={scores} onChange={setScore} disabled={saving} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={saving}>
          {editing ? 'Save this review' : 'Publish this review'}
        </Button>
        <Button href={`/hostels/${hostel.slug}`} variant="secondary">
          Cancel
        </Button>
      </div>

      <Callout title="This goes up under your first name and surname initial">
        {displayName ? `${displayName}. ` : ''}The owner can reply once and can never remove it.
        Hostello only removes a review if it names a private person or threatens somebody, and we
        say so publicly when we do.
      </Callout>
    </form>
  );
}

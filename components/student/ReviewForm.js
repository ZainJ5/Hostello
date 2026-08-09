'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import Drawer from './Drawer';
import StarInput from './StarInput';
import { MIN_REVIEW_LENGTH, REVIEW_SUBSCORES } from './constants';

const BLANK = {
  rating: 0,
  title: '',
  comment: '',
  cleanliness: '',
  food: '',
  security: '',
  location: '',
  valueForMoney: '',
};

function fromReview(review) {
  if (!review) return { ...BLANK };
  return {
    rating: review.rating || 0,
    title: review.title || '',
    comment: review.comment || '',
    cleanliness: review.cleanliness ?? '',
    food: review.food ?? '',
    security: review.security ?? '',
    location: review.location ?? '',
    valueForMoney: review.valueForMoney ?? '',
  };
}

/**
 * Write or edit a review. One component for both, because the fields are
 * identical and the only difference is the verb and the endpoint. Keeping
 * them together means the validation copy can't drift apart.
 *
 * The caller mounts this only while it is open and keys it by target, so the
 * form state is initialised from props at mount and never needs resetting.
 */
export default function ReviewForm({ open, onClose, hostel, review, onSaved }) {
  const editing = Boolean(review?._id);
  const [form, setForm] = useState(() => fromReview(review));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  function validate() {
    const next = {};
    if (!form.rating) next.rating = 'Pick a star rating';
    if (form.comment.trim().length < MIN_REVIEW_LENGTH) {
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
      const payload = {
        rating: form.rating,
        title: form.title,
        comment: form.comment,
        cleanliness: form.cleanliness,
        food: form.food,
        security: form.security,
        location: form.location,
        valueForMoney: form.valueForMoney,
      };
      if (!editing) payload.hostelId = String(hostel?._id || '');

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

      onSaved?.(data.review, { editing, hostel });
      onClose?.();
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const name = hostel?.name || review?.hostelId?.name || 'this hostel';
  const remaining = MIN_REVIEW_LENGTH - form.comment.trim().length;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Edit your review' : `Review ${name}`}
      description={
        editing
          ? 'Update your rating or rewrite what you said. The hostel average updates instantly.'
          : 'Honest, specific detail helps the next student more than anything else.'
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="review-form" variant="primary" loading={saving}>
            {editing ? 'Save changes' : 'Publish review'}
          </Button>
        </div>
      }
    >
      <form id="review-form" onSubmit={submit} className="space-y-5" noValidate>
        {error && (
          <Alert tone="danger" title="That didn't save">
            {error}
          </Alert>
        )}

        <StarInput
          name="rating"
          value={form.rating}
          onChange={(v) => set('rating', v)}
          required
          error={errors.rating}
        />

        <Input
          label="Headline"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          maxLength={120}
          placeholder="Clean rooms, great WiFi, strict gate timing"
          hint="Optional. One line other students will scan first."
          error={errors.title}
        />

        <Textarea
          label="Your review"
          required
          rows={6}
          value={form.comment}
          onChange={(e) => set('comment', e.target.value)}
          maxLength={2000}
          placeholder="What were the rooms, food, security and management actually like? Anything you wish you had known before moving in?"
          error={errors.comment}
          hint={
            remaining > 0
              ? `${remaining} more character${remaining === 1 ? '' : 's'} to go`
              : `${form.comment.length}/2000`
          }
        />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground">
            Score the details{' '}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {REVIEW_SUBSCORES.map((s) => (
              <Select
                key={s.key}
                label={s.label}
                value={form[s.key]}
                onChange={(e) => set(s.key, e.target.value)}
              >
                <option value="">Not rated</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </Select>
            ))}
          </div>
        </fieldset>
      </form>
    </Drawer>
  );
}

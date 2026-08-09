'use client';

import { useCallback, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * The details a match card and a match page are made of.
 *
 * A divergence from the Figma frame, and a necessary one. The questionnaire
 * frame carries the six questions and nothing else, but matching runs inside
 * one campus and one gender, so without those two fields the six answers have
 * nobody to be compared against. They are seeded from the account record when
 * it has them, so most students will find this section already filled in.
 *
 * Campus and gender are stored on the roommate profile rather than added to
 * the account model. `User` is out of scope for this work, and a roommate
 * profile should be able to say "match me at FJWU" whatever the account says.
 *
 * Autosaves like the rest of the page: selects on change, text on blur. No
 * save button anywhere on this screen.
 */

const FIELD =
  'ds-body-m ds-tap w-full rounded-ds-inner border border-solid border-ds-hairline bg-ds-surface-raised px-3 py-2 text-ds-ink placeholder:text-ds-ink-muted hover:border-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt';

function Row({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="ds-body-s-strong text-ds-ink">{label}</span>
      {children}
      {hint ? <span className="ds-body-s text-ds-ink-muted">{hint}</span> : null}
    </label>
  );
}

export default function ProfileDetails({ profile, campusNames, years, genders }) {
  const [values, setValues] = useState(() => ({
    campus: profile.campus || '',
    gender: profile.gender || '',
    year: profile.year || '',
    programme: profile.programme || '',
    note: profile.note || '',
    looking: profile.looking || '',
    contact: profile.contact || '',
  }));
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const token = useRef(0);

  const save = useCallback(async (patch) => {
    const mine = token.current + 1;
    token.current = mine;
    setState('saving');
    setError('');
    try {
      const res = await fetch('/api/roommates/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (token.current !== mine) return;
      if (!res.ok) throw new Error(data.error || 'That did not save');
      setState('saved');
    } catch (err) {
      if (token.current !== mine) return;
      setState('error');
      setError(err.message || 'That did not save');
    }
  }, []);

  const set = (key) => (event) => {
    const value = event.target.value;
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const commit = (key) => (event) => save({ [key]: event.target.value });

  const pick = (key) => (event) => {
    const value = event.target.value;
    setValues((prev) => ({ ...prev, [key]: value }));
    save({ [key]: value });
  };

  const missing = !values.campus || !values.gender;

  return (
    <section className="ds-elevated flex flex-col gap-4 rounded-ds-inner p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="ds-display-s text-ds-ink">About you</h2>
        <p
          className={cn('ds-body-s', state === 'error' ? 'text-ds-error' : 'text-ds-ink-muted')}
          aria-live="polite"
        >
          {state === 'saving'
            ? 'Saving'
            : state === 'saved'
              ? 'Saved'
              : state === 'error'
                ? 'Not saved'
                : ''}
        </p>
      </div>

      {missing ? (
        <p className="ds-body-s text-ds-ink-muted">
          Matching needs your campus and your gender. Nothing is suggested to anybody until both
          are set.
        </p>
      ) : null}

      {error ? <p className="ds-body-s text-ds-error">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Campus">
          <select className={FIELD} value={values.campus} onChange={pick('campus')}>
            <option value="">Not set</option>
            {campusNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Gender" hint="Matching only ever runs within one gender.">
          <select className={FIELD} value={values.gender} onChange={pick('gender')}>
            <option value="">Not set</option>
            {genders.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Year">
          <select className={FIELD} value={values.year} onChange={pick('year')}>
            <option value="">Not set</option>
            {years.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Programme">
          <input
            className={FIELD}
            value={values.programme}
            maxLength={60}
            onChange={set('programme')}
            onBlur={commit('programme')}
            placeholder="Software Engineering"
          />
        </Row>
      </div>

      <Row
        label="What you are looking for"
        hint="One line. It is the only thing on your card besides your name and year."
      >
        <input
          className={FIELD}
          value={values.looking}
          maxLength={90}
          onChange={set('looking')}
          onBlur={commit('looking')}
          placeholder="Looking at Fatima Jinnah Girls Hostel, budget up to PKR 20,000"
        />
      </Row>

      <Row
        label="A few words about you"
        hint="Shown to students on your campus. Your six answers are not."
      >
        <textarea
          className={cn(FIELD, 'min-h-24 resize-y')}
          value={values.note}
          maxLength={240}
          rows={3}
          onChange={set('note')}
          onBlur={commit('note')}
          placeholder="I keep my side tidy, I study at the desk, and I go home most weekends."
        />
      </Row>

      <Row
        label="How to reach you once an intro is accepted"
        hint="Optional, and only ever shown to somebody you have both accepted. Hostello has no chat."
      >
        <input
          className={FIELD}
          value={values.contact}
          maxLength={80}
          onChange={set('contact')}
          onBlur={commit('contact')}
          placeholder="A number, an email or a handle"
        />
      </Row>
    </section>
  );
}

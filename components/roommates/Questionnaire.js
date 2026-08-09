'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import MetaStrip from '@/components/roommates/MetaStrip';
import { AXES, QUESTIONS } from '@/components/roommates/questions';
import ProfileDetails from '@/components/roommates/ProfileDetails';

/**
 * Figma page/roommates-questionnaire 96:6099 and 96:6747.
 *
 * One page, not a stepper. Six questions, all visible, in a fixed order.
 *
 * There is no submit button, and the primary control at the bottom is a link
 * rather than a save. Every answer is written the moment it is picked, so a
 * student can close the tab on question three, come back on their phone
 * tomorrow, and find three answered. That promise is the reason the page reads
 * "Saved" beside each question rather than "unsaved changes" anywhere.
 *
 * The answers are never shown on a profile and no other student can read them.
 * That is enforced in the schema and in the matching pipeline, not here: this
 * component is the one place in the product allowed to render them at all,
 * because they belong to the person looking at the screen.
 */

const COUNT_WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six'];

/** 2 answered, 0 not. The coverage reading of the strip. */
function coverage(answers) {
  return AXES.map((axis) => (typeof answers[axis] === 'number' ? 2 : 0));
}

function statusLabel(state, answered) {
  if (state === 'saving') return 'Saving';
  if (state === 'error') return 'Not saved';
  if (state === 'saved') return 'Saved';
  return answered ? 'Saved' : 'Not answered';
}

export default function Questionnaire({ profile, savedWhen, campusNames, years, genders }) {
  const [answers, setAnswers] = useState(() => ({ ...profile.answers }));
  const [states, setStates] = useState({});
  const [when, setWhen] = useState(savedWhen || '');
  const [error, setError] = useState('');

  // One token per axis, so a fast second click on the same question cannot be
  // overtaken by the reply to the first.
  const tokens = useRef({});

  const answeredCount = useMemo(
    () => AXES.filter((axis) => typeof answers[axis] === 'number').length,
    [answers]
  );
  const complete = answeredCount === AXES.length;

  const choose = useCallback(
    async (axis, value) => {
      const previous = answers[axis];
      if (previous === value) return;

      const token = (tokens.current[axis] || 0) + 1;
      tokens.current[axis] = token;

      setAnswers((prev) => ({ ...prev, [axis]: value }));
      setStates((prev) => ({ ...prev, [axis]: 'saving' }));
      setError('');

      try {
        const res = await fetch('/api/roommates/answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ axis, value }),
        });
        const data = await res.json().catch(() => ({}));
        if (tokens.current[axis] !== token) return;
        if (!res.ok) throw new Error(data.error || 'That answer did not save');

        setStates((prev) => ({ ...prev, [axis]: 'saved' }));
        setWhen('just now');
      } catch (err) {
        if (tokens.current[axis] !== token) return;
        // Put the answer back rather than leaving the screen claiming
        // something the database does not hold.
        setAnswers((prev) => ({ ...prev, [axis]: previous ?? null }));
        setStates((prev) => ({ ...prev, [axis]: 'error' }));
        setError(err.message || 'That answer did not save. Check your connection and try again.');
      }
    },
    [answers]
  );

  const headline = complete
    ? `Saved. You answered all six${when ? ` ${when}` : ''}.`
    : answeredCount === 0
      ? 'Nothing answered yet'
      : `Saved. You answered ${COUNT_WORDS[answeredCount]} of six${when ? ` ${when}` : ''}.`;

  return (
    <div className="flex flex-col gap-6">
      {/* The answer coverage reading of the strip: six segments, one a question. */}
      <div className="ds-elevated flex flex-col gap-3 rounded-ds-inner p-4">
        {/* One live region for the whole page. Six of them, one per question,
            would announce a running commentary nobody asked for. */}
        <p className="ds-body-m-strong text-ds-ink" aria-live="polite">
          {headline}
        </p>
        <MetaStrip
          segments={coverage(answers)}
          labels={QUESTIONS.map((q) => q.short)}
          label={`Answer coverage: ${answeredCount} of six answered.`}
        />
        <p className="ds-body-s text-ds-ink-muted">
          Every answer saves the moment you pick it. Close this tab, refresh, come back on your
          phone tomorrow, and you land on this page with the same answers. There is no submit
          step to lose.
        </p>
      </div>

      {error ? (
        <Alert tone="error" title="That did not save">
          {error}
        </Alert>
      ) : null}

      <ProfileDetails
        profile={profile}
        campusNames={campusNames}
        years={years}
        genders={genders}
      />

      {QUESTIONS.map((question) => {
        const value = answers[question.axis];
        const answered = typeof value === 'number';
        const state = states[question.axis];

        return (
          <fieldset
            key={question.axis}
            className="ds-elevated flex min-w-0 flex-col gap-2 rounded-ds-inner p-4"
          >
            <legend className="sr-only">{question.label}</legend>

            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="ds-body-m-strong text-ds-ink" aria-hidden="true">
                {question.label}
              </p>
              <p
                className={cn(
                  'ds-body-s',
                  state === 'error' ? 'text-ds-error' : 'text-ds-ink-muted'
                )}
              >
                {statusLabel(state, answered)}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              {question.options.map((option) => {
                const checked = value === option.value;
                return (
                  <label
                    key={option.value}
                    className="group relative flex cursor-pointer items-center"
                  >
                    <input
                      type="radio"
                      name={question.axis}
                      value={String(option.value)}
                      checked={checked}
                      onChange={() => choose(question.axis, option.value)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        'ds-body-m ds-tap flex w-full items-center gap-3 rounded-ds-inner',
                        'border border-solid px-3 py-2 text-ds-ink',
                        'transition-colors duration-150 motion-reduce:transition-none',
                        'bg-ds-surface-raised hover:border-ds-cobalt active:bg-ds-surface-sunken',
                        checked ? 'border-ds-ink' : 'border-ds-hairline',
                        'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ds-cobalt'
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'size-4 shrink-0 rounded-ds-chip border border-solid',
                          checked ? 'border-ds-ink bg-ds-ink' : 'border-ds-control bg-ds-surface'
                        )}
                      />
                      <span>{option.label}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="ds-elevated flex flex-col gap-1 rounded-ds-inner p-4">
        <p className="ds-body-m-strong text-ds-ink">
          {complete ? 'All six answered' : 'Nothing happens until all six are answered'}
        </p>
        <p className="ds-body-s text-ds-ink-muted">
          Matching only runs inside your own campus and your own gender, and only between
          students who have both answered. Until then this page is a form you can leave open.
        </p>
      </div>

      {complete ? (
        <Button href="/roommates/matches" className="w-full">
          See who fits
        </Button>
      ) : (
        <Button disabled className="w-full">
          See who fits
        </Button>
      )}
    </div>
  );
}

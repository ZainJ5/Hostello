'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import { SelectInput, TextInput } from '@/components/auth/Field';
import { initials } from '@/lib/utils';
import { CITIES, GENDERS, UNIVERSITIES } from './constants';
import { useToast } from './Toast';

const INITIAL = { ok: false, error: '', fieldErrors: {} };

/** Keep a stored value our list doesn't contain, so saving can't wipe it. */
function withCurrent(list, current) {
  if (current && !list.includes(current)) return [current, ...list];
  return list;
}

/**
 * Profile details. `useActionState` keeps the pending flag, the inline field
 * errors and the success message on the same round trip, so there is no
 * separate loading state to fall out of sync with the request.
 *
 * The action is passed in from the page rather than imported, which keeps this
 * component free of any server-only module graph.
 *
 * The identity block at the top is the "what other students see" card from the
 * profile frame, with the parts the product does not hold left out: there is
 * no year of study, no course and no student email verification, so the card
 * shows the name, the university and the city, and nothing else.
 */
export default function ProfileForm({ user, action }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [name, setName] = useState(user.name || '');
  const [avatar, setAvatar] = useState(user.avatar || '');

  useEffect(() => {
    if (state?.ok) {
      toast({
        tone: 'success',
        title: 'Profile saved',
        description: 'Your details are up to date.',
      });
      router.refresh();
    }
  }, [state, toast, router]);

  const universities = useMemo(
    () => withCurrent(UNIVERSITIES, user.university),
    [user.university]
  );
  const cities = useMemo(() => withCurrent(CITIES, user.city), [user.city]);
  const errors = state?.fieldErrors || {};

  const subtitle = [user.university, user.city].filter(Boolean).join(', ');

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="How you appear"
        className="ds-elevated flex items-center gap-4 rounded-ds-inner p-4"
      >
        <span
          aria-hidden="true"
          className="ds-body-m-strong grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border border-solid border-ds-control bg-ds-surface-sunken text-ds-ink"
        >
          {avatar ? (
            // A plain img, not next/image: the value is a free text URL on any
            // host, so it cannot be run through the optimiser's allowlist.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            initials(name)
          )}
        </span>
        <div className="min-w-0">
          <p className="ds-display-s truncate text-ds-ink">{name || 'Your name'}</p>
          <p className="ds-body-s truncate text-ds-ink-muted">
            {subtitle || 'No university or city set yet'}
          </p>
        </div>
      </section>

      <form action={formAction} className="flex flex-col gap-5">
        {state?.error ? (
          <Alert tone="error" title="That did not save">
            {state.error}
          </Alert>
        ) : null}
        {state?.ok ? <Alert title={state.message || 'Profile saved'} /> : null}

        <TextInput
          label="Full name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={80}
          hint="This is what a hostel owner sees when you contact them."
          error={errors.name}
        />

        <TextInput
          label="Email address"
          value={user.email}
          readOnly
          hint="The address your account is on. It is never shown to an owner or another student."
        />

        <TextInput
          label="Phone"
          name="phone"
          type="tel"
          defaultValue={user.phone || ''}
          autoComplete="tel"
          placeholder="03xx xxxxxxx"
          hint="Shared with an owner only when you send them an enquiry."
          error={errors.phone}
        />

        <SelectInput
          label="University"
          name="university"
          defaultValue={user.university || ''}
          error={errors.university}
          hint="Every distance on the site is measured from this campus."
        >
          <option value="">Not set</option>
          {universities.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </SelectInput>

        <SelectInput
          label="City"
          name="city"
          defaultValue={user.city || ''}
          error={errors.city}
          hint="Used to suggest hostels when your campus has none nearby."
        >
          <option value="">Not set</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectInput>

        <SelectInput
          label="Gender"
          name="gender"
          defaultValue={user.gender || ''}
          error={errors.gender}
          hint="Lets us skip hostels that would turn you away at the gate."
        >
          <option value="">Prefer not to say</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </SelectInput>

        <TextInput
          label="Photo address"
          name="avatar"
          type="url"
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="https://"
          hint="Optional. Leave it blank to keep your initials."
          error={errors.avatar}
        />

        <Button type="submit" loading={pending} className="w-full sm:w-auto sm:self-start">
          Save changes
        </Button>
      </form>
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';

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
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  async function onPickFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;

    setAvatarError('');
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/account/avatar', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'That picture could not be saved');
      setAvatar(data.avatar || '');
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function onRemoveAvatar() {
    setAvatarError('');
    setUploading(true);
    try {
      const res = await fetch('/api/account/avatar', { method: 'DELETE' });
      if (!res.ok) throw new Error('That picture could not be removed');
      setAvatar('');
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setUploading(false);
    }
  }

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
        {/*
          The picture is cropped to a circle by the frame rather than by the
          file, so any aspect ratio a student uploads still reads as a portrait.
          `object-cover` fills the circle and centres the crop.
        */}
        <span
          aria-hidden="true"
          className="ds-display-s grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-solid border-ds-control bg-ds-surface-sunken text-ds-ink"
        >
          {avatar ? (
            // A plain img, not next/image. The file is written to
            // public/uploads/avatars and served straight off disk by NGINX, so
            // there is nothing for the optimiser to add here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            initials(name)
          )}
        </span>

        <div className="flex min-w-0 flex-col gap-2">
          <p className="ds-display-s truncate text-ds-ink">{name || 'Your name'}</p>
          <p className="ds-body-s truncate text-ds-ink-muted">
            {subtitle || 'No university or city set yet'}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <label
              className={cn(
                'ds-body-s-strong ds-tap inline-flex cursor-pointer items-center justify-center px-3',
                'rounded-ds-inner border border-solid border-ds-ink bg-ds-surface-raised text-ds-ink',
                'hover:border-ds-cobalt',
                'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ds-cobalt',
                uploading && 'cursor-not-allowed opacity-60'
              )}
            >
              {uploading ? 'Uploading' : avatar ? 'Change picture' : 'Upload a picture'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                disabled={uploading}
                onChange={onPickFile}
              />
            </label>

            {avatar ? (
              <button
                type="button"
                onClick={onRemoveAvatar}
                disabled={uploading}
                className="ds-body-s ds-tap inline-flex cursor-pointer items-center px-2 text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
              >
                Remove
              </button>
            ) : null}
          </div>

          <p className="ds-body-s text-ds-ink-muted">
            JPG, PNG, WebP or AVIF, up to 3 MB.
          </p>

          {avatarError ? (
            <p role="alert" className="ds-body-s text-ds-error">
              {avatarError}
            </p>
          ) : null}
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

        {/* The picture is uploaded on its own, above. This carries the saved
            path through the profile form so the server action keeps the value
            it already expects. */}
        <input type="hidden" name="avatar" value={avatar} />

        <Button type="submit" loading={pending} className="w-full sm:w-auto sm:self-start">
          Save changes
        </Button>
      </form>
    </div>
  );
}

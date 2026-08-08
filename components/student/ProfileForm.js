'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import { Alert, Avatar } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Field';
import { CITIES, GENDERS, UNIVERSITIES } from './constants';
import { useToast } from './Toast';

const INITIAL = { ok: false, error: '', fieldErrors: {} };

/** Keep a value the seed data carries but our list doesn't, so saving can't wipe it. */
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

  return (
    <Card>
      <CardHeader
        title="Your details"
        description="We prefill these on every booking request, and use your university and city to recommend hostels."
      />
      <CardBody>
        <form action={formAction} className="space-y-5">
          {state?.error && (
            <Alert tone="danger" title="That didn't save">
              {state.error}
            </Alert>
          )}
          {state?.ok && (
            <Alert tone="success">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4" aria-hidden="true" />
                {state.message || 'Profile saved'}
              </span>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Avatar name={name} src={avatar} size="lg" />
            <div className="min-w-0 flex-1">
              <Input
                label="Avatar image URL"
                name="avatar"
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://…"
                hint="Optional. Leave blank to keep your initials."
                error={errors.avatar}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Full name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={80}
              error={errors.name}
            />
            <Input
              label="Email"
              value={user.email}
              readOnly
              disabled
              hint="Contact support to change the email on your account."
            />
            <Input
              label="Phone"
              name="phone"
              type="tel"
              defaultValue={user.phone || ''}
              autoComplete="tel"
              placeholder="03xx xxxxxxx"
              hint="Shared with an owner only when you send them a request."
              error={errors.phone}
            />
            <Select
              label="Gender"
              name="gender"
              defaultValue={user.gender || ''}
              error={errors.gender}
              hint="Helps us skip hostels that would turn you away."
            >
              <option value="">Prefer not to say</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
            <Select
              label="University"
              name="university"
              defaultValue={user.university || ''}
              error={errors.university}
              hint="Drives your recommendations."
            >
              <option value="">Not set</option>
              {universities.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
            <Select
              label="City"
              name="city"
              defaultValue={user.city || ''}
              error={errors.city}
            >
              <option value="">Not set</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={pending}>
              Save changes
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

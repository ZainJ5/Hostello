'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Save, ShieldCheck } from 'lucide-react';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { CITIES } from './constants';
import { profileSchema, passwordSchema, validateWith } from './schemas';
import { useToast } from './Toast';
import { apiSend } from './api-client';

export default function ProfileForm({ profile }) {
  const router = useRouter();
  const toast = useToast();

  const [values, setValues] = useState({
    name: profile.name || '',
    businessName: profile.businessName || '',
    phone: profile.phone || '',
    city: profile.city || '',
    cnic: profile.cnic || '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  function setField(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function setPwField(key, value) {
    setPw((v) => ({ ...v, [key]: value }));
    setPwErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  async function saveProfile(event) {
    event.preventDefault();
    setFormError('');

    const check = validateWith(profileSchema, values);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }

    setSaving(true);
    try {
      await apiSend('/api/owner/profile', { method: 'PATCH', body: values });
      toast.success('Profile updated.');
      router.refresh();
    } catch (err) {
      setFormError(err.message);
      if (err.fieldErrors) setErrors(err.fieldErrors);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPwError('');
    setPwDone(false);

    const check = validateWith(passwordSchema, pw);
    if (!check.ok) {
      setPwErrors(check.errors);
      return;
    }

    setPwSaving(true);
    try {
      await apiSend('/api/owner/profile/password', { body: pw });
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwDone(true);
      toast.success('Password changed.');
    } catch (err) {
      setPwError(err.message);
      if (err.fieldErrors) setPwErrors(err.fieldErrors);
      toast.error(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
      <Card>
        <CardHeader
          title="Business details"
          description="Your business name is what students and admins see against your listings."
        />
        <form onSubmit={saveProfile} noValidate className="space-y-5 p-5 pt-4">
          <Input
            label="Your name"
            required
            value={values.name}
            onChange={(e) => setField('name', e.target.value)}
            error={errors.name}
            maxLength={80}
          />
          <Input
            label="Business name"
            value={values.businessName}
            onChange={(e) => setField('businessName', e.target.value)}
            error={errors.businessName}
            maxLength={120}
            placeholder="Jamshaid Hostels"
            hint="The name above your console and on your listings."
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Phone"
              type="tel"
              inputMode="tel"
              value={values.phone}
              onChange={(e) => setField('phone', e.target.value)}
              error={errors.phone}
              placeholder="+92 300 1234567"
            />
            <div>
              <Input
                label="City"
                list="profile-cities"
                value={values.city}
                onChange={(e) => setField('city', e.target.value)}
                error={errors.city}
                placeholder="Islamabad"
              />
              <datalist id="profile-cities">
                {CITIES.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </div>
          </div>

          <Input
            label="CNIC"
            value={values.cnic}
            onChange={(e) => setField('cnic', e.target.value)}
            error={errors.cnic}
            placeholder="35202-1234567-8"
            hint="Used only to verify you own the property. Never shown to students."
          />

          <div className="rounded-xl border border-border bg-surface-sunken p-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Account email
            </p>
            <p className="mt-1 text-sm font-medium break-all text-foreground">{profile.email}</p>
            <p className="mt-1 text-xs text-muted-foreground text-pretty">
              Changing your email needs re-verification — contact support and we will move it for
              you.
            </p>
          </div>

          {formError && <Alert tone="danger">{formError}</Alert>}

          <div className="flex justify-end border-t border-border pt-5">
            <Button type="submit" variant="primary" loading={saving}>
              <Save className="size-4" aria-hidden="true" />
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Password"
          description="You need your current password — that is what stops an open laptop becoming a lockout."
        />
        <form onSubmit={changePassword} noValidate className="space-y-5 p-5 pt-4">
          <Input
            label="Current password"
            type="password"
            required
            autoComplete="current-password"
            value={pw.currentPassword}
            onChange={(e) => setPwField('currentPassword', e.target.value)}
            error={pwErrors.currentPassword}
          />
          <Input
            label="New password"
            type="password"
            required
            autoComplete="new-password"
            value={pw.newPassword}
            onChange={(e) => setPwField('newPassword', e.target.value)}
            error={pwErrors.newPassword}
            hint="At least 8 characters, with an uppercase letter, a lowercase letter and a number."
          />
          <Input
            label="Repeat new password"
            type="password"
            required
            autoComplete="new-password"
            value={pw.confirmPassword}
            onChange={(e) => setPwField('confirmPassword', e.target.value)}
            error={pwErrors.confirmPassword}
          />

          {pwError && <Alert tone="danger">{pwError}</Alert>}
          {pwDone && (
            <Alert tone="success" title="Password changed">
              Use the new password next time you sign in.
            </Alert>
          )}

          <div className="flex justify-end border-t border-border pt-5">
            <Button type="submit" variant="primary" loading={pwSaving}>
              <KeyRound className="size-4" aria-hidden="true" />
              Change password
            </Button>
          </div>
        </form>

        <div className="border-t border-border p-5">
          <p className="flex items-start gap-2 text-xs text-muted-foreground text-pretty">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Hostello never asks for your password by email or on the phone. If someone does, it is
            not us.
          </p>
        </div>
      </Card>
    </div>
  );
}

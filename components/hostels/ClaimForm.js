'use client';

import { useRef, useState } from 'react';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import { ChoiceCard, ChoiceGroup, TextArea, TextField } from '@/components/content/Fields';
import { CLAIM_ROLES, MAX_CLAIM_PROOF, MIN_CLAIM_EVIDENCE } from '@/lib/claims';

/**
 * Claim a listing. Posts to `POST /api/claims`.
 *
 * AN ACCOUNT IS REQUIRED and the page says so before this renders, because a
 * claim hands somebody a listing and every enquiry that follows it. That is
 * the opposite of the report form next door, which takes no account on
 * purpose.
 *
 * PHOTOS UPLOAD AS THEY ARE PICKED rather than on submit. An owner on a phone
 * photographing a utility bill should find out immediately that the file was
 * too big, not after typing out the rest of the form.
 *
 * Client validation only names the fix. The server enforces the rules and its
 * field errors overwrite whatever this decided.
 */
export default function ClaimForm({ hostel }) {
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [evidence, setEvidence] = useState('');
  const [proof, setProof] = useState([]);

  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const fileInput = useRef(null);

  function validate() {
    const next = {};
    if (!role) next.role = 'Say what you are to this hostel';
    if (!phone.trim()) next.phone = 'The number students should call';
    if (evidence.trim().length < MIN_CLAIM_EVIDENCE) {
      next.evidence = `At least ${MIN_CLAIM_EVIDENCE} characters. What would show us this is yours?`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function addPhotos(event) {
    const picked = Array.from(event.target.files || []);
    if (event.target) event.target.value = '';
    if (!picked.length) return;

    const room = MAX_CLAIM_PROOF - proof.length;
    if (room <= 0) {
      return setError(`You can attach ${MAX_CLAIM_PROOF} photos at most`);
    }

    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      for (const file of picked.slice(0, room)) form.append('files', file);

      const res = await fetch('/api/claims/proof', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not upload that photo');

      setProof((current) => [...current, ...(data.paths || [])]);
    } catch (err) {
      setError(err.message || 'Could not upload that photo');
    } finally {
      setUploading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!validate()) return;

    setSending(true);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostelSlug: hostel.slug,
          role,
          phone,
          whatsapp,
          evidence,
          proof,
        }),
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
        throw new Error(data.error || 'Could not send that claim');
      }

      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again in a minute.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <Alert title="Claim received">
          A person reads every claim, so this is not instant. If it checks out we move
          the listing to your account and put your number on it, and you can change the
          rent and photos yourself from then on. Either way you get an email.
        </Alert>
        <Button href={`/hostels/${hostel.slug}`} variant="secondary">
          Back to the listing
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <ChoiceGroup legend="What are you to this hostel?" error={errors.role}>
        {CLAIM_ROLES.map((option) => (
          <ChoiceCard
            key={option.value}
            name="role"
            value={option.value}
            checked={role === option.value}
            onChange={() => setRole(option.value)}
            title={option.label}
          />
        ))}
      </ChoiceGroup>

      <TextField
        label="The number students should call"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0300 1234567"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={errors.phone}
        hint="This is what goes on the listing once the claim is approved."
      />

      <TextField
        label="WhatsApp number"
        type="tel"
        inputMode="tel"
        optional
        placeholder="Same as above"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        error={errors.whatsapp}
        hint="Leave blank if it is the same number."
      />

      <TextArea
        label="How can we tell this is yours?"
        value={evidence}
        onChange={(e) => setEvidence(e.target.value)}
        error={errors.evidence}
        placeholder="A utility bill or rent agreement in the hostel's name, the signboard with your number on it, or anything else that would settle it."
        hint="Whatever you have. If you would rather we just rang the number above, say so."
      />

      <div className="flex flex-col gap-2">
        <p className="ds-body-m-strong text-ds-ink">
          Photos <span className="ds-body-s text-ds-ink-muted">(optional)</span>
        </p>
        <p className="ds-body-s text-ds-ink-muted">
          A bill, an agreement, the signboard. Up to {MAX_CLAIM_PROOF}, under 6 MB each.
          Only we see these.
        </p>

        {proof.length ? (
          <ul className="flex flex-wrap gap-2 pt-1">
            {proof.map((src) => (
              <li key={src} className="relative">
                {/* Not next/image: these are runtime uploads the optimiser
                    has not seen, and they are thumbnails of a document. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt="Attached proof"
                  className="size-20 rounded-ds-inner border border-solid border-ds-hairline object-cover"
                />
                <button
                  type="button"
                  onClick={() => setProof((c) => c.filter((p) => p !== src))}
                  className="ds-body-s absolute -right-1.5 -top-1.5 grid size-6 cursor-pointer place-items-center rounded-full border border-solid border-ds-hairline bg-ds-surface text-ds-ink"
                  aria-label="Remove this photo"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={addPhotos}
          className="sr-only"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInput.current?.click()}
          disabled={uploading || proof.length >= MAX_CLAIM_PROOF}
          className="self-start"
        >
          {uploading
            ? 'Uploading…'
            : proof.length
              ? 'Add another photo'
              : 'Attach a photo'}
        </Button>
      </div>

      {error ? (
        <Alert tone="error" title="That did not send">
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={sending} className="self-start">
          {sending ? 'Sending…' : 'Send claim'}
        </Button>
        <p className="ds-body-s text-ds-ink-muted">
          Claiming is free and always will be. Nothing on the listing changes until a
          person has read this.
        </p>
      </div>
    </form>
  );
}

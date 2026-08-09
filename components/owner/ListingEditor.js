'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Save, Send, Upload } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';
import { useListingDraft } from './useListingDraft';
import SaveIndicator from './SaveIndicator';
import { useToast } from './Toast';
import { apiSend } from './api-client';
import {
  BasicsSection,
  PricingSection,
  DetailsSection,
  PhotosSection,
  LocationSection,
  ContactSection,
} from './listing-sections';

const SECTIONS = [
  { id: 'basics', label: 'Basics' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'details', label: 'Details' },
  { id: 'photos', label: 'Photos' },
  { id: 'location', label: 'Location' },
  { id: 'contact', label: 'Contact' },
];

/**
 * Single-page sectioned edit form using the same field groups as the wizard,
 * with everything on screen at once because an editor already knows the shape
 * of their listing and only wants to change one thing.
 */
export default function ListingEditor({ listing, facilities, roomTypes }) {
  const router = useRouter();
  const toast = useToast();
  const draft = useListingDraft({ listing });

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const canSubmit = ['draft', 'rejected'].includes(listing.status);
  const awaitingPayment = listing.status === 'pending_payment';

  async function saveNow() {
    setFormError('');
    setSaving(true);
    try {
      const data = await draft.save();
      if (data?.verifiedCleared) {
        setNotice(
          'Saved and live. Because you changed a key detail, the “Verified” badge is paused until an admin re-checks the listing.'
        );
      } else {
        setNotice('');
      }
      toast.success('Changes saved.');
      router.refresh();
    } catch (err) {
      setFormError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setFormError('');
    setSubmitting(true);
    try {
      if (draft.dirty) await draft.save();
      const data = await apiSend(`/api/owner/listings/${listing._id}/submit`);
      toast.success(
        data.status === 'pending_payment'
          ? 'Submitted. Next: upload your payment proof.'
          : 'Resubmitted. An admin will review it shortly.'
      );
      router.push(data.next);
      router.refresh();
    } catch (err) {
      setFormError(err.message);
      if (err.fieldErrors) draft.setErrors(err.fieldErrors);
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const sectionProps = {
    values: draft.values,
    setField: draft.setField,
    errors: draft.errors,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
      <div className="min-w-0 space-y-4">
        {listing.status === 'rejected' && listing.rejectionReason && (
          <Alert tone="danger" title="An admin sent this listing back">
            {listing.rejectionReason}
            <span className="mt-1 block">
              Fix the points above, then press <strong>Resubmit</strong> at the bottom.
            </span>
          </Alert>
        )}

        {listing.status === 'published' && (
          <Alert tone="info" title="This listing is live">
            Edits publish immediately, so your listing never goes offline while you update it.
            Changing the name, location, price or contact details pauses the “Verified” badge until
            an admin re-checks it.
          </Alert>
        )}

        {listing.status === 'suspended' && (
          <Alert tone="danger" title="This listing is suspended">
            It is hidden from students. You can keep editing, but only an admin can restore it.
          </Alert>
        )}

        {awaitingPayment && (
          <Alert tone="warning" title="Waiting for your listing fee">
            This listing goes live once you upload proof of the transfer and an admin approves it.
          </Alert>
        )}

        {listing.status === 'pending_review' && (
          <Alert tone="info" title="With an admin for review">
            Your payment is being checked. You can still edit. The version an admin sees is
            whatever is saved when they open it.
          </Alert>
        )}

        {notice && <Alert tone="success">{notice}</Alert>}

        <Card className="p-5 sm:p-6">
          <div className="space-y-10">
            <BasicsSection {...sectionProps} />
            <PricingSection {...sectionProps} roomTypes={roomTypes} />
            <DetailsSection {...sectionProps} facilities={facilities} />
            <PhotosSection {...sectionProps} listingId={listing._id} />
            <LocationSection {...sectionProps} />
            <ContactSection {...sectionProps} />
          </div>
        </Card>

        {formError && (
          <Alert tone="danger" title="We could not save">
            {formError}
          </Alert>
        )}
      </div>

      {/* Sticky rail: status, jump links and the save controls. */}
      <aside className="lg:sticky lg:top-6">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={listing.status} />
            <SaveIndicator state={draft.saveState} dirty={draft.dirty} error={draft.saveError} />
          </div>

          <nav className="mt-4 hidden lg:block" aria-label="Jump to section">
            <ul className="space-y-0.5">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={cn(
                      'flex h-9 items-center rounded-lg px-2.5 text-sm text-muted-foreground',
                      'transition-colors duration-200 hover:bg-muted hover:text-foreground',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
                    )}
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="primary"
              className="w-full"
              onClick={saveNow}
              loading={saving}
              disabled={!draft.dirty && !saving}
            >
              <Save className="size-4" aria-hidden="true" />
              {draft.dirty ? 'Save changes' : 'All changes saved'}
            </Button>

            {canSubmit && (
              <Button
                type="button"
                variant="accent"
                className="w-full"
                onClick={submit}
                loading={submitting}
              >
                <Send className="size-4" aria-hidden="true" />
                {listing.status === 'rejected' ? 'Resubmit listing' : 'Submit listing'}
              </Button>
            )}

            {awaitingPayment && (
              <Button
                href={`/owner/listings/${listing._id}/payment`}
                variant="accent"
                className="w-full"
              >
                <Upload className="size-4" aria-hidden="true" />
                Upload payment proof
              </Button>
            )}

            {listing.status === 'published' && (
              <Button
                href={`/hostels/${listing.slug}`}
                variant="secondary"
                className="w-full"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                View public page
              </Button>
            )}
          </div>

          <p className="mt-3 text-xs text-muted-foreground text-pretty">
            Changes autosave a moment after you stop typing.
          </p>
        </Card>
      </aside>
    </div>
  );
}

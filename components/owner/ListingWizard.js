'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Send } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS } from './schemas';
import { useListingDraft, toPatchPayload } from './useListingDraft';
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
  ReviewSummary,
} from './listing-sections';

/** Which wizard step owns which field, so a server error can send them back. */
const STEP_FIELDS = {
  basics: ['name', 'city', 'area', 'address', 'universities', 'gender'],
  pricing: ['price', 'priceMin', 'priceMax', 'securityDeposit', 'rooms'],
  details: ['description', 'facilities', 'rules'],
  photos: ['images'],
  location: ['lat', 'lng'],
  contact: ['contact'],
};

function stepForField(field) {
  const root = field.split('.')[0];
  return WIZARD_STEPS.findIndex((step) => STEP_FIELDS[step.key]?.includes(root));
}

function Stepper({ steps, current, furthest, onJump }) {
  return (
    <>
      {/* Mobile: a bar plus "step n of m" reads faster than seven tiny dots. */}
      <div className="lg:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{steps[current].title}</p>
          <p className="tabular text-xs text-muted-foreground">
            Step {current + 1} of {steps.length}
          </p>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={current + 1}
          aria-label="Listing setup progress"
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{steps[current].description}</p>
      </div>

      {/* Desktop: the full path, with completed steps clickable. */}
      <ol className="hidden lg:flex lg:items-center lg:gap-1" aria-label="Listing setup progress">
        {steps.map((step, index) => {
          const done = index < furthest;
          const active = index === current;
          const reachable = index <= furthest;
          return (
            <li key={step.key} className="flex min-w-0 flex-1 items-center gap-1">
              <button
                type="button"
                onClick={() => reachable && onJump(index)}
                disabled={!reachable}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-left',
                  'transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  reachable ? 'cursor-pointer hover:bg-muted' : 'cursor-not-allowed opacity-60',
                  active && 'bg-brand-50 dark:bg-brand-950'
                )}
              >
                <span
                  className={cn(
                    'tabular grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                    done
                      ? 'bg-brand-600 text-white'
                      : active
                        ? 'bg-brand-700 text-white'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block truncate text-xs font-semibold',
                      active ? 'text-brand-800 dark:text-brand-200' : 'text-foreground'
                    )}
                  >
                    {step.title}
                  </span>
                </span>
              </button>
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn('h-px w-4 shrink-0', done ? 'bg-brand-600' : 'bg-border')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

/**
 * Seven-step create flow. A server-side draft exists from the end of step 1,
 * so nothing typed after that can be lost; steps validate individually, and the
 * final submit re-validates the whole listing server-side before it moves to
 * `pending_payment`.
 */
export default function ListingWizard({ listing, facilities, roomTypes }) {
  const router = useRouter();
  const toast = useToast();
  const draft = useListingDraft({ listing });

  const [current, setCurrent] = useState(0);
  const [furthest, setFurthest] = useState(listing ? WIZARD_STEPS.length - 1 : 0);
  const [advancing, setAdvancing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const step = WIZARD_STEPS[current];
  const isLast = current === WIZARD_STEPS.length - 1;

  function focusFirstError() {
    // Bring the owner's eye to the top of the step they need to fix.
    requestAnimationFrame(() => {
      document.getElementById('wizard-panel')?.scrollIntoView({ block: 'start' });
    });
  }

  async function goNext() {
    setFormError('');
    if (!draft.validateStep(step.schema)) {
      focusFirstError();
      return;
    }

    setAdvancing(true);
    try {
      if (!draft.listingId) {
        // First continue: the draft is born here, and from now on every
        // keystroke is autosaved against it.
        const id = await draft.createDraft();
        router.replace(`/owner/listings/new?id=${id}`, { scroll: false });
        toast.success('Draft saved. You can leave and come back any time.');
      } else if (draft.dirty) {
        await draft.save();
      }

      const next = Math.min(current + 1, WIZARD_STEPS.length - 1);
      setCurrent(next);
      setFurthest((f) => Math.max(f, next));
      focusFirstError();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setAdvancing(false);
    }
  }

  function goBack() {
    setFormError('');
    setCurrent((c) => Math.max(0, c - 1));
    focusFirstError();
  }

  async function submit() {
    setFormError('');
    setSubmitting(true);
    try {
      if (draft.dirty) await draft.save();
      const data = await apiSend(`/api/owner/listings/${draft.listingId}/submit`);
      toast.success('Listing submitted. Next: pay the listing fee to go live.');
      router.push(data.next);
      router.refresh();
    } catch (err) {
      setFormError(err.message);
      if (err.fieldErrors) {
        draft.setErrors(err.fieldErrors);
        const firstStep = Object.keys(err.fieldErrors)
          .map(stepForField)
          .filter((i) => i >= 0)
          .sort((a, b) => a - b)[0];
        if (firstStep !== undefined) {
          setCurrent(firstStep);
          setFurthest((f) => Math.max(f, firstStep));
          focusFirstError();
        }
      }
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
    <div className="mx-auto max-w-3xl">
      <Card className="mb-4 p-4">
        <Stepper
          steps={WIZARD_STEPS}
          current={current}
          furthest={furthest}
          onJump={(index) => {
            setCurrent(index);
            focusFirstError();
          }}
        />
      </Card>

      <Card id="wizard-panel" className="scroll-mt-24 p-5 sm:p-6">
        {step.key === 'basics' && <BasicsSection {...sectionProps} />}
        {step.key === 'pricing' && <PricingSection {...sectionProps} roomTypes={roomTypes} />}
        {step.key === 'details' && <DetailsSection {...sectionProps} facilities={facilities} />}
        {step.key === 'photos' && (
          <PhotosSection {...sectionProps} listingId={draft.listingId} />
        )}
        {step.key === 'location' && <LocationSection {...sectionProps} />}
        {step.key === 'contact' && <ContactSection {...sectionProps} />}
        {step.key === 'review' && (
          <ReviewSummary
            values={draft.values}
            listing={{ ...toPatchPayload(draft.values), images: draft.values.images }}
          />
        )}

        {formError && (
          <Alert tone="danger" title="We could not continue" className="mt-5">
            {formError}
          </Alert>
        )}

        {isLast && !formError && (
          <Alert tone="info" title="What happens next" className="mt-5">
            Submitting moves this listing to <strong>awaiting payment</strong>. You transfer the
            listing fee, upload the screenshot, and an admin publishes it, usually within a day.
          </Alert>
        )}
      </Card>

      <div className="sticky bottom-0 z-20 mt-4 -mx-4 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-[var(--radius-card)] sm:border sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SaveIndicator state={draft.saveState} dirty={draft.dirty} error={draft.saveError} />
          <div className="flex flex-1 justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={goBack}
              disabled={current === 0 || advancing || submitting}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back
            </Button>
            {isLast ? (
              <Button type="button" variant="accent" onClick={submit} loading={submitting}>
                <Send className="size-4" aria-hidden="true" />
                Submit listing
              </Button>
            ) : (
              <Button type="button" variant="primary" onClick={goNext} loading={advancing}>
                Continue
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

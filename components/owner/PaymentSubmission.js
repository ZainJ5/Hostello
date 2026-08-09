'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  Check,
  Clock,
  Copy,
  ImageIcon,
  Receipt,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Field';
import { cn, formatDate, formatPKR } from '@/lib/utils';
import { useToast } from './Toast';
import { apiSend } from './api-client';

const MAX_MB = 5;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif';
const METHODS = ['Bank Transfer', 'JazzCash', 'Easypaisa', 'Raast', 'Other'];

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Reads a payment screenshot through the authenticated route rather than the
 * raw `/uploads/payments/...` path, so the image is only served to the owner
 * who uploaded it or to an admin. A plain <img> is used on purpose: routing it
 * through next/image would put a private receipt into the image cache.
 */
function ReceiptPreview({ paymentId, className }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-sunken px-4 py-10 text-center">
        <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">Receipt image unavailable</p>
        <p className="max-w-xs text-xs text-muted-foreground text-pretty">
          The file could not be read from storage. Re-upload it if an admin asks for it.
        </p>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/owner/payments/${paymentId}/screenshot`}
      alt="Your uploaded payment receipt"
      onError={() => setFailed(true)}
      className={cn('w-full rounded-xl border border-border object-contain', className)}
    />
  );
}

function CopyField({ label, value, note }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="tabular min-w-0 flex-1 text-sm font-semibold break-all text-foreground">
          {value}
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => setCopied(false), 1800);
            } catch {
              /* clipboard blocked; the value is selectable on screen anyway */
            }
          }}
          aria-label={`Copy ${label}`}
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {copied ? (
            <Check className="size-4 text-success" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {note && <p className="mt-1 text-xs text-muted-foreground text-pretty">{note}</p>}
    </div>
  );
}

export default function PaymentSubmission({ listing, payment, billing }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef(null);

  // The file and its preview URL move together: the URL is minted in the
  // change handler and revoked the moment it is replaced, so no object URL is
  // ever created during render or leaked on unmount.
  const [selected, setSelected] = useState(null); // { file, url } | null
  const selectedRef = useRef(null);
  const [values, setValues] = useState({
    amount: String(billing.amount),
    method: billing.accounts[0]?.method || 'Bank Transfer',
    transactionRef: '',
    paidAt: todayISO(),
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const file = selected?.file || null;
  const preview = selected?.url || '';

  useEffect(
    () => () => {
      if (selectedRef.current) URL.revokeObjectURL(selectedRef.current.url);
    },
    []
  );

  function chooseFile(next) {
    if (selectedRef.current) URL.revokeObjectURL(selectedRef.current.url);
    const entry = next ? { file: next, url: URL.createObjectURL(next) } : null;
    selectedRef.current = entry;
    setSelected(entry);
  }

  const awaitingReview = payment?.status === 'pending';
  const wasRejected = payment?.status === 'rejected';
  const approved = payment?.status === 'approved';

  function setField(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function pickFile(candidate) {
    setFormError('');
    if (!candidate) return;
    if (candidate.size > MAX_MB * 1024 * 1024) {
      setFormError(`That screenshot is larger than ${MAX_MB} MB.`);
      return;
    }
    if (candidate.type && !ACCEPT.includes(candidate.type)) {
      setFormError('Upload an image: JPG, PNG, WebP, AVIF or GIF.');
      return;
    }
    chooseFile(candidate);
  }

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    setErrors({});

    if (!file) {
      setFormError('Attach the screenshot of your transfer. It is how we verify the payment.');
      return;
    }

    const form = new FormData();
    form.append('amount', values.amount);
    form.append('method', values.method);
    form.append('transactionRef', values.transactionRef);
    form.append('paidAt', values.paidAt);
    form.append('screenshot', file);

    setSubmitting(true);
    try {
      await apiSend(`/api/owner/listings/${listing._id}/payment`, { form });
      toast.success('Payment submitted. An admin will review it shortly.');
      chooseFile(null);
      router.refresh();
    } catch (err) {
      setFormError(err.message);
      if (err.fieldErrors) setErrors(err.fieldErrors);
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Already paid and approved ──
  if (approved && listing.status === 'published') {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-success-soft text-success dark:bg-success/15 dark:text-emerald-300">
            <ShieldCheck className="size-7" aria-hidden="true" />
          </span>
          <h2 className="text-h3 text-foreground">This listing is live</h2>
          <p className="max-w-md text-sm text-muted-foreground text-pretty">
            Your payment of {formatPKR(payment.amount)} was approved on{' '}
            {formatDate(payment.reviewedAt || payment.updatedAt)}. Nothing further is due.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button href="/owner/payments" variant="secondary">
              Billing history
            </Button>
            <Button href={`/hostels/${listing.slug}`} variant="primary" target="_blank" rel="noreferrer">
              View live listing
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="min-w-0 space-y-4">
        {awaitingReview && (
          <Card className="border-info/30 bg-info-soft/40 dark:bg-info/10">
            <div className="flex flex-col gap-4 p-5 sm:flex-row">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-info-soft text-info dark:bg-info/20 dark:text-sky-300">
                <Clock className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-foreground">
                  Awaiting admin approval
                </h2>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">
                  We have your receipt. An admin usually reviews payments within a working day,
                  and the listing goes live automatically the moment it is approved. You will get
                  an email either way.
                </p>
                <dl className="tabular mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Amount</dt>
                    <dd className="font-semibold text-foreground">{formatPKR(payment.amount)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Method</dt>
                    <dd className="font-semibold text-foreground">{payment.method}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Reference</dt>
                    <dd className="truncate font-semibold text-foreground">
                      {payment.transactionRef || 'Not given'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Submitted</dt>
                    <dd className="font-semibold text-foreground">
                      {formatDate(payment.createdAt)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </Card>
        )}

        {wasRejected && (
          <Alert tone="danger" title="Your last payment was rejected">
            {payment.reviewNote ||
              'An admin could not match your receipt to a transfer. Check the amount and reference, then upload it again.'}
          </Alert>
        )}

        {awaitingReview ? (
          <Card>
            <CardHeader
              title="Your receipt"
              description="Only you and Hostello admins can open this image."
            />
            <div className="p-5 pt-4">
              <ReceiptPreview paymentId={payment._id} className="max-h-[520px]" />
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader
              title={wasRejected ? 'Upload a new receipt' : 'Confirm your transfer'}
              description="Fill this in after you have made the transfer using the details on the right."
            />
            <form onSubmit={submit} noValidate className="space-y-5 p-5 pt-4">
              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  label="Amount transferred"
                  required
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={100}
                  value={values.amount}
                  onChange={(e) => setField('amount', e.target.value)}
                  error={errors.amount}
                  hint={`Listing fee is ${formatPKR(billing.amount)}.`}
                />
                <Select
                  label="How you paid"
                  required
                  value={values.method}
                  onChange={(e) => setField('method', e.target.value)}
                  error={errors.method}
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  label="Transaction ID / reference"
                  required
                  value={values.transactionRef}
                  onChange={(e) => setField('transactionRef', e.target.value)}
                  error={errors.transactionRef}
                  placeholder="TXN482913"
                  hint="Printed on your bank or wallet confirmation."
                />
                <Input
                  label="Date paid"
                  required
                  type="date"
                  max={todayISO()}
                  value={values.paidAt}
                  onChange={(e) => setField('paidAt', e.target.value)}
                  error={errors.paidAt}
                />
              </div>

              <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">
                  Payment screenshot
                  <span className="ml-0.5 text-danger" aria-hidden="true">
                    *
                  </span>
                </p>
                <div
                  className={cn(
                    'rounded-[var(--radius-card)] border-2 border-dashed p-5 text-center transition-colors duration-200',
                    file ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/30' : 'border-border-strong bg-surface-sunken'
                  )}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    pickFile(e.dataTransfer.files?.[0]);
                  }}
                >
                  {preview ? (
                    <div className="space-y-3">
                      {/* Local object URL; never leaves the browser until submit. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt="Preview of the screenshot you selected"
                        className="mx-auto max-h-72 rounded-xl border border-border object-contain"
                      />
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <p className="tabular truncate text-xs text-muted-foreground">
                          {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            chooseFile(null);
                            if (inputRef.current) inputRef.current.value = '';
                          }}
                        >
                          <X className="size-4" aria-hidden="true" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        <Receipt className="size-6" aria-hidden="true" />
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        Drop your receipt here
                      </p>
                      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
                        A screenshot of the confirmation screen. JPG, PNG, WebP, AVIF or GIF, up to{' '}
                        {MAX_MB} MB.
                      </p>
                    </>
                  )}

                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPT}
                    className="sr-only"
                    onChange={(e) => pickFile(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4"
                    onClick={() => inputRef.current?.click()}
                  >
                    <Upload className="size-4" aria-hidden="true" />
                    {file ? 'Choose a different file' : 'Choose screenshot'}
                  </Button>
                </div>
              </div>

              {formError && <Alert tone="danger">{formError}</Alert>}

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
                <Button href={`/owner/listings/${listing._id}/edit`} variant="secondary">
                  Back to listing
                </Button>
                <Button type="submit" variant="accent" loading={submitting}>
                  <Receipt className="size-4" aria-hidden="true" />
                  Submit for approval
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Listing fee</p>
              <p className="tabular mt-1 text-3xl font-bold tracking-tight text-foreground">
                {formatPKR(billing.amount)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Covers {billing.planMonths} months of publication.
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700 dark:bg-accent-700/20 dark:text-accent-300">
              <Banknote className="size-5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
            <span className="truncate text-sm text-muted-foreground">{listing.name}</span>
            <StatusBadge status={listing.status} size="sm" />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Where to send it"
            description="Transfer the fee to any one of these, then fill in the form."
          />
          <div className="space-y-3 p-5 pt-4">
            {billing.accounts.map((account) => (
              <div key={`${account.method}-${account.accountNumber}`} className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{account.label}</p>
                <CopyField label="Account title" value={account.accountTitle} />
                <CopyField label="Account number" value={account.accountNumber} note={account.note} />
              </div>
            ))}
          </div>
        </Card>

        <Alert tone="info" title="No card payments, on purpose">
          Hostello does not run a payment gateway. You transfer directly, we check the receipt by
          hand, and no card details ever touch this site.
        </Alert>
      </aside>
    </div>
  );
}

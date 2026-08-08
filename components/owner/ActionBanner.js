'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Clock, CircleAlert, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Console-wide banner for anything that is blocking an owner from earning.
 * Ordered by urgency: money owed first, then rejections, then things that are
 * merely waiting on us. Dismissal is per-session only — the work is still real,
 * so it comes back on the next visit.
 */
function buildItems(summary) {
  if (!summary) return [];
  const items = [];

  if (summary.pendingPayment > 0) {
    items.push({
      key: 'pending_payment',
      tone: 'warning',
      icon: TriangleAlert,
      title:
        summary.pendingPayment === 1
          ? '1 listing is waiting for its payment proof'
          : `${summary.pendingPayment} listings are waiting for their payment proof`,
      body: 'Upload the transfer screenshot and an admin will publish it, usually within a day.',
      href: '/owner/listings?status=pending_payment',
      cta: 'Upload proof',
    });
  }

  if (summary.rejected > 0) {
    items.push({
      key: 'rejected',
      tone: 'danger',
      icon: CircleAlert,
      title:
        summary.rejected === 1
          ? '1 listing was sent back by an admin'
          : `${summary.rejected} listings were sent back by an admin`,
      body: 'Open the listing to read the reason, fix it, and resubmit.',
      href: '/owner/listings?status=rejected',
      cta: 'Review feedback',
    });
  }

  if (summary.rejectedPayments > 0) {
    items.push({
      key: 'rejected_payment',
      tone: 'danger',
      icon: CircleAlert,
      title:
        summary.rejectedPayments === 1
          ? 'A payment was rejected'
          : `${summary.rejectedPayments} payments were rejected`,
      body: 'Check the admin note on your billing history and re-upload the receipt.',
      href: '/owner/payments',
      cta: 'Open billing',
    });
  }

  if (summary.pendingReview > 0) {
    items.push({
      key: 'pending_review',
      tone: 'info',
      icon: Clock,
      title:
        summary.pendingReview === 1
          ? '1 listing is in review'
          : `${summary.pendingReview} listings are in review`,
      body: 'Nothing for you to do — we will email you as soon as an admin approves it.',
      href: '/owner/listings?status=pending_review',
      cta: 'View status',
    });
  }

  return items;
}

const TONES = {
  warning:
    'border-warning/30 bg-warning-soft/60 text-warning dark:bg-warning/10 dark:text-amber-300',
  danger: 'border-danger/30 bg-danger-soft/60 text-danger dark:bg-danger/10 dark:text-red-300',
  info: 'border-info/30 bg-info-soft/60 text-info dark:bg-info/10 dark:text-sky-300',
};

export default function ActionBanner({ summary }) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState([]);

  // Dismissal only silences the banner the owner actually read. As soon as the
  // underlying counts move — a new rejection, a payment cleared — the nudge
  // comes back. Adjusted during render; an effect here would paint the stale
  // banner first.
  const signature = `${summary?.pendingPayment}:${summary?.rejected}:${summary?.pendingReview}:${summary?.rejectedPayments}`;
  const [lastSignature, setLastSignature] = useState(signature);
  if (lastSignature !== signature) {
    setLastSignature(signature);
    if (dismissed.length) setDismissed([]);
  }

  const items = buildItems(summary).filter((i) => !dismissed.includes(i.key));
  if (!items.length) return null;

  // On the listings page the same information is already in the table.
  const compact = pathname?.startsWith('/owner/listings');

  return (
    <div className="mb-6 space-y-2.5">
      {items.slice(0, compact ? 1 : 3).map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            role="status"
            className={cn(
              'flex flex-col gap-3 rounded-[var(--radius-card)] border px-4 py-3.5 sm:flex-row sm:items-center',
              TONES[item.tone]
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-pretty">{item.title}</p>
              {!compact && <p className="mt-0.5 text-sm opacity-90 text-pretty">{item.body}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link
                href={item.href}
                className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-semibold underline-offset-4 transition-colors duration-200 hover:bg-current/10 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                {item.cta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => setDismissed((list) => [...list, item.key])}
                aria-label={`Dismiss: ${item.title}`}
                className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl opacity-70 transition-opacity duration-200 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

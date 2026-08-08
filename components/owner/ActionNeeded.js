import Link from 'next/link';
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Clock,
  MessageSquare,
  Star,
  Upload,
} from 'lucide-react';
import Card, { CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

const TONE_ICON = {
  warning: 'bg-warning-soft text-warning dark:bg-warning/15 dark:text-amber-300',
  danger: 'bg-danger-soft text-danger dark:bg-danger/15 dark:text-red-300',
  info: 'bg-info-soft text-info dark:bg-info/15 dark:text-sky-300',
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
};

/**
 * The single "what do I do now" panel. Everything in it is either money the
 * owner has not collected yet or a student waiting on a reply, ordered exactly
 * that way.
 */
export default function ActionNeeded({ dashboard }) {
  const { hostels, stats, recentBookings, unrepliedReviews } = dashboard;

  const awaitingPayment = hostels.filter((h) => h.status === 'pending_payment');
  const rejected = hostels.filter((h) => h.status === 'rejected');
  const inReview = hostels.filter((h) => h.status === 'pending_review');
  const pendingBookings = recentBookings.filter((b) => b.status === 'pending');

  const items = [];

  for (const hostel of awaitingPayment.slice(0, 3)) {
    items.push({
      key: `pay-${hostel._id}`,
      tone: 'warning',
      icon: Upload,
      title: hostel.name,
      body: 'Upload your transfer screenshot to send this listing for approval.',
      href: `/owner/listings/${hostel._id}/payment`,
      cta: 'Pay & submit',
    });
  }

  for (const hostel of rejected.slice(0, 3)) {
    items.push({
      key: `rej-${hostel._id}`,
      tone: 'danger',
      icon: CircleAlert,
      title: hostel.name,
      body: hostel.rejectionReason
        ? `Admin note: “${hostel.rejectionReason}”`
        : 'An admin sent this back. Open it to see what needs fixing.',
      href: `/owner/listings/${hostel._id}/edit`,
      cta: 'Fix listing',
    });
  }

  if (pendingBookings.length || stats.pendingBookings) {
    items.push({
      key: 'bookings',
      tone: 'brand',
      icon: MessageSquare,
      title: `${stats.pendingBookings} booking ${
        stats.pendingBookings === 1 ? 'request is' : 'requests are'
      } waiting on you`,
      body: 'Students usually book the first hostel that answers. Replies are free.',
      href: '/owner/bookings?status=pending',
      cta: 'Respond',
    });
  }

  if (unrepliedReviews.length) {
    items.push({
      key: 'reviews',
      tone: 'brand',
      icon: Star,
      title: `${unrepliedReviews.length} review${
        unrepliedReviews.length === 1 ? '' : 's'
      } without a reply`,
      body: 'A public reply is the cheapest trust signal you have.',
      href: '/owner/reviews?filter=unreplied',
      cta: 'Reply',
    });
  }

  for (const hostel of inReview.slice(0, 2)) {
    items.push({
      key: `rev-${hostel._id}`,
      tone: 'info',
      icon: Clock,
      title: hostel.name,
      body: 'With an admin for approval — nothing for you to do.',
      href: '/owner/listings?status=pending_review',
      cta: 'View',
      passive: true,
    });
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Action needed"
        description={
          items.length
            ? 'Ordered by what costs you the most to ignore.'
            : 'Everything on your account is up to date.'
        }
      />
      <div className="flex-1 p-5 pt-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-sunken px-4 py-10 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-success-soft text-success dark:bg-success/15 dark:text-emerald-300">
              <CircleCheck className="size-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-foreground">All caught up</p>
            <p className="max-w-xs text-sm text-muted-foreground text-pretty">
              No payments due, no rejections and no unanswered students.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.slice(0, 6).map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="group flex items-start gap-3 rounded-xl border border-border p-3 transition-[background-color,border-color] duration-200 hover:border-border-strong hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span
                      className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-xl',
                        TONE_ICON[item.tone]
                      )}
                    >
                      <Icon className="size-4.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground text-pretty">
                        {item.body}
                      </span>
                    </span>
                    <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                      {item.cta}
                      <ArrowRight
                        className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

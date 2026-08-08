import { BadgeCheck, CalendarDays, Eye, ShieldCheck, Wallet } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Rating } from '@/components/ui/Feedback';
import { cn, formatPKR, formatPriceRange } from '@/lib/utils';
import ContactActions from './ContactActions';

function Price({ hostel, className }) {
  const lo = hostel.priceMin || hostel.price || 0;
  const hi = hostel.priceMax || hostel.price || 0;
  return (
    <p className={cn('tabular font-display font-bold tracking-tight text-foreground', className)}>
      {formatPriceRange(lo, hi)}
      <span className="ml-1.5 text-sm font-medium text-muted-foreground">/ month</span>
    </p>
  );
}

/**
 * Desktop right-rail card. Sticks below the header while the long content
 * column scrolls, so the price and the two contact routes are never more than
 * a glance away.
 */
export function BookingCard({ hostel, className }) {
  const deposit = Number(hostel.securityDeposit) || 0;

  return (
    <div
      className={cn(
        'rounded-[var(--radius-panel)] border border-border bg-surface p-5 shadow-lg',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Price hostel={hostel} className="text-2xl" />
        {hostel.reviewCount > 0 && (
          <Rating value={hostel.rating} count={hostel.reviewCount} size="sm" className="pt-1.5" />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {hostel.available ? (
          <Badge tone="success" size="md">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
            Rooms available
          </Badge>
        ) : (
          <Badge tone="warning" size="md">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
            Currently full
          </Badge>
        )}
        {hostel.verified && (
          <Badge tone="brand" size="md">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            Verified
          </Badge>
        )}
      </div>

      <Button
        href={`/hostels/${hostel.slug}/book`}
        variant="accent"
        size="lg"
        className="mt-5 w-full"
      >
        <CalendarDays className="size-4.5" aria-hidden="true" />
        Request a room
      </Button>

      <ContactActions
        slug={hostel.slug}
        phone={hostel.contact?.phone}
        whatsapp={hostel.contact?.whatsapp}
        hostelName={hostel.name}
        className="mt-2.5"
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        You won&apos;t be charged yet — requests go straight to the owner.
      </p>

      <dl className="mt-5 space-y-2.5 border-t border-border pt-4 text-sm">
        {deposit > 0 && (
          <div className="flex items-center justify-between gap-3">
            <dt className="inline-flex items-center gap-2 text-muted-foreground">
              <Wallet className="size-4" aria-hidden="true" />
              Security deposit
            </dt>
            <dd className="tabular font-medium text-foreground">{formatPKR(deposit)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-2 text-muted-foreground">
            <Eye className="size-4" aria-hidden="true" />
            Views
          </dt>
          <dd className="tabular font-medium text-foreground">
            {(hostel.views || 0).toLocaleString('en-PK')}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Listing status
          </dt>
          <dd className="font-medium text-success">Reviewed by Hostello</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Mobile counterpart: a fixed action bar. The page reserves matching bottom
 * padding so the bar never covers the last section, and it clears the iOS home
 * indicator via `env(safe-area-inset-bottom)`.
 */
export function MobileBookingBar({ hostel }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-lg lg:hidden">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="min-w-0 flex-1">
          <Price hostel={hostel} className="truncate text-base" />
          <p className="text-xs text-muted-foreground">
            {hostel.available ? 'Rooms available now' : 'Currently full'}
          </p>
        </div>

        <ContactActions
          slug={hostel.slug}
          phone={hostel.contact?.phone}
          whatsapp={hostel.contact?.whatsapp}
          hostelName={hostel.name}
          compact
          className="shrink-0"
        />

        <Button href={`/hostels/${hostel.slug}/book`} variant="accent" size="lg" className="shrink-0">
          Request
        </Button>
      </div>
    </div>
  );
}

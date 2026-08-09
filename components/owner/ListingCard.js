'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bookmark,
  CalendarCheck,
  ExternalLink,
  Eye,
  MapPin,
  Pencil,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Feedback';
import HostelImage from '@/components/ui/HostelImage';
import { cn, formatPriceRange, timeAgo } from '@/lib/utils';
import { NEXT_ACTION } from './constants';
import { ConfirmDialog } from './Modal';
import { useToast } from './Toast';
import { apiSend } from './api-client';

function Metric({ icon: Icon, value, label }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate text-[11px] font-medium tracking-wide uppercase">{label}</span>
      </div>
      <p className="tabular mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

/**
 * One listing in the owner's portfolio. Everything an owner needs to decide
 * what to do next is on the card itself: status, traffic, and the single
 * action that moves the listing forward.
 */
export default function ListingCard({ listing }) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [available, setAvailable] = useState(listing.available);

  const next = NEXT_ACTION[listing.status] || NEXT_ACTION.draft;
  const cover = listing.images?.[0] || '';
  const canDelete = ['draft', 'rejected'].includes(listing.status);

  async function remove() {
    try {
      await apiSend(`/api/owner/listings/${listing._id}`, { method: 'DELETE' });
      toast.success(`“${listing.name}” deleted.`);
      router.refresh();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  }

  async function toggleAvailability() {
    const nextValue = !available;
    setTogglingAvailability(true);
    setAvailable(nextValue);
    try {
      await apiSend(`/api/owner/listings/${listing._id}`, {
        method: 'PATCH',
        body: { available: nextValue },
      });
      toast.success(
        nextValue
          ? 'Marked as taking bookings.'
          : 'Marked as full. Students see it as unavailable.'
      );
      router.refresh();
    } catch (err) {
      setAvailable(!nextValue);
      toast.error(err.message);
    } finally {
      setTogglingAvailability(false);
    }
  }

  return (
    <Card className="flex flex-col overflow-hidden" interactive>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <HostelImage
          src={cover}
          name={listing.name}
          alt={`${listing.name} cover photo`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <StatusBadge status={listing.status} />
          {listing.status === 'published' && !available && (
            <Badge tone="warning">Marked full</Badge>
          )}
          {listing.verified && <Badge tone="brand">Verified</Badge>}
        </div>
        {listing.images?.length > 0 && (
          <span className="tabular absolute right-3 bottom-3 rounded-full bg-slate-950/70 px-2 py-0.5 text-[11px] font-medium text-white">
            {listing.images.length} photo{listing.images.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-base font-semibold text-foreground" title={listing.name}>
          {listing.name}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          {[listing.area, listing.city].filter(Boolean).join(', ') || 'Location not set'}
        </p>
        <p className="tabular mt-2 text-sm font-semibold text-foreground">
          {formatPriceRange(listing.priceMin || listing.price, listing.priceMax)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">/ month</span>
        </p>

        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-3">
          <Metric icon={Eye} label="Views" value={(listing.views || 0).toLocaleString('en-PK')} />
          <Metric icon={CalendarCheck} label="Bookings" value={listing.bookings || 0} />
          <Metric
            icon={Star}
            label="Rating"
            value={listing.reviewCount ? listing.rating.toFixed(1) : 'None yet'}
          />
          <Metric icon={Bookmark} label="Saves" value={listing.saveCount || 0} />
        </div>

        {listing.status === 'rejected' && listing.rejectionReason && (
          <Alert tone="danger" title="Admin feedback" className="mt-3">
            {listing.rejectionReason}
          </Alert>
        )}

        <div
          className={cn(
            'mt-3 rounded-xl border px-3 py-2 text-xs',
            next.tone === 'warning' &&
              'border-warning/30 bg-warning-soft/50 text-warning dark:bg-warning/10 dark:text-amber-300',
            next.tone === 'danger' &&
              'border-danger/30 bg-danger-soft/50 text-danger dark:bg-danger/10 dark:text-red-300',
            next.tone === 'info' &&
              'border-info/30 bg-info-soft/50 text-info dark:bg-info/10 dark:text-sky-300',
            next.tone === 'success' &&
              'border-success/30 bg-success-soft/50 text-success dark:bg-success/10 dark:text-emerald-300',
            next.tone === 'neutral' && 'border-border bg-muted/60 text-muted-foreground'
          )}
        >
          <p className="font-semibold">Next: {next.label}</p>
          <p className="mt-0.5 opacity-90 text-pretty">{next.hint}</p>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          {listing.status === 'pending_payment' && (
            <Button href={`/owner/listings/${listing._id}/payment`} variant="accent" size="sm">
              <Upload className="size-4" aria-hidden="true" />
              Upload payment
            </Button>
          )}
          {listing.status === 'draft' && (
            <Button href={`/owner/listings/new?id=${listing._id}`} variant="primary" size="sm">
              Continue setup
            </Button>
          )}
          <Button href={`/owner/listings/${listing._id}/edit`} variant="secondary" size="sm">
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </Button>
          {listing.status === 'published' && (
            <Button
              href={`/hostels/${listing.slug}`}
              variant="ghost"
              size="sm"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              View live
            </Button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Delete ${listing.name}`}
              className="ml-auto grid size-9 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:bg-danger/15"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {listing.status === 'published' && (
          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors duration-200 hover:border-border-strong">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">Taking bookings</span>
              <span className="block text-xs text-muted-foreground">
                Turn off when you are full. The listing stays live.
              </span>
            </span>
            <input
              type="checkbox"
              className="size-5 shrink-0 cursor-pointer accent-brand-700"
              checked={available}
              disabled={togglingAvailability}
              onChange={toggleAvailability}
            />
          </label>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          Updated {timeAgo(listing.updatedAt)}
        </p>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={remove}
        title={`Delete “${listing.name}”?`}
        confirmLabel="Delete listing"
      >
        This removes the listing and its uploaded photos for good. Any payment records stay on
        your billing history.
      </ConfirmDialog>
    </Card>
  );
}

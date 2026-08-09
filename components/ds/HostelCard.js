import Link from 'next/link';
import PhotoSlot from './PhotoSlot';
import Badge from './Badge';
import BedStrip from './BedStrip';
import Chip from './Chip';
import { cn } from '@/lib/utils';
import { formatPKR } from '@/lib/utils';
import { distanceBand, formatKm } from '@/lib/distance';

/**
 * Figma card/hostel/search 18:13. One card, used everywhere.
 *
 * The bed strip sits above the rent, not below it, because who is in the room
 * is the thing that separates this from every other listing.
 *
 * Rent uses figure/l with tabular figures so a column of cards compares digit
 * under digit.
 *
 * No heart, no star rating and no Featured badge, per the component
 * description. Saving a hostel is still available from the listing page and
 * the account area; it is the card that drops the affordance.
 */

/** Room facts the owner actually typed. Nothing here is derived or guessed. */
function factChips(hostel) {
  const chips = [];

  if (hostel.gender === 'Female') chips.push('Female only');
  else if (hostel.gender === 'Male') chips.push('Male only');
  else if (hostel.gender === 'Mixed') chips.push('Mixed');

  const facilities = Array.isArray(hostel.facilities) ? hostel.facilities : [];
  if (facilities.includes('Meals')) chips.push('Mess included');
  if (facilities.includes('Power Backup')) chips.push('Backup power');
  if (facilities.includes('WiFi')) chips.push('WiFi');

  return chips.slice(0, 3);
}

/** Rent line. Falls back to the single price when no range is recorded. */
function rentLabel(hostel) {
  const min = Number(hostel.priceMin) || 0;
  const max = Number(hostel.priceMax) || 0;
  const base = Number(hostel.price) || 0;

  if (min && max && max > min) return `${formatPKR(min)} to ${formatPKR(max)}`;
  const single = min || base;
  return single ? formatPKR(single) : null;
}

/**
 * Says only what the record holds: the billing period, whether meals are
 * included, and the deposit when the owner recorded one.
 */
function rentNote(hostel) {
  const parts = ['per month'];
  const facilities = Array.isArray(hostel.facilities) ? hostel.facilities : [];
  if (facilities.includes('Meals')) parts.push('mess included');
  const text = `${parts.join(', ')}.`;

  const deposit = Number(hostel.securityDeposit) || 0;
  return deposit ? `${text} Deposit ${formatPKR(deposit)}.` : text;
}

export default function HostelCard({ hostel, campus, priority = false, className }) {
  const rent = rentLabel(hostel);
  const chips = factChips(hostel);
  const photo = Array.isArray(hostel.images) && hostel.images.length ? hostel.images[0] : null;

  const km = campus ? formatKm(campus.km) : null;
  const band = campus ? distanceBand(campus.km) : null;

  // The bed strip needs a real bed count, which comes from a room type the
  // owner recorded. The design assumes every listing knows this, but no
  // imported listing carries a rooms array, so on current data the strip is
  // absent rather than drawn from a guessed segment count. When an owner adds
  // room types the strip appears in its unknown tier, since occupancy itself
  // is still not collected anywhere.
  const room = Array.isArray(hostel.rooms) ? hostel.rooms.find((r) => Number(r?.capacity) > 0) : null;
  const beds = room ? Number(room.capacity) : 0;

  return (
    <article
      className={cn(
        'ds-elevated relative flex w-full flex-col overflow-hidden rounded-ds-inner',
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ds-cobalt',
        className
      )}
    >
      <PhotoSlot src={photo} alt={hostel.name} priority={priority}>
        <Badge variant={hostel.verified ? 'solid' : 'outline'}>
          {hostel.verified ? 'Verified' : 'Not verified'}
        </Badge>
      </PhotoSlot>

      <div className="flex w-full flex-col gap-3 p-4">
        <h3 className="ds-display-s w-full text-ds-ink">
          <Link
            href={`/hostels/${hostel.slug}`}
            className="focus:outline-none after:absolute after:inset-0 after:content-['']"
          >
            {hostel.name}
          </Link>
        </h3>

        {km ? (
          <p className="ds-body-s w-full text-ds-ink-muted">
            {km} to {campus.label}
            {band ? `, ${band}` : ''}
          </p>
        ) : null}

        {beds ? <BedStrip beds={beds} tier="unknown" /> : null}

        <div aria-hidden="true" className="h-px w-full bg-ds-hairline" />

        {rent ? (
          <div className="flex w-full flex-col gap-0.5">
            <p className="ds-figure-l w-full text-ds-ink">{rent}</p>
            <p className="ds-body-s w-full text-ds-ink-muted">{rentNote(hostel)}</p>
          </div>
        ) : null}

        {chips.length ? (
          <div className="flex w-full flex-wrap gap-1.5">
            {chips.map((c) => (
              <Chip key={c}>{c}</Chip>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

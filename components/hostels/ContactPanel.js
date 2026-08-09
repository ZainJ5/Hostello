import Button from '@/components/ds/Button';
import { cn, formatPKR } from '@/lib/utils';
import ContactActions, { hasContact } from './ContactActions';
import SaveButton from './SaveButton';
import ShareButton from './ShareButton';

/**
 * Figma aside/contact 85:2260. The rent, what it buys, and the routes out of
 * the page, in the order a student uses them.
 *
 * THREE THINGS THE FRAME CARRIES THAT THE DATA DOES NOT.
 *
 * The deposit line goes: `securityDeposit` is 0 on all 124 listings, so
 * "deposit equals one month" would be a promise the product cannot keep.
 *
 * "By room type" goes with it: the rent band comes from priceMin and priceMax,
 * not from a room breakdown, because no listing records one.
 *
 * The view counter that the live site printed here goes too. It read 0 on
 * every listing, and a counter that always says zero is worse than no counter.
 *
 * The primary action is "Send enquiry" and not "Request to book". Hostello
 * holds no rooms, so there is nothing to book, and the label says what the
 * button does.
 */

/** Rent, collapsed to one figure when the band has no width. */
function rentLine(hostel) {
  const min = Number(hostel.priceMin) || 0;
  const max = Number(hostel.priceMax) || 0;
  const base = Number(hostel.price) || 0;
  if (min && max && max > min) return `${formatPKR(min)} to ${formatPKR(max)}`;
  const single = min || base;
  return single ? formatPKR(single) : null;
}

function Body({ hostel }) {
  const rent = rentLine(hostel);
  const reachable = hasContact(hostel);
  const where = [hostel.area, hostel.city].filter(Boolean).join(', ') || hostel.city;

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        {rent ? <p className="ds-figure-l text-ds-ink">{rent}</p> : null}
        <p className="ds-body-s text-ds-ink-muted">per person per month</p>
        <p className="ds-body-s text-ds-ink-muted">
          No agent fee and no Hostello fee. You pay the hostel directly.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <Button href={`/hostels/${hostel.slug}/enquire`} className="w-full">
          Send enquiry
        </Button>

        <ContactActions hostel={hostel} />

        {!reachable ? (
          <p className="ds-body-s text-ds-ink-muted">
            This owner has not given a phone number, so the enquiry form is the only route to
            them from here.
          </p>
        ) : null}

        <ShareButton title={hostel.name} text={`${hostel.name}, ${where}`} />
        <SaveButton hostelId={String(hostel._id)} />
      </div>

      <p className="ds-body-s text-ds-ink-muted">
        Hostello holds no rooms and takes no commission. You are contacting the hostel
        directly.
      </p>
    </div>
  );
}

/**
 * Desktop right rail. `self-start` on the parent is what keeps sticky alive:
 * a stretched grid item is as tall as the content column and can never stick.
 */
export function ContactCard({ hostel, className }) {
  return (
    <div className={cn('ds-elevated w-full rounded-ds-inner p-5', className)}>
      <Body hostel={hostel} />
    </div>
  );
}

/**
 * The phone counterpart: a fixed bar carrying the rent and the one action.
 * The page reserves matching bottom padding so the bar never covers the last
 * section, and it clears the iOS home indicator.
 */
export function MobileContactBar({ hostel }) {
  const rent = rentLine(hostel);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-solid border-ds-hairline bg-ds-surface lg:hidden">
      <div className="mx-auto flex w-full max-w-[90rem] items-center gap-3 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="min-w-px flex-1">
          {rent ? <p className="ds-body-m-strong truncate text-ds-ink">{rent}</p> : null}
          <p className="ds-body-s text-ds-ink-muted">per person per month</p>
        </div>
        <Button href={`/hostels/${hostel.slug}/enquire`} className="shrink-0">
          Send enquiry
        </Button>
      </div>
    </div>
  );
}

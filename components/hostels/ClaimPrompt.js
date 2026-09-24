import Link from 'next/link';
import Button from '@/components/ds/Button';
import { isClaimable, isUnreachable } from '@/lib/claims';

/**
 * "Is this your hostel?" on a listing nobody is answering for.
 *
 * Most of the directory was built from hostels' own public listings, so the
 * listing exists before its owner knows about it. On those, the space where a
 * phone number would be is the most valuable space on the page: the person who
 * runs the hostel is the one most likely to be looking at it, and this is what
 * turns them from a row in a database into an account.
 *
 * TWO WEIGHTS, on purpose. When there is no number, this is the only route to
 * a human and it says so plainly, so it gets the box and the button. When
 * there is a number, a claim is a nice-to-have and the prompt shrinks to one
 * line, because a student reading the page came for the number and should not
 * have to scroll past a pitch aimed at somebody else.
 *
 * It renders nothing at all once a listing belongs to an account. At that
 * point a claim is a request to take somebody else's listing away, and the API
 * refuses those, so offering the button would be a lie.
 */
export default function ClaimPrompt({ hostel }) {
  if (!isClaimable(hostel)) return null;

  const href = `/hostels/${hostel.slug}/claim`;

  if (!isUnreachable(hostel)) {
    return (
      <p className="ds-body-s text-ds-ink-muted">
        Is this your hostel?{' '}
        <Link href={href} className="underline underline-offset-2 hover:no-underline">
          Claim the listing
        </Link>{' '}
        to keep the rent and photos current yourself.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-ds-inner border border-solid border-ds-hairline p-4">
      <p className="ds-body-m-strong text-ds-ink">Is this your hostel?</p>
      <p className="ds-body-s text-ds-ink-muted">
        We built this listing from {hostel.name}&rsquo;s own public listing, so we have no
        number for you and students cannot reach you from here. Claim it and your number
        goes on the page.
      </p>
      <Button href={href} variant="secondary" className="w-full">
        Claim this listing
      </Button>
      <p className="ds-body-s text-ds-ink-muted">
        Free. A person reads every claim before anything changes.
      </p>
    </div>
  );
}

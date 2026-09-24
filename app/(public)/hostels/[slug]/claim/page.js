import { cache } from 'react';
import { notFound } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { serialize } from '@/lib/utils';
import { isClaimable, isUnreachable } from '@/lib/claims';
import Hostel from '@/models/Hostel';

import ContentPage from '@/components/content/PageShell';
import { Callout, FinePrint, NoteList, Section } from '@/components/content/Blocks';
import Button from '@/components/ds/Button';
import ClaimForm from '@/components/hostels/ClaimForm';

export const dynamic = 'force-dynamic';

const SELECT = '_id name slug city area status ownerId contact';

const getHostel = cache(async (slug) => {
  if (!slug) return null;
  await connectDB();
  const row = await Hostel.findOne({ slug, status: 'published' }).select(SELECT).lean();
  return row ? serialize(row) : null;
});

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const hostel = await getHostel(slug);
  if (!hostel) return { title: 'Listing not found', robots: { index: false, follow: true } };

  return {
    title: `Claim ${hostel.name}`,
    description: `Run ${hostel.name}? Take the listing over on Hostello, put your own number on it and keep the rent and photos current yourself. Free, and no commission.`,
    // A form is not a page a search engine should be sending people to, and
    // the listing above it is the one worth ranking.
    robots: { index: false, follow: true },
  };
}

/**
 * Claim a listing.
 *
 * WHY THIS PAGE EXISTS. Most of the directory was built from hostels' own
 * public listings rather than from their owners, so several hundred listings
 * carry no number a student can ring. Those listings are read by the people
 * who run them more often than by anybody else, and this is the page that
 * turns that reader into an account, a working number and somebody who keeps
 * their own rent up to date.
 *
 * THREE STATES, and the page has to be honest in all of them. The listing is
 * already owned, in which case there is nothing to claim and saying so beats
 * a form that fails on submit. Nobody is signed in, in which case the account
 * comes first, because a claim with no account behind it is not something
 * anyone can act on. Or it is claimable and somebody is here, which is the
 * form.
 */
export default async function ClaimListingPage({ params }) {
  const { slug } = await params;
  const hostel = await getHostel(slug);
  if (!hostel) notFound();

  const session = await getSession();
  const where = [hostel.area, hostel.city].filter(Boolean).join(', ');
  const claimable = isClaimable(hostel);
  const unreachable = isUnreachable(hostel);

  const trail = [
    { href: '/', label: 'Home' },
    { href: `/hostels/${hostel.slug}`, label: hostel.name },
    { label: 'Claim this listing' },
  ];

  if (!claimable) {
    return (
      <ContentPage
        trail={trail}
        title={`${hostel.name} is already claimed`}
        intro="This listing belongs to an owner account, so it is theirs to change."
      >
        <Section title="If that is wrong">
          <p className="ds-body-m text-ds-ink-muted">
            Somebody has already proved this hostel is theirs and the listing moved to
            their account. If you believe it went to the wrong person, report the listing
            and tell us what happened. We read every one.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button href={`/report-listing?hostel=${hostel.slug}`} variant="secondary">
              Report this listing
            </Button>
            <Button href={`/hostels/${hostel.slug}`} variant="secondary">
              Back to the listing
            </Button>
          </div>
        </Section>
      </ContentPage>
    );
  }

  return (
    <ContentPage
      trail={trail}
      title={`Claim ${hostel.name}`}
      intro={
        unreachable
          ? `We built this listing from ${hostel.name}'s own public listing, so it carries no number and students cannot reach you from it. Claiming puts that right.`
          : `Take over the listing for ${hostel.name}${where ? ` in ${where}` : ''} so you keep it current yourself.`
      }
    >
      <Section title="What claiming does">
        <NoteList
          items={[
            {
              title: 'The listing becomes yours',
              body: 'The rent, the photos, the facilities and the rules are yours to change from your dashboard, whenever they change.',
            },
            {
              title: 'Your number goes on the page',
              body: 'Students call or WhatsApp you directly, and enquiries come to you instead of going nowhere.',
            },
            {
              title: 'It costs nothing',
              body: 'Hostello takes no commission and never sits between you and the student. You deal with them yourself.',
            },
          ]}
        />
      </Section>

      {session ? (
        <Section title="Tell us who you are">
          <ClaimForm hostel={{ slug: hostel.slug, name: hostel.name }} />
        </Section>
      ) : (
        <Section title="First, an account">
          <p className="ds-body-m text-ds-ink-muted">
            A claim hands somebody a listing and every enquiry that comes through it, so
            there has to be an account behind it. Register as an owner, then come back
            here and the form will be waiting.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button href={`/signup?role=owner&next=/hostels/${hostel.slug}/claim`}>
              Register as an owner
            </Button>
            <Button
              href={`/login?next=/hostels/${hostel.slug}/claim`}
              variant="secondary"
            >
              I already have an account
            </Button>
          </div>
        </Section>
      )}

      <Callout title="What happens next">
        A person reads every claim, so this is not instant. If what you send settles it,
        the listing moves across and your number goes live. If it does not, we write back
        and say what would.
      </Callout>

      <FinePrint>
        Anything you attach is seen only by the people who review claims. It is never
        shown on the listing and never given to anyone else.
      </FinePrint>
    </ContentPage>
  );
}

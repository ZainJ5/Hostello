import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { serialize } from '@/lib/utils';
import Hostel from '@/models/Hostel';
import Review from '@/models/Review';
import Button from '@/components/ds/Button';
import ContentPage from '@/components/content/PageShell';
import { Callout, FinePrint, Paragraph, Section } from '@/components/content/Blocks';
import WriteReviewForm from '@/components/reviews/WriteReviewForm';
import { canReviewHostel } from '@/app/api/reviews/_lib/eligibility';

export const dynamic = 'force-dynamic';

async function loadHostel(slug) {
  await connectDB();
  return Hostel.findOne({ slug: String(slug), status: 'published' })
    .select('_id name slug city area')
    .lean();
}

export async function generateMetadata({ params }) {
  const { slug } = await params;

  let hostel = null;
  try {
    hostel = await loadHostel(slug);
  } catch (error) {
    console.error('[write-review] could not load hostel:', error?.message || error);
  }

  if (!hostel) return { title: 'Write a review' };

  return {
    title: `Review ${hostel.name}`,
    description: `Write a review of ${hostel.name} on Hostello. Reviews come from students who enquired and stayed. An owner can reply once and can never delete one.`,
    // A form, not a document. It is behind sign in and eligibility, so there is
    // nothing here for a search result, but the links out of it still count.
    robots: { index: false, follow: true },
  };
}

/** "Zoya R.", which is exactly how the review will be published. */
function publishedName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export default async function WriteReviewPage({ params }) {
  const { slug } = await params;

  const hostel = await loadHostel(slug);
  if (!hostel) notFound();

  const listing = serialize(hostel);
  const trail = [
    { href: '/', label: 'Home' },
    { href: `/hostels/${listing.slug}`, label: listing.name },
    { label: 'Write a review' },
  ];

  const session = await getSession();

  // ── Signed out ──
  // The sign in page is told where to come back to, so the student does not
  // land on the dashboard and have to find their way here again.
  if (!session) {
    const back = encodeURIComponent(`/hostels/${listing.slug}/review`);

    return (
      <ContentPage
        trail={trail}
        title={`Review ${listing.name}`}
        intro="Reviews on Hostello come from students with an account, which is the only reason they are worth reading. Sign in and we will bring you straight back here."
      >
        <div className="flex flex-wrap gap-2">
          <Button href={`/login?next=${back}`}>Sign in</Button>
          <Button href={`/signup?next=${back}`} variant="secondary">
            Create an account
          </Button>
        </div>

        <Section title="Who can write one">
          <Paragraph>
            You can review a hostel once you hold a confirmed or completed enquiry with it. Anybody
            can send an enquiry in ten seconds, so an enquiry on its own is not enough: if it were,
            one person could bury a listing under reviews without ever setting foot in it.
          </Paragraph>
        </Section>
      </ContentPage>
    );
  }

  // ── Signed in ──
  // Eligibility is read from the same helper the API enforces it with, so this
  // page can never offer a form the server would then refuse.
  const [eligible, existing] = await Promise.all([
    canReviewHostel(session.userId, listing._id),
    Review.findOne({ hostelId: listing._id, studentId: session.userId })
      .select('_id rating title comment cleanliness food security location valueForMoney status')
      .lean(),
  ]);

  const review = existing ? serialize(existing) : null;

  // A review a moderator removed is frozen. Editing it would quietly undo the
  // decision, which is what the API says too.
  if (review?.status === 'removed') {
    return (
      <ContentPage
        trail={trail}
        title={`Review ${listing.name}`}
        intro="Your review of this hostel was removed by a moderator and can no longer be edited."
      >
        <Section title="What happens now">
          <Paragraph>
            We remove a review only if it names a private individual or contains a threat, and we
            say so publicly when we do. If you think that was wrong, email us and a person will look
            at it again.
          </Paragraph>
          <Button href="/safety" variant="secondary">
            Read the guidelines
          </Button>
        </Section>
      </ContentPage>
    );
  }

  if (!eligible && !review) {
    return (
      <ContentPage
        trail={trail}
        title={`Review ${listing.name}`}
        intro={`You do not have a confirmed or completed enquiry with ${listing.name} yet, so you cannot review it.`}
      >
        <Section title="Why the rule exists">
          <Paragraph>
            A review here has to come from somebody who dealt with this hostel. A pending enquiry
            does not qualify, because anybody can send one in ten seconds and a competitor could
            bury a listing without ever visiting it. An enquiry the owner turned down does not
            qualify either: there is no stay to describe and no tenancy for the owner to answer for.
          </Paragraph>
          <Paragraph>
            Once the owner confirms your enquiry, or once your stay is finished, this page opens up
            and stays open.
          </Paragraph>
        </Section>

        <div className="flex flex-wrap gap-2">
          <Button href={`/hostels/${listing.slug}`}>Back to {listing.name}</Button>
          <Button href="/reviews" variant="secondary">
            Read other reviews
          </Button>
        </div>

        <FinePrint>
          Something wrong with this listing rather than your stay? Report it instead, and you do not
          need an enquiry to do that.
        </FinePrint>
      </ContentPage>
    );
  }

  const name = publishedName(session.name);

  return (
    <ContentPage
      trail={trail}
      title={review ? `Edit your review of ${listing.name}` : `Review ${listing.name}`}
      intro={
        review
          ? 'You have already reviewed this hostel. You get one review per hostel, so this edits the one you wrote rather than adding a second.'
          : 'Only students with an account and a confirmed or completed enquiry can review. The owner can reply once, and nobody can delete what you write.'
      }
    >
      <WriteReviewForm hostel={listing} review={review} displayName={name} />

      {!review ? (
        <Callout title="One review per hostel">
          You can come back and edit this at any time. What you cannot do is write a second one, and
          neither can anybody else, which is what keeps a listing from being flooded.
        </Callout>
      ) : null}
    </ContentPage>
  );
}

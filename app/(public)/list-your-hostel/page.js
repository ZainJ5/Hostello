import { connectDB } from '@/lib/db';
import Hostel from '@/models/Hostel';
import Button from '@/components/ds/Button';
import ContentPage from '@/components/content/PageShell';
import {
  Callout,
  FinePrint,
  NoteList,
  Paragraph,
  Section,
  SupportContact,
} from '@/components/content/Blocks';

export function generateMetadata() {
  return {
    title: 'List your hostel',
    description:
      'Publish your hostel on Hostello and appear in every search that matches it. A flat fee to list, no commission on your rent, no way to buy placement, and enquiries that come straight to you.',
    alternates: { canonical: '/list-your-hostel' },
  };
}

const COSTS = [
  {
    title: 'A flat fee to list',
    body: 'Owners pay one flat fee. Students pay nothing at all, and Hostello takes no commission on your rent and no finder fee from either side.',
  },
  {
    title: 'You cannot buy placement',
    body: 'There is no paid ranking and no promoted slot. Search sorts on what a student asked for: rent, who can stay, and distance from their campus. Paying the listing fee moves nothing.',
  },
  {
    title: 'We never take the enquiry',
    body: 'Hostello does not hold rooms, does not take deposits and does not sit between you and the student. There is nothing for us to take a cut of.',
  },
];

const ASKED = [
  {
    title: 'An address we can confirm',
    body: 'Your listing goes live once a person has confirmed the hostel exists at that address and that the number is answered by you or your warden. That check is what the Verified badge means.',
  },
  {
    title: 'Rent, and the deposit if you take one',
    body: 'Students compare on total move in cost. A listing that hides the deposit until the visit is the listing that gets skipped, and it is the thing they most often report as wrong.',
  },
  {
    title: 'Photographs you took',
    body: 'Phone photos are fine. Do not send a photo of a printed banner or a screenshot from another site. Photo quality is not a ranking signal here and never will be.',
  },
  {
    title: 'A number that gets answered',
    body: 'The number on the listing is the one students will ring. If it goes unanswered the listing stops earning enquiries, and a number answered by an agent reselling the room gets the listing removed.',
  },
];

async function loadReach() {
  try {
    await connectDB();
    const [row] = await Hostel.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: null, total: { $sum: 1 }, cities: { $addToSet: '$city' } } },
    ]);
    return {
      total: row?.total || 0,
      cities: (row?.cities || []).filter(Boolean).length,
    };
  } catch (error) {
    console.error('[list-your-hostel] could not load reach:', error?.message || error);
    return { total: 0, cities: 0 };
  }
}

export default async function ListYourHostelPage() {
  const reach = await loadReach();

  return (
    <ContentPage
      trail={[
        { href: '/', label: 'Home' },
        { label: 'List your hostel' },
      ]}
      title="List your hostel where students are already searching"
      intro="Students search Hostello by campus, not by guesswork. Publish your rooms, your rent and your photos once, and your hostel appears in every search that matches it, in your sector and near the universities you actually serve."
    >
      <Section title="What it costs">
        <NoteList items={COSTS} />
      </Section>

      <Section title="What we will ask you for">
        <NoteList items={ASKED} />
      </Section>

      <Section title="What you get back">
        <Paragraph>
          Enquiries come to you directly, by phone, by WhatsApp, or as a message through the site.
          Hostello does not sit in the middle, does not take a cut, and does not resell your number
          to anybody.
        </Paragraph>
        <Paragraph>
          An enquiry is a student telling you they are interested. It reserves nothing and holds no
          room, so nothing on this site can commit you to a tenant you have not met.
        </Paragraph>
      </Section>

      <Section title="Reviews">
        <Paragraph>
          Students with an account can review you, and only students who hold a confirmed or
          completed enquiry with your hostel can do it. You can reply once to any review. You cannot
          remove one, and neither can we unless it names a private individual or contains a threat.
          That rule is the only reason the reviews are worth anything to the students reading them.
        </Paragraph>
      </Section>

      {reach.total > 0 ? (
        <Section title="Who is already here">
          <Paragraph>
            {reach.total} hostels are published across {reach.cities}{' '}
            {reach.cities === 1 ? 'city' : 'cities'}, listed by campus so a student searching near
            their university finds them without knowing the name of the sector.
          </Paragraph>
        </Section>
      ) : null}

      <Callout title="Getting listed">
        Create an owner account, add your hostel, and a person will check it before it appears in
        search. If anything is unclear we come back to you with a reason rather than rejecting it
        silently.
      </Callout>

      <div className="flex flex-wrap gap-2">
        <Button href="/signup?role=owner">Create an owner account</Button>
        <Button href="/login" variant="secondary">
          Sign in
        </Button>
      </div>

      <Section title="Talk to a person first">
        <Paragraph>
          If you would rather ask before you sign up, email or call. The team that answers is the
          team that checks the listings.
        </Paragraph>
        <SupportContact />
        <FinePrint>
          The owner console is a separate area of the site and is not part of the student pages.
        </FinePrint>
      </Section>
    </ContentPage>
  );
}

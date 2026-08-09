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
    title: 'About Hostello',
    description:
      'Hostello is a directory of student hostels across Pakistan. How a listing is checked, what the Verified badge means, what the site does not know, and why there is never a commission.',
    alternates: { canonical: '/about' },
  };
}

const CHECKS = [
  {
    title: 'A person reads every submission',
    body: 'Address, rents, photos and contact details are checked against each other before a listing can appear in search. Anything that does not add up goes back to the owner with a reason.',
  },
  {
    title: 'Verified means confirmed, not claimed',
    body: 'The badge is applied once we have confirmed the hostel exists at the address given and that the listed number is answered by the owner or the warden, not by an agent reselling the room.',
  },
  {
    title: 'Reviews stay with the student',
    body: 'Reviews come from account holders who enquired and stayed. An owner can reply once and can never delete a review, and we do not sell placement in search results.',
  },
  {
    title: 'You pay the hostel, never us',
    body: 'Hostello takes no commission on your rent and charges no finder fee. Owners pay a flat fee to list. Students pay nothing at all.',
  },
];

/**
 * Real aggregates only. The About page used to carry a "Student reviews" figure
 * that read 0 on every visit, because the legacy per listing counts were never
 * backed by Review documents. A stat that is always zero is not a stat, so the
 * slot is gone rather than being filled with the legacy total.
 */
async function loadStats() {
  try {
    await connectDB();
    const [row] = await Hostel.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: { $sum: { $cond: ['$verified', 1, 0] } },
          cities: { $addToSet: '$city' },
          campuses: { $addToSet: '$universities' },
        },
      },
    ]);

    const campuses = new Set();
    for (const list of row?.campuses || []) {
      for (const name of list || []) if (name) campuses.add(name);
    }

    return {
      total: row?.total || 0,
      verified: row?.verified || 0,
      cities: (row?.cities || []).filter(Boolean).sort(),
      campuses: campuses.size,
    };
  } catch (error) {
    console.error('[about] could not load stats:', error?.message || error);
    return { total: 0, verified: 0, cities: [], campuses: 0 };
  }
}

/** "Islamabad, Rawalpindi, Lahore and Karachi", or nothing when we have none. */
function cityList(cities) {
  if (cities.length === 0) return '';
  if (cities.length === 1) return cities[0];
  return `${cities.slice(0, -1).join(', ')} and ${cities[cities.length - 1]}`;
}

export default async function AboutPage() {
  const stats = await loadStats();
  const where = cityList(stats.cities);

  return (
    <ContentPage
      trail={[
        { href: '/', label: 'Home' },
        { label: 'About Hostello' },
      ]}
      title="Finding a hostel should not depend on who you know"
      intro="Most students in Pakistan still find their room through a WhatsApp forward, a Facebook group or a cousin who studied here two years ago. You arrive, you look at one room, and you sign, with no idea what the rent should be or whether the photos were real."
    >
      <Section title="What Hostello is">
        <Paragraph>
          A public directory of student hostels, organised the way students actually search: by
          campus first, then by city, who can stay, and rent. Every listing carries the same
          information in the same place, so two hostels can be compared instead of guessed at.
        </Paragraph>
        <Paragraph>
          We are not an agency and we do not hold rooms. There is no booking here and there is no
          payment here. When you find something you like you send an enquiry, then you contact the
          hostel yourself, visit it yourself, and deal with the owner directly.
        </Paragraph>
      </Section>

      <Section title="How a listing gets on the site">
        <NoteList items={CHECKS} />
      </Section>

      {/* The section the rest of this site is judged by. Every claim below is
          something the database genuinely does not hold, and each one is a
          slot the design originally asked to be filled with a guess. */}
      <Section title="What we do not know">
        <Paragraph>
          Some things on this site are missing on purpose. We do not know how many beds are free in
          a room, because that comes from owners and we have not built the tool for them to tell us.
          We do not know how long it takes to walk to your campus, so we show straight line distance
          and say so. We do not report how many times a listing was viewed, because we do not
          measure it. Where a number is not real, there is no number.
        </Paragraph>
      </Section>

      <Section title="Where we are today">
        {stats.total > 0 ? (
          <Paragraph>
            {stats.total} listings{where ? ` across ${where}` : ''}
            {stats.campuses > 0 ? `, mapped to ${stats.campuses} campuses` : ''}.{' '}
            {stats.verified > 0
              ? `${stats.verified} carry the Verified badge.`
              : 'None carry the Verified badge yet.'}
          </Paragraph>
        ) : (
          <Paragraph>
            The directory is being rebuilt and no listings are published right now. Nothing is shown
            here until it is real.
          </Paragraph>
        )}
        <FinePrint>
          Distances are measured in a straight line from the listing to the campus, not as a walking
          route, because a route needs a road graph we do not hold.
        </FinePrint>
      </Section>

      <Section title="Something wrong with a listing?">
        <Paragraph>
          If a rent is out of date, a photo does not match the room, or a hostel has closed, report
          it and we will check. Anything about safety is handled the same day and the listing comes
          down while we check rather than after.
        </Paragraph>
        <div className="flex flex-wrap gap-2">
          <Button href="/report-listing" variant="secondary">
            Report a listing
          </Button>
          <Button href="/safety" variant="secondary">
            Read the safety guidelines
          </Button>
        </div>
      </Section>

      <Section title="Who runs Hostello">
        <Paragraph>
          Hostello is a product of xaviot.com, a small team in Islamabad. Everything on this site is
          built and checked by that team. There is no call centre, no sales floor and no agent
          network behind it.
        </Paragraph>
        <SupportContact />
      </Section>

      <Callout title="Ready to look?">
        Browse the full directory by campus, city and rent, or list a hostel you own. Students pay
        nothing either way.
      </Callout>

      <div className="flex flex-wrap gap-2">
        <Button href="/hostels">Browse hostels</Button>
        <Button href="/list-your-hostel" variant="secondary">
          List your hostel
        </Button>
      </div>
    </ContentPage>
  );
}

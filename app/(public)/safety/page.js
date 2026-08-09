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
    title: 'Safety guidelines',
    description:
      'What actually goes wrong when students look for a hostel in Pakistan, the warning signs worth walking away from, and how to report a listing to Hostello the same day.',
    alternates: { canonical: '/safety' },
  };
}

const BEFORE = [
  {
    title: 'Visit before you transfer money',
    body: 'Never pay a deposit for a room you have not seen. If somebody will only take payment before a visit, that is the single strongest warning sign in this market.',
  },
  {
    title: 'Take somebody with you',
    body: 'A friend, a sibling or a parent. Go in daylight and tell one person where you are going and when you expect to be back.',
  },
  {
    title: 'Get the deposit in writing',
    body: 'A message on WhatsApp counts. Ask for the amount, the notice period, and exactly what would make them keep it. Hostello does not hold the deposit and cannot recover one for you.',
  },
  {
    title: 'Check the number against the listing',
    body: 'The number on the listing is the one we confirmed was answered by the owner or the warden. If you were given a different number by a third person, ring the listed one as well.',
  },
];

const WALK_AWAY = [
  {
    title: 'The person will not meet you at the hostel',
    body: 'An owner or a warden meets you at the building. Somebody who wants to meet elsewhere and hand over keys is not the owner.',
  },
  {
    title: 'The rent is far under everything nearby',
    body: 'Compare against the other listings in the same sector on this site. If it sits thousands below all of them, ask why on the call before you go.',
  },
  {
    title: 'You are pushed to decide today',
    body: 'Rooms do go. Nobody legitimate needs a decision in an hour and a deposit before you have seen the room.',
  },
  {
    title: 'The photos do not match the building',
    body: 'If what you are standing in front of is not what you saw on the listing, stop there and report it. That listing is wrong whether or not anyone meant it to be.',
  },
];

export default function SafetyPage() {
  return (
    <ContentPage
      trail={[
        { href: '/', label: 'Home' },
        { label: 'Safety guidelines' },
      ]}
      title="Safety guidelines"
      intro="Hostello checks that a hostel exists and that the number on the listing is answered by the person who runs it. It cannot check what happens after you move in. These are the things that actually go wrong, and what to do about them."
    >
      <Section title="Before you pay anything">
        <NoteList items={BEFORE} />
      </Section>

      <Section title="Signs to walk away from">
        <NoteList items={WALK_AWAY} />
      </Section>

      <Section title="What Hostello is not">
        <Paragraph>
          Hostello is a directory. We never hold a room, never take a deposit and never take a
          commission on your rent. What you send through this site is an enquiry, not a booking, and
          it does not reserve anything. Every payment you make is made to the hostel, so every
          payment is between you and the hostel.
        </Paragraph>
        <Paragraph>
          That also means we cannot get money back for you. What we can do is take a listing down
          and stop it happening to the next student, which is why reporting matters more here than
          it would on a site that held your money.
        </Paragraph>
      </Section>

      <Section title="Report it the same day">
        <Paragraph>
          If a listing is unsafe, if somebody asked you for money before a visit, or if the person
          you met was not the owner, tell us. Reports about safety are handled the same day, and the
          listing comes down while we check rather than after.
        </Paragraph>

        <div className="flex flex-wrap gap-2">
          <Button href="/report-listing">Report a listing</Button>
        </div>

        <FinePrint>
          In an emergency call 15 for police or 1122 for rescue. Hostello is a directory and cannot
          help in the moment.
        </FinePrint>
      </Section>

      <Section title="Talk to us">
        <SupportContact />
      </Section>

      <Callout title="The owner is never told who reported them">
        We tell an owner what was reported so they can answer it, never who reported it. Your name
        does not reach the hostel, and you do not need an account to send a report.
      </Callout>
    </ContentPage>
  );
}

import ContentPage from '@/components/content/PageShell';
import {
  Callout,
  FinePrint,
  NoteList,
  Paragraph,
  Section,
  SupportContact,
} from '@/components/content/Blocks';

/** See the note on the same constant in the terms page. */
const LAST_UPDATED = '9 August 2026';

export function generateMetadata() {
  return {
    title: 'Privacy policy',
    description:
      'What Hostello holds about you, what a hostel owner sees when you send an enquiry, what we never do with your details, and what happens when you delete your account.',
    alternates: { canonical: '/privacy' },
  };
}

const HELD = [
  {
    title: 'Your name, university and email',
    body: 'Given at signup. Your first name and your university go to a hostel owner when you send them an enquiry. Your email address never does.',
  },
  {
    title: 'Your saved hostels and your enquiries',
    body: 'Kept so you can see them. Hostello records that you sent an enquiry to an owner. It does not see the call or the WhatsApp conversation that follows, because those do not go through this site.',
  },
  {
    title: 'Your roommate answers',
    body: 'Used only to suggest roommates. They are never shown on your profile and never readable by another student, and that is enforced in the query rather than by hiding them in a component.',
  },
  {
    title: 'Your reviews and your questions',
    body: 'Published under your first name and the initial of your surname, alongside your year and university if you gave them. Everything else on your account stays private.',
  },
  {
    title: 'A report you send us',
    body: 'Held so a person can act on it. A report is never shown publicly, and the hostel is told what was reported so they can answer it, never who reported it.',
  },
];

export default function PrivacyPage() {
  return (
    <ContentPage
      trail={[
        { href: '/', label: 'Home' },
        { label: 'Privacy policy' },
      ]}
      title="Privacy policy"
      intro="What Hostello holds about you, who sees it, and what happens when you leave. If something is not listed here, we do not collect it."
      meta={`Last updated ${LAST_UPDATED}. Hostello is operated by xaviot.com, Islamabad, Pakistan.`}
    >
      <Section title="What we hold">
        <NoteList items={HELD} />
      </Section>

      <Section title="What we do not do">
        <Paragraph>
          We do not sell your details to hostels, to agents, or to anybody else. There is no broker
          in this product to sell them to. We do not run advertising, we do not accept payment for
          placement in search results, and we do not build a profile of you to sell on.
        </Paragraph>
        <Paragraph>
          We do not ask for your CNIC, your family details or your payment information, because
          Hostello never takes a payment from a student and has nothing to verify you against.
        </Paragraph>
      </Section>

      <Section title="What an owner sees">
        <Paragraph>
          An owner sees your first name, your university and your message when you send an enquiry
          through the site. They do not see your email address. If you call the number on a listing
          or open WhatsApp from it, they see your phone number, because you dialled them directly
          and that conversation does not pass through Hostello.
        </Paragraph>
      </Section>

      <Section title="What other students see">
        <Paragraph>
          Other students see what you chose to publish: your reviews and your questions, under your
          first name and the initial of your surname. They never see your email address, your
          enquiries, your saved hostels or your roommate answers.
        </Paragraph>
      </Section>

      <Section title="Cookies and measurement">
        <Paragraph>
          One cookie keeps you signed in. One entry in your browser storage remembers whether you
          chose the light or the dark theme. Neither is used to track you across other sites, and
          there are no advertising or third party tracking cookies on Hostello.
        </Paragraph>
      </Section>

      <Section title="Deleting your account">
        <Paragraph>
          Deleting your account removes your roommate answers, your saved hostels, your enquiries
          and your contact details. Reviews and answers you wrote for other students stay, with your
          name removed, because taking them down would remove information other students relied on
          when they chose where to live.
        </Paragraph>
        <FinePrint>
          If you would rather everything went, including what you wrote, email us and say so and we
          will do it by hand.
        </FinePrint>
      </Section>

      <Section title="Asking us about your data">
        <Paragraph>
          Email us and ask what we hold about you, ask us to correct it, or ask us to delete it. A
          person reads that inbox and will answer you.
        </Paragraph>
        <SupportContact />
      </Section>

      <Callout title="This is a plain language version, not legal advice">
        This policy describes what Hostello actually does with your information. It has not been
        drafted by a lawyer, and nothing here is legal advice or a waiver of any right Pakistani law
        gives you.
      </Callout>
    </ContentPage>
  );
}

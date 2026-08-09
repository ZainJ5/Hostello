import ContentPage from '@/components/content/PageShell';
import {
  Callout,
  FinePrint,
  NoteList,
  Paragraph,
  Section,
  SupportContact,
} from '@/components/content/Blocks';

/**
 * The date the wording on this page last changed. It is a constant rather than
 * a build timestamp, because "last updated" has to mean the last time the
 * terms actually changed, not the last time the site was deployed.
 */
const LAST_UPDATED = '9 August 2026';

export function generateMetadata() {
  return {
    title: 'Terms of use',
    description:
      'The terms you agree to when you use Hostello. We are a directory, we are not a party to any agreement between you and a hostel, we hold no rooms, and we take no money from students.',
    alternates: { canonical: '/terms' },
  };
}

const SHORT = [
  {
    title: 'Hostello is a directory',
    body: 'We publish listings and check them. We are not a party to any agreement between you and a hostel, we do not hold rooms, we do not take deposits, and we take no money from students.',
  },
  {
    title: 'The listing is the owner information',
    body: 'Rents, facilities, mess menus and contact details are typed by the owner. We check them at review and they can change afterwards. Confirm everything on the call and again on the visit.',
  },
  {
    title: 'An enquiry is not a booking',
    body: 'Sending an enquiry tells a hostel you are interested and passes on your first name, your university and your message. It reserves nothing and it holds no room for you.',
  },
  {
    title: 'Your review is yours',
    body: 'You own what you write. An owner can reply once and can never remove it. We remove a review only if it names a private individual or contains a threat, and we say so publicly when we do.',
  },
  {
    title: 'You can leave',
    body: 'Delete your account at any time from your account settings. What happens to what you wrote is set out in the privacy policy.',
  },
];

export default function TermsPage() {
  return (
    <ContentPage
      trail={[
        { href: '/', label: 'Home' },
        { label: 'Terms of use' },
      ]}
      title="Terms of use"
      intro="These are the terms you agree to when you use Hostello. They are written in plain language on purpose, because terms nobody reads protect nobody."
      meta={`Last updated ${LAST_UPDATED}. Hostello is operated by xaviot.com, Islamabad, Pakistan.`}
    >
      <Section title="The short version">
        <NoteList items={SHORT} />
      </Section>

      <Section title="Using the site">
        <Paragraph>
          You may browse the directory without an account. An account is required to save a hostel,
          keep a record of an enquiry, write a review, or use roommate matching. You must be 16 or
          older to create one, and the details you give at signup must be your own.
        </Paragraph>
        <Paragraph>
          One person gets one account. Do not create an account on behalf of a hostel in order to
          review it, review your own hostel, or ask anybody to write a review they did not earn. We
          remove accounts that do, along with everything written from them.
        </Paragraph>
      </Section>

      <Section title="What we do not promise">
        <Paragraph>
          We do not guarantee that a room is available, that the rent shown is current, that a
          hostel will honour anything it told you, or that any listing will remain on the site. We
          check listings before they go live. We cannot check what happens after you move in.
        </Paragraph>
        <Paragraph>
          Distances on this site are measured in a straight line from the listing to the campus,
          not as a walking route. Where a listing shows a rating carried over from before Hostello
          collected reviews here, we say so on the listing rather than presenting it as a review
          score.
        </Paragraph>
      </Section>

      <Section title="Money">
        <Paragraph>
          Hostello never takes payment from a student. There is no service charge, no finder fee and
          no commission on your rent. Every payment you make goes to the hostel, and every dispute
          about a payment is between you and the hostel.
        </Paragraph>
        <Paragraph>
          If somebody asks you to pay Hostello, or to pay for a room through Hostello, it is not us.
          Report it and we will take the listing down while we check.
        </Paragraph>
      </Section>

      <Section title="Reviews and what you post">
        <Paragraph>
          A review has to come from your own experience of the hostel, and you can write one only
          for a hostel where you hold a confirmed or completed enquiry. You get one review per
          hostel, which you can edit.
        </Paragraph>
        <Paragraph>
          Do not name a private individual, post a phone number or an address that is not yours,
          threaten anybody, or post anything you know to be untrue. Other students can flag a review, and a review
          that collects enough flags is hidden while a person reads it. An owner can reply once and
          can never delete a review, including their own listing reviews.
        </Paragraph>
      </Section>

      <Section title="Owners">
        <Paragraph>
          Owners pay a flat fee to list. Paying it does not buy placement in search results, and
          there is no way to buy placement. A listing must describe the hostel that exists at the
          address given, be answered on the number provided, and use photographs of that building.
        </Paragraph>
        <Paragraph>
          We remove a listing that asks students for money before a visit, that is answered by
          somebody who is not the owner or the warden, or that carries photographs of a different
          building. Where a report concerns safety, the listing comes down while we check.
        </Paragraph>
      </Section>

      <Section title="Ending it">
        <Paragraph>
          You can delete your account at any time. We can suspend an account or remove a listing
          that breaks these terms, and we will say why. If we ever stop running Hostello, we will
          say so on the site before we do.
        </Paragraph>
      </Section>

      <Section title="Questions about these terms">
        <SupportContact />
      </Section>

      <Callout title="This is a plain language version, not legal advice">
        These terms describe how Hostello actually works and what it will and will not do. They have
        not been drafted by a lawyer, and nothing here is legal advice. Where Pakistani law gives
        you a right, these terms do not take it away.
      </Callout>

      <FinePrint>
        If we change these terms in a way that affects what you agreed to, we will change the date
        at the top and say what changed.
      </FinePrint>
    </ContentPage>
  );
}

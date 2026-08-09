import { cache } from 'react';
import { notFound } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { formatPKR, serialize } from '@/lib/utils';
import Booking from '@/models/Booking';
import Hostel from '@/models/Hostel';
import User from '@/models/User';
import { ACTIVE_BOOKING_STATUSES } from '@/components/student/constants';

import Container from '@/components/public/Container';
import Breadcrumbs from '@/components/hostels/Breadcrumbs';
import EnquiryForm from '@/components/hostels/EnquiryForm';
import ShareButton from '@/components/hostels/ShareButton';
import SaveButton from '@/components/hostels/SaveButton';
import { hostelsHref } from '@/components/hostels/filters';
import { genderWord } from '@/components/hostels/browse-copy';

export const dynamic = 'force-dynamic';

const SELECT =
  '_id name slug city area gender images price priceMin priceMax rooms contact status';

const getHostel = cache(async (slug) => {
  if (!slug) return null;
  await connectDB();
  return Hostel.findOne({ slug, status: 'published' }).select(SELECT).lean();
});

function rentLine(hostel) {
  const min = Number(hostel.priceMin) || Number(hostel.price) || 0;
  const max = Number(hostel.priceMax) || 0;
  if (min && max && max > min) return `${formatPKR(min)} to ${formatPKR(max)}`;
  return min ? formatPKR(min) : '';
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const hostel = await getHostel(slug);
  if (!hostel) return { title: 'Listing not found', robots: { index: false, follow: true } };

  return {
    title: `Contact ${hostel.name}`,
    description: `Call, WhatsApp or message ${hostel.name} in ${hostel.city} through Hostello. No commission, no finder fee, and nothing is reserved or paid here.`,
    // A contact form is not a page a search engine should be sending people to.
    robots: { index: false, follow: true },
  };
}

/**
 * Figma page/enquire 79:1343.
 *
 * NO LOGIN GATE. The page it replaces redirected to sign in before it rendered
 * anything, which put an account between a student and a phone number that is
 * printed on the listing above it. Calling and WhatsApp need nothing. Only the
 * message route needs an account, and it asks for one at the point of use.
 *
 * THE TRACKER IS ABSENT. The frame's side panel carries a four stage strip,
 * Saved, Family, Visit, Contacted, that the student moves themselves. Nothing
 * in the data model records any of those four, `slot-strip/request-status` is
 * not in components/ds, and the account area that would own it belongs to
 * another part of this rebuild. Drawing four empty segments would assert a
 * feature that does not exist, so the panel carries what is real instead: the
 * listing, and the two things a student does next.
 */
export default async function EnquirePage({ params }) {
  const { slug } = await params;

  const [doc, session] = await Promise.all([getHostel(slug), getSession()]);
  if (!doc) notFound();

  let user = null;
  let existing = null;

  if (session) {
    [user, existing] = await Promise.all([
      User.findById(session.userId).select('name email phone').lean(),
      Booking.findOne({
        hostelId: doc._id,
        studentId: session.userId,
        status: { $in: ACTIVE_BOOKING_STATUSES },
      })
        .select('_id status createdAt')
        .lean(),
    ]);
  }

  const hostel = serialize(doc);
  const where = [hostel.area, hostel.city].filter(Boolean).join(', ') || hostel.city;
  const rent = rentLine(hostel);
  const who = genderWord(hostel.gender);

  const crumbs = [
    { href: '/', label: 'Home' },
    { href: hostelsHref({ city: [hostel.city] }), label: hostel.city },
    {
      href: hostelsHref({ city: [hostel.city], gender: hostel.gender }),
      label: who ? `${who} hostels` : 'Hostels',
    },
    { href: `/hostels/${hostel.slug}`, label: hostel.name },
    { label: 'Contact the owner' },
  ];

  return (
    <>
      <Container as="section" className="flex flex-col gap-4 pb-6 pt-6">
        <Breadcrumbs items={crumbs} />
        <h1 className="ds-display-xl text-balance text-ds-ink">Contact the owner</h1>
        <p className="ds-body-l max-w-[85ch] text-pretty text-ds-ink-muted">
          {hostel.name}, {where}.{rent ? ` ${rent} a month.` : ''}
        </p>

        <div className="ds-elevated flex flex-col gap-1 rounded-ds-inner p-3.5">
          <p className="ds-body-m-strong text-ds-ink">
            Hostello does not hold rooms and takes no commission
          </p>
          <p className="ds-body-s max-w-[100ch] text-pretty text-ds-ink-muted">
            You are contacting the hostel directly. Nothing is reserved, nothing is paid here,
            and no agent sits in between. Hostello only records that you got in touch, so you can
            keep track of who you have spoken to.
          </p>
        </div>
      </Container>

      <Container as="section" className="pb-16 pt-2">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_25rem]">
          <EnquiryForm
            hostel={hostel}
            user={user ? serialize(user) : null}
            existing={existing ? serialize(existing) : null}
          />

          <aside className="ds-elevated flex flex-col gap-4 self-start rounded-ds-inner p-5 lg:sticky lg:top-4">
            <div className="flex flex-col gap-2">
              <h2 className="ds-display-s text-ds-ink">Before you call</h2>
              <p className="ds-body-s text-pretty text-ds-ink-muted">
                Four things the listing cannot tell you, because no owner has recorded them:
                what the gate timing is, whether the deposit comes back, what the rent includes
                beyond the room, and what the mess does on a Sunday. Ask all four on the call.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 border-t border-solid border-ds-hairline pt-4">
              <ShareButton title={hostel.name} text={`${hostel.name}, ${where}`} />
              <SaveButton hostelId={String(hostel._id)} />
            </div>

            <p className="ds-body-s border-t border-solid border-ds-hairline pt-4 text-ds-ink-muted">
              Hostello never asks for a payment and never takes one. If anybody on a listing asks
              you to pay Hostello, it is not us.
            </p>
          </aside>
        </div>
      </Container>
    </>
  );
}

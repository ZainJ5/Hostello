import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { serialize } from '@/lib/utils';
import Hostel from '@/models/Hostel';
import ContentPage from '@/components/content/PageShell';
import { FinePrint, Section, SupportContact } from '@/components/content/Blocks';
import ReportListingForm from '@/components/content/ReportListingForm';

export const dynamic = 'force-dynamic';

/** The listing named in `?hostel=<slug>`, or null when the page is reached cold. */
async function loadHostel(slug) {
  if (!slug) return null;
  try {
    await connectDB();
    const row = await Hostel.findOne({ slug: String(slug), status: 'published' })
      .select('name slug city area')
      .lean();
    return row ? serialize(row) : null;
  } catch (error) {
    console.error('[report-listing] could not load hostel:', error?.message || error);
    return null;
  }
}

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const hostel = await loadHostel(sp?.hostel);

  return {
    title: hostel ? `Report ${hostel.name}` : 'Report a listing',
    description:
      'Tell Hostello about a listing that is wrong or unsafe. Reports about safety are handled the same day and the listing comes down while we check. The owner is never told who reported them.',
    // The listing variants are the same page with a name filled in, so only the
    // clean URL is worth indexing. Link equity still passes through.
    alternates: { canonical: '/report-listing' },
    ...(hostel ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ReportListingPage({ searchParams }) {
  const sp = await searchParams;
  const hostel = await loadHostel(sp?.hostel);
  const session = await getSession();

  const where = hostel ? [hostel.area, hostel.city].filter(Boolean).join(', ') : '';

  return (
    <ContentPage
      trail={
        hostel
          ? [
              { href: '/', label: 'Home' },
              { href: `/hostels/${hostel.slug}`, label: hostel.name },
              { label: 'Report this listing' },
            ]
          : [
              { href: '/', label: 'Home' },
              { label: 'Report a listing' },
            ]
      }
      title={hostel ? 'Report this listing' : 'Report a listing'}
      intro={
        hostel
          ? `${hostel.name}${where ? `, ${where}` : ''}. Anything about safety is handled the same day and the listing comes down while we check, not after.`
          : 'Tell us about a listing that is wrong or unsafe. Anything about safety is handled the same day and the listing comes down while we check, not after.'
      }
      meta="You do not need an account to send a report."
    >
      <ReportListingForm hostel={hostel} signedIn={Boolean(session)} />

      <Section title="Would rather email?">
        <SupportContact />
        <FinePrint>
          A report you send here reaches the same people. It is never shown publicly, and it never
          appears on the listing or anywhere in the reviews.
        </FinePrint>
      </Section>
    </ContentPage>
  );
}

import { cache } from 'react';
import { notFound } from 'next/navigation';

import { connectDB } from '@/lib/db';
import Hostel from '@/models/Hostel';
import { cn, serialize } from '@/lib/utils';

import Container from '@/components/public/Container';
import Badge from '@/components/ds/Badge';

import Breadcrumbs from '@/components/hostels/Breadcrumbs';
import Gallery from '@/components/hostels/Gallery';
import FacilitiesGrid from '@/components/hostels/FacilitiesGrid';
import MessMenu, { hasMess } from '@/components/hostels/MessMenu';
import CampusDistance from '@/components/hostels/CampusDistance';
import ReviewsSection, { loadReviews } from '@/components/hostels/ReviewsSection';
import SimilarHostels, { loadSimilar } from '@/components/hostels/SimilarHostels';
import { ContactCard, MobileContactBar } from '@/components/hostels/ContactPanel';
import ViewTracker from '@/components/hostels/ViewTracker';
import { hostelsHref } from '@/components/hostels/filters';
import { genderWord } from '@/components/hostels/browse-copy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * `cache` de-duplicates the lookup between `generateMetadata` and the page
 * body, which React renders in the same request, so it costs one query.
 */
const getHostel = cache(async (slug) => {
  if (!slug) return null;
  await connectDB();
  return Hostel.findOne({ slug, status: 'published' }).lean();
});

function absoluteUrl(src) {
  if (!src) return null;
  return /^https?:\/\//i.test(src) ? src : `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
}

/**
 * 65 of 124 listings carry real owner uploads and 51 fall back to stock URLs
 * the import wrote. The two are not the same claim, so the page says which it
 * is rather than presenting a stock room as this hostel's room.
 */
function ownerPhotographed(images) {
  return (images || []).some((s) => typeof s === 'string' && s.startsWith('/uploads'));
}

function priceLine(hostel) {
  const min = Number(hostel.priceMin) || Number(hostel.price) || 0;
  const max = Number(hostel.priceMax) || 0;
  if (min && max && max > min) {
    return `PKR ${min.toLocaleString('en-PK')} to ${max.toLocaleString('en-PK')}`;
  }
  return min ? `PKR ${min.toLocaleString('en-PK')}` : '';
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const hostel = await getHostel(slug);
  if (!hostel) return { title: 'Listing not found', robots: { index: false, follow: true } };

  const where = [hostel.area, hostel.city].filter(Boolean).join(', ') || hostel.city;
  const who = genderWord(hostel.gender);
  const unis = (hostel.universities || []).slice(0, 3).join(', ');

  const description = [
    `${who ? `${who} hostel` : 'Student hostel'} in ${where}.`,
    priceLine(hostel) ? `Rent ${priceLine(hostel)} per person per month.` : '',
    unis ? `Near ${unis}.` : '',
    'Photos, what is included, campus distances and the owner’s own number on Hostello.',
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 300);

  const image = absoluteUrl(hostel.images?.[0]);

  // The card carries the listing, not the brand: the hostel's own photograph,
  // its own name and its own address.
  return {
    title: `${hostel.name}, ${hostel.city}`,
    description,
    alternates: { canonical: `/hostels/${hostel.slug}` },
    openGraph: {
      type: 'website',
      title: `${hostel.name} in ${where}`,
      description,
      url: `/hostels/${hostel.slug}`,
      images: image ? [{ url: image, width: 1200, height: 900, alt: hostel.name }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: `${hostel.name}, ${hostel.city}`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/**
 * One section of the listing body: a display/s heading, then the content.
 * Sections whose field is empty on every listing today are not rendered at
 * all, so the page is honest and thinner than the frame looks.
 */
function Section({ id, title, children, className }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={cn('w-full', className)}>
      <h2 id={`${id}-h`} className="ds-display-s text-ds-ink">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function HostelDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;

  const doc = await getHostel(slug);
  if (!doc) notFound();

  const [reviews, similarDocs] = await Promise.all([
    loadReviews(doc._id, Number(sp?.reviews) || 1),
    loadSimilar(doc),
  ]);

  const hostel = serialize(doc);
  const where = [hostel.area, hostel.city].filter(Boolean).join(', ') || hostel.city;
  const photos = (hostel.images || []).filter(Boolean);
  const byOwner = ownerPhotographed(photos);
  const who = genderWord(hostel.gender);
  const showMess = hasMess(hostel);

  const crumbs = [
    { href: '/', label: 'Home' },
    { href: hostelsHref({ city: [hostel.city] }), label: hostel.city },
    {
      href: hostelsHref({ city: [hostel.city], gender: hostel.gender }),
      label: who ? `${who} hostels` : 'Hostels',
    },
    { label: hostel.name },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    '@id': `${SITE_URL}/hostels/${hostel.slug}`,
    name: hostel.name,
    url: `${SITE_URL}/hostels/${hostel.slug}`,
    description: hostel.description || undefined,
    image: photos.map(absoluteUrl).filter(Boolean),
    priceRange: priceLine(hostel) || undefined,
    currenciesAccepted: 'PKR',
    telephone: hostel.contact?.phone || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: hostel.area || undefined,
      addressLocality: hostel.city,
      addressCountry: 'PK',
    },
    geo:
      hostel.lat || hostel.lng
        ? { '@type': 'GeoCoordinates', latitude: hostel.lat, longitude: hostel.lng }
        : undefined,
    amenityFeature: (hostel.facilities || []).map((f) => ({
      '@type': 'LocationFeatureSpecification',
      name: f,
      value: true,
    })),
    // Only claimed when the reviews behind it are on the page. The legacy
    // aggregate is genuine but its write-ups were not carried over, and
    // marking up a score with nothing to read is what earns a penalty.
    aggregateRating:
      reviews.total > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: Number(reviews.overall.toFixed(2)),
            reviewCount: reviews.total,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify does not escape HTML, and neutralising "<" is what
        // keeps a hostile listing name from breaking out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <ViewTracker slug={hostel.slug} />

      {/* ── Header ── */}
      <Container as="section" className="flex flex-col gap-4 pb-6 pt-6">
        <Breadcrumbs items={crumbs} />
        <h1 className="ds-display-xl text-balance text-ds-ink">{hostel.name}</h1>
        <p className="ds-body-l text-ds-ink-muted">{where}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant={hostel.verified ? 'solid' : 'outline'}>
            {hostel.verified ? 'Checked by Hostello' : 'Not checked yet'}
          </Badge>
          <Badge variant="outline">
            {hostel.gender === 'Mixed' ? 'Mixed' : `${hostel.gender} only`}
          </Badge>
          {byOwner ? <Badge variant="outline">Photos from the owner</Badge> : null}
        </div>
      </Container>

      {/* ── Photos ── */}
      <Container as="section" className="flex flex-col gap-4">
        <Gallery images={photos} name={hostel.name} verified={hostel.verified} />
        {photos.length ? (
          <p className="ds-body-s max-w-[95ch] text-ds-ink-muted">
            {byOwner
              ? `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}, uploaded by the owner and not retouched by Hostello. Photo quality varies and it is not a signal of anything: several good hostels here have photographs of a printed banner.`
              : `Stand-in photography. This owner has not uploaded pictures of the hostel yet, so these are not its rooms. Ask for photos when you call.`}
          </p>
        ) : null}
      </Container>

      {/* ── Body ── */}
      <Container as="section" className="pb-28 pt-8 lg:pb-16">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_23.75rem]">
          <div className="flex min-w-px flex-col gap-9">
            {hostel.description ? (
              <Section id="about" title="About this hostel">
                <p className="ds-body-m max-w-[80ch] text-pretty text-ds-ink">
                  {hostel.description}
                </p>
              </Section>
            ) : null}

            {/*
              section/room-types-and-rent, section/who-is-in-each-room and
              section/house-rules are all in the frame and all absent here.
              `rooms`, bed counts and `rules` are empty on every one of the 124
              listings, and drawing them would assert facts the product does
              not hold. They appear the day an owner records them.
            */}

            <Section id="offers" title="What this place offers">
              <FacilitiesGrid facilities={hostel.facilities} />
            </Section>

            {showMess ? (
              <Section id="mess" title="Mess menu">
                <MessMenu
                  menu={hostel.messMenu}
                  images={hostel.messMenuImages}
                  name={hostel.name}
                />
              </Section>
            ) : null}

            <Section id="distance" title="Distance to campus">
              <CampusDistance hostel={hostel} />
            </Section>

            <Section id="reviews-section" title="Reviews">
              <ReviewsSection slug={hostel.slug} hostel={hostel} reviews={reviews} />
            </Section>
          </div>

          {/* `self-start` is what keeps sticky alive: a stretched grid item is
              as tall as the content column and can never stick. */}
          <aside className="hidden self-start lg:block">
            <div className="sticky top-4">
              <ContactCard hostel={hostel} />
            </div>
          </aside>
        </div>

        <SimilarHostels
          hostels={similarDocs}
          className="mt-12 border-t border-solid border-ds-hairline pt-10"
        />
      </Container>

      <MobileContactBar hostel={hostel} />
    </>
  );
}

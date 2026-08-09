import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BadgeCheck,
  ChevronRight,
  CircleHelp,
  Info,
  ScrollText,
  Sparkles,
  Users,
} from 'lucide-react';

import { connectDB } from '@/lib/db';
import Hostel from '@/models/Hostel';
import { cn, formatPriceRange, serialize } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Feedback';

import Gallery from '@/components/hostels/Gallery';
import ShareButton from '@/components/hostels/ShareButton';
import SaveButton from '@/components/hostels/SaveButton';
import ViewTracker from '@/components/hostels/ViewTracker';
import FacilitiesGrid from '@/components/hostels/FacilitiesGrid';
import MessMenu from '@/components/hostels/MessMenu';
import LocationSection from '@/components/hostels/LocationSection';
import ReviewsSection, { loadReviews } from '@/components/hostels/ReviewsSection';
import SimilarHostels, { loadSimilar } from '@/components/hostels/SimilarHostels';
import { BookingCard, MobileBookingBar } from '@/components/hostels/BookingPanel';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * `cache` de-duplicates the lookup between `generateMetadata` and the page
 * body, which React renders in the same request, so it costs one query, not two.
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

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const hostel = await getHostel(slug);
  if (!hostel) return { title: 'Hostel not found' };

  const where = [hostel.area, hostel.city].filter(Boolean).join(', ');
  const price = formatPriceRange(hostel.priceMin || hostel.price, hostel.priceMax || hostel.price);
  const unis = (hostel.universities || []).slice(0, 3).join(', ');

  const description = [
    `${hostel.gender === 'Mixed' ? 'Co-ed' : `${hostel.gender}`} student hostel in ${where || hostel.city}.`,
    `Rent from ${price} per month.`,
    unis ? `Near ${unis}.` : '',
    hostel.reviewCount > 0 ? `Rated ${hostel.rating.toFixed(1)}/5 by ${hostel.reviewCount} students.` : '',
    'Photos, facilities and direct owner contact on Hostello.',
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 300);

  const image = absoluteUrl(hostel.images?.[0]);

  return {
    title: `${hostel.name}, ${hostel.city}`,
    description,
    alternates: { canonical: `/hostels/${hostel.slug}` },
    openGraph: {
      type: 'website',
      title: `${hostel.name} · ${where || hostel.city}`,
      description,
      url: `/hostels/${hostel.slug}`,
      images: image ? [{ url: image, width: 1200, height: 900, alt: hostel.name }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: hostel.name,
      description,
      images: image ? [image] : undefined,
    },
  };
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
  const where = [hostel.area, hostel.city].filter(Boolean).join(', ');
  const rules = (hostel.rules || []).filter(Boolean);
  const messEntries = Object.entries(hostel.messMenu || {}).filter(([, v]) => v);
  const hasMess = messEntries.length > 0 || (hostel.messMenuImages || []).length > 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    '@id': `${SITE_URL}/hostels/${hostel.slug}`,
    name: hostel.name,
    url: `${SITE_URL}/hostels/${hostel.slug}`,
    description: hostel.description || undefined,
    image: (hostel.images || []).map(absoluteUrl).filter(Boolean),
    priceRange: formatPriceRange(hostel.priceMin || hostel.price, hostel.priceMax || hostel.price),
    currenciesAccepted: 'PKR',
    telephone: hostel.contact?.phone || undefined,
    email: hostel.contact?.email || undefined,
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
    aggregateRating:
      reviews.total > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: Number((Number(reviews.averages.overall) || 0).toFixed(2)),
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
        // JSON.stringify does not escape HTML; neutralising "<" is what keeps a
        // hostile listing name from breaking out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <ViewTracker slug={hostel.slug} />

      <div className="mx-auto w-full max-w-[85rem] px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pb-20">
        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="cursor-pointer rounded transition-colors duration-150 hover:text-foreground hover:underline">
                Home
              </Link>
            </li>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
            <li>
              <Link href="/hostels" className="cursor-pointer rounded transition-colors duration-150 hover:text-foreground hover:underline">
                Hostels
              </Link>
            </li>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
            <li>
              <Link
                href={`/hostels?city=${encodeURIComponent(hostel.city)}`}
                className="cursor-pointer rounded transition-colors duration-150 hover:text-foreground hover:underline"
              >
                {hostel.city}
              </Link>
            </li>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
            <li aria-current="page" className="max-w-[16rem] truncate font-medium text-foreground">
              {hostel.name}
            </li>
          </ol>
        </nav>

        {/* ── Header ── */}
        <header className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-h2 text-balance text-foreground">{hostel.name}</h1>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              {hostel.reviewCount > 0 ? (
                <Link
                  href="#reviews"
                  className="inline-flex cursor-pointer items-center rounded transition-opacity duration-150 hover:opacity-80"
                >
                  <Rating value={hostel.rating} count={hostel.reviewCount} size="sm" />
                </Link>
              ) : (
                <span className="text-muted-foreground">No reviews yet</span>
              )}

              <span aria-hidden="true" className="text-border-strong">
                ·
              </span>

              <Link
                href={`/hostels?city=${encodeURIComponent(hostel.city)}`}
                className="cursor-pointer text-muted-foreground underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline"
              >
                {where || hostel.city}
              </Link>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="neutral" size="lg">
                <Users className="size-3.5" aria-hidden="true" />
                {hostel.gender === 'Mixed' ? 'Co-ed' : `${hostel.gender} only`}
              </Badge>
              {hostel.verified && (
                <Badge tone="success" size="lg">
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                  Verified listing
                </Badge>
              )}
              {hostel.featured && (
                <Badge tone="accent" size="lg">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  Featured
                </Badge>
              )}
              {(hostel.universities || []).slice(0, 3).map((u) => (
                <Link key={u} href={`/hostels?university=${encodeURIComponent(u)}`}>
                  <Badge
                    tone="brand"
                    size="lg"
                    className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                  >
                    Near {u}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ShareButton title={hostel.name} text={`${hostel.name}, ${where || hostel.city}`} />
            <SaveButton hostelId={hostel._id} />
          </div>
        </header>

        <Gallery images={hostel.images} name={hostel.name} />

        {/* ── Body ── */}
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] xl:gap-14">
          <div className="min-w-0 space-y-8">
            {hostel.description && (
              <section aria-labelledby="about-h">
                <h2 id="about-h" className="text-h3 text-foreground">
                  About this hostel
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-pretty text-muted-foreground">
                  {hostel.description}
                </p>
              </section>
            )}

            <Section id="facilities" title="What this place offers">
              <FacilitiesGrid facilities={hostel.facilities} />
            </Section>

            {hasMess && (
              <Section
                id="mess"
                title="Mess menu"
                description="What the kitchen serves through the week, straight from the owner."
              >
                <MessMenu
                  menu={hostel.messMenu}
                  images={hostel.messMenuImages}
                  name={hostel.name}
                />
              </Section>
            )}

            <Section id="rules" title="House rules">
              {rules.length > 0 ? (
                <ul className="space-y-3">
                  {rules.map((rule) => (
                    <li key={rule} className="flex items-start gap-3">
                      <ScrollText
                        className="mt-0.5 size-4 shrink-0 text-brand-700 dark:text-brand-300"
                        aria-hidden="true"
                      />
                      <span className="text-sm text-pretty text-muted-foreground">{rule}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface-sunken p-5">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Info className="size-4 text-info" aria-hidden="true" />
                    This owner hasn&apos;t published house rules yet
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Worth confirming before you pay a deposit. These are the four
                    that catch students out most often:
                  </p>
                  <ul className="mt-3 space-y-2">
                    {[
                      'Gate and curfew timings, and whether they differ at weekends',
                      'Guest and family visiting policy',
                      'Notice period for leaving, and whether the deposit is refundable',
                      'What the rent includes: electricity, gas, mess and laundry',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <CircleHelp
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="text-sm text-pretty text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>

            <Section
              id="location"
              title="Where you'll be"
              description="Distances are measured from this listing to each main campus gate."
            >
              <LocationSection hostel={hostel} />
            </Section>

            <Section
              id="reviews-section"
              title="Student reviews"
              description={
                reviews.total > 0
                  ? `${reviews.total} verified stay${reviews.total === 1 ? '' : 's'} reviewed by students who lived here.`
                  : undefined
              }
            >
              <ReviewsSection slug={hostel.slug} reviews={reviews} />
            </Section>
          </div>

          {/* Sticky right rail. `self-start` stops the grid stretching the
              aside to the content column's height, which would kill sticky. */}
          <aside className="hidden self-start lg:block">
            <div className="sticky top-24">
              <BookingCard hostel={hostel} />
            </div>
          </aside>
        </div>

        <SimilarHostels hostels={similarDocs} className="mt-14 border-t border-border pt-10" />
      </div>

      <MobileBookingBar hostel={hostel} />
    </>
  );
}

function Section({ id, title, description, children, className }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className={cn('border-t border-border pt-8', className)}
    >
      <h2 id={`${id}-h`} className="text-h3 text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

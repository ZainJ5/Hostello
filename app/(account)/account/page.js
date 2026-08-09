import Link from 'next/link';
import {
  ArrowRight,
  Bookmark,
  CalendarCheck,
  ChevronRight,
  Clock,
  Compass,
  Sparkles,
  Star,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';
import HostelImage from '@/components/ui/HostelImage';
import HostelCardWithSave from '@/components/student/HostelCardWithSave';
import ProfilePrompt from '@/components/student/ProfilePrompt';
import { HOSTEL_CARD_FIELDS, formatDuration } from '@/components/student/constants';
import { connectDB } from '@/lib/db';
import { formatDate, serialize, timeAgo } from '@/lib/utils';
import Booking from '@/models/Booking';
import Hostel from '@/models/Hostel';
import Review from '@/models/Review';
import { getRecommendations } from '../_lib/recommendations';
import { requireStudentUser } from '../_lib/session';

export const metadata = { title: 'Overview' };

export default async function OverviewPage() {
  const { user } = await requireStudentUser('/dashboard');
  await connectDB();

  const studentId = user._id;
  const savedIds = (user.savedHostels || []).map(String);

  const [confirmedCount, pendingCount, reviewCount, savedHostels, recentBookings] =
    await Promise.all([
      Booking.countDocuments({ studentId, status: 'confirmed' }),
      Booking.countDocuments({ studentId, status: 'pending' }),
      Review.countDocuments({ studentId }),
      savedIds.length
        ? Hostel.find({ _id: { $in: savedIds }, status: 'published' })
            .select(HOSTEL_CARD_FIELDS)
            .lean()
        : [],
      Booking.find({ studentId })
        .sort({ createdAt: -1 })
        .limit(4)
        .populate('hostelId', 'name slug city area images')
        .lean(),
    ]);

  // Most recently saved first, because `savedHostels` is append-ordered.
  const order = new Map(savedIds.map((id, i) => [id, i]));
  const savedSorted = [...savedHostels].sort(
    (a, b) => order.get(String(b._id)) - order.get(String(a._id))
  );

  const { items: recommended, reason } = await getRecommendations({
    university: user.university,
    city: user.city,
    excludeIds: savedIds,
    limit: 3,
  });

  const missing = [
    !user.university && 'university',
    !user.city && 'city',
  ].filter(Boolean);

  const firstName = String(user.name || '').split(' ')[0] || 'there';

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-h2 text-foreground">
          Welcome back, <span className="text-brand-700 dark:text-brand-400">{firstName}</span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          Track your booking requests, revisit saved hostels and share what your stay was
          really like.
        </p>
      </header>

      {missing.length > 0 && <ProfilePrompt missing={missing} />}

      <section aria-label="Your activity">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active bookings"
            value={confirmedCount}
            icon={CalendarCheck}
            hint={confirmedCount ? 'Confirmed by the owner' : 'None confirmed yet'}
          />
          <StatCard
            label="Pending requests"
            value={pendingCount}
            icon={Clock}
            hint={pendingCount ? 'Awaiting an owner reply' : 'Nothing waiting'}
          />
          <StatCard
            label="Saved hostels"
            value={savedSorted.length}
            icon={Bookmark}
            hint={savedSorted.length ? 'Shortlisted for later' : 'Nothing saved yet'}
          />
          <StatCard
            label="Reviews written"
            value={reviewCount}
            icon={Star}
            hint={reviewCount ? 'Thanks for helping others' : 'Share your experience'}
          />
        </div>
      </section>

      <section aria-labelledby="recent-requests">
        <Card>
          <CardHeader
            title={<span id="recent-requests">Your booking requests</span>}
            description="The most recent requests you have sent to hostel owners."
            action={
              recentBookings.length > 0 ? (
                <Button href="/dashboard/bookings" variant="ghost" size="sm">
                  View all
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              ) : null
            }
          />
          <CardBody>
            {recentBookings.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No requests yet"
                description="When you find a hostel you like, send the owner a request and track their reply here."
                action={
                  <Button href="/hostels" variant="primary">
                    <Compass className="size-4" aria-hidden="true" />
                    Browse hostels
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentBookings.map((booking) => {
                  const hostel = booking.hostelId;
                  return (
                    <li key={String(booking._id)} className="first:pt-0 last:pb-0 py-3">
                      <Link
                        href={
                          hostel?.slug
                            ? `/hostels/${hostel.slug}`
                            : '/dashboard/bookings'
                        }
                        className="group flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors duration-200 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:gap-4"
                      >
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl sm:size-16">
                          <HostelImage
                            src={hostel?.images?.[0]}
                            name={hostel?.name}
                            alt={hostel?.name || 'Hostel'}
                            sizes="64px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand-700 dark:group-hover:text-brand-400">
                            {hostel?.name || 'Listing removed'}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {[
                              booking.roomType,
                              booking.moveInDate
                                ? `Move-in ${formatDate(booking.moveInDate)}`
                                : null,
                              formatDuration(booking.durationMonths),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Requested {timeAgo(booking.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge status={booking.status} />
                          <ChevronRight
                            className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      <section aria-labelledby="saved-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="saved-heading" className="text-h3 text-foreground">
              Saved hostels
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your shortlist, ready when you are.
            </p>
          </div>
          {savedSorted.length > 0 && (
            <Button href="/dashboard/saved" variant="ghost" size="sm">
              See all {savedSorted.length}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        {savedSorted.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            description="Tap the heart on any listing to keep it here while you compare."
            action={
              <Button href="/hostels" variant="primary">
                <Compass className="size-4" aria-hidden="true" />
                Start browsing
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {savedSorted.slice(0, 3).map((hostel) => (
              <HostelCardWithSave
                key={String(hostel._id)}
                hostel={serialize(hostel)}
                initialSaved
              />
            ))}
          </div>
        )}
      </section>

      {recommended.length > 0 && (
        <section aria-labelledby="recommended-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2
                id="recommended-heading"
                className="flex items-center gap-2 text-h3 text-foreground"
              >
                <Sparkles className="size-5 text-accent-500" aria-hidden="true" />
                Recommended for you
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
            </div>
            <Button href="/hostels" variant="ghost" size="sm">
              Explore more
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Recommendations exclude saved listings by construction, so the
                heart always starts empty here. */}
            {recommended.map((hostel) => (
              <HostelCardWithSave
                key={String(hostel._id)}
                hostel={serialize(hostel)}
                initialSaved={false}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

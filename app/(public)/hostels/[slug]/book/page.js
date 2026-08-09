import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Feedback';
import HostelImage from '@/components/ui/HostelImage';
import BookingForm from '@/components/student/BookingForm';
import { ToastProvider } from '@/components/student/Toast';
import { ACTIVE_BOOKING_STATUSES } from '@/components/student/constants';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { formatDate, serialize, timeAgo } from '@/lib/utils';
import Booking from '@/models/Booking';
import Hostel from '@/models/Hostel';
import User from '@/models/User';

const SELECT =
  '_id name slug city area images price securityDeposit rating reviewCount rooms status gender';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  await connectDB();
  const hostel = await Hostel.findOne({ slug, status: 'published' }).select('name city').lean();
  if (!hostel) return { title: 'Request a room' };
  return {
    title: `Request a room at ${hostel.name}`,
    description: `Send ${hostel.name} in ${hostel.city} a booking request on Hostello.`,
    robots: { index: false, follow: true },
  };
}

export default async function BookPage({ params }) {
  const { slug } = await params;
  const next = `/hostels/${slug}/book`;

  // Public route, but the form writes a row owned by a user, so it needs a
  // session before it renders anything, not just before it submits.
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);

  await connectDB();

  const hostel = await Hostel.findOne({ slug, status: 'published' }).select(SELECT).lean();
  if (!hostel) notFound();

  const [user, existing] = await Promise.all([
    User.findById(session.userId).select('name email phone').lean(),
    Booking.findOne({
      hostelId: hostel._id,
      studentId: session.userId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    })
      .select('_id status createdAt roomType moveInDate')
      .lean(),
  ]);

  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  return (
    <ToastProvider>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <Link
          href={`/hostels/${hostel.slug}`}
          className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to {hostel.name}
        </Link>

        <header className="mt-2 mb-6">
          <h1 className="text-h2 text-foreground text-balance">
            Request a room at {hostel.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            Hostello passes your request straight to the owner. No booking fee, no
            payment, no commitment. They reply and you decide.
          </p>
        </header>

        {existing ? (
          <Card className="p-6 sm:p-8">
            <div className="mx-auto max-w-lg">
              <Alert
                tone="info"
                title={
                  existing.status === 'confirmed'
                    ? 'This hostel has already confirmed you'
                    : 'You already have a request with this hostel'
                }
              >
                Sent {timeAgo(existing.createdAt)}. Rather than sending a second request,
                open the one you already have. The owner&apos;s reply and contact details
                appear there.
              </Alert>

              <div className="mt-6 flex items-center gap-4 rounded-xl border border-border bg-surface-sunken p-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                  <HostelImage
                    src={hostel.images?.[0]}
                    name={hostel.name}
                    alt={hostel.name}
                    sizes="64px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{hostel.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[
                      existing.roomType,
                      existing.moveInDate
                        ? `Move-in ${formatDate(existing.moveInDate)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <StatusBadge status={existing.status} />
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button
                  href={`/dashboard/bookings?booking=${existing._id}`}
                  variant="primary"
                  className="sm:flex-1"
                >
                  <CalendarCheck className="size-4" aria-hidden="true" />
                  Open my request
                </Button>
                <Button href="/hostels" variant="secondary" className="sm:flex-1">
                  Browse other hostels
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <BookingForm hostel={serialize(hostel)} user={serialize(user)} />
        )}
      </div>
    </ToastProvider>
  );
}

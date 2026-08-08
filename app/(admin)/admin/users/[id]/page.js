import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Bookmark,
  Building2,
  CalendarCheck,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { Avatar, EmptyState, Rating } from '@/components/ui/Feedback';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Hostel from '@/models/Hostel';
import Booking from '@/models/Booking';
import Review from '@/models/Review';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import PageHeader from '@/components/admin/PageHeader';
import UserActions from '@/components/admin/users/UserActions';
import { formatDate, formatPKR, serialize, timeAgo } from '@/lib/utils';

const OID = /^[a-f0-9]{24}$/i;
const ROLE_TONE = { admin: 'brand', owner: 'accent', student: 'neutral' };

export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!OID.test(id)) return { title: 'User' };
  await connectDB();
  const doc = await User.findById(id).select('name').lean();
  return { title: doc?.name || 'User' };
}

function Panel({ title, count, icon: Icon, action, children }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          {title}
          {count !== undefined && (
            <Badge tone="neutral" size="sm" className="tabular">
              {count}
            </Badge>
          )}
        </h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

export default async function AdminUserDetailPage({ params }) {
  await requireAdminPage();
  const { id } = await params;
  if (!OID.test(id)) notFound();

  // passwordHash is `select: false`, so this document never carries it.
  const user = await User.findById(id).lean();
  if (!user) notFound();

  const [listings, bookings, reviews, saved] = await Promise.all([
    user.role === 'owner' || user.role === 'admin'
      ? Hostel.find({ ownerId: user._id })
          .sort({ createdAt: -1 })
          .limit(25)
          .select('name slug city status price rating reviewCount views')
          .lean()
      : [],
    Booking.find({ studentId: user._id })
      .sort({ createdAt: -1 })
      .limit(25)
      .populate('hostelId', 'name slug')
      .lean(),
    Review.find({ studentId: user._id })
      .sort({ createdAt: -1 })
      .limit(25)
      .populate('hostelId', 'name slug')
      .lean(),
    user.savedHostels?.length
      ? Hostel.find({ _id: { $in: user.savedHostels } })
          .select('name slug city price rating status')
          .lean()
      : [],
  ]);

  const facts = [
    { label: 'Email', value: user.email, icon: Mail, href: `mailto:${user.email}` },
    user.phone ? { label: 'Phone', value: user.phone, icon: Phone, href: `tel:${user.phone}` } : null,
    user.city || user.university
      ? {
          label: 'Location',
          value: [user.city, user.university].filter(Boolean).join(' · '),
          icon: MapPin,
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="People"
        title={user.name}
        description={`Joined ${formatDate(user.createdAt)} · last seen ${
          user.lastLoginAt ? timeAgo(user.lastLoginAt) : 'never'
        }`}
        actions={
          <Button href="/admin/users" variant="ghost" size="sm">
            <ArrowLeft className="size-4" aria-hidden="true" />
            All users
          </Button>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[22rem_minmax(0,1fr)]">
        {/* ── Profile ── */}
        <Card className="h-fit p-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} src={user.avatar} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{user.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge tone={ROLE_TONE[user.role] || 'neutral'} size="sm">
                  {user.role}
                </Badge>
                <StatusBadge status={user.status} size="sm" />
                {!user.emailVerified && (
                  <Badge tone="warning" size="sm">
                    Email unverified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <dl className="mt-4 space-y-2.5">
            {facts.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {f.label}
                    </dt>
                    <dd className="truncate text-sm text-foreground">
                      {f.href ? (
                        <a
                          href={f.href}
                          className="text-brand-700 hover:underline dark:text-brand-300"
                        >
                          {f.value}
                        </a>
                      ) : (
                        f.value
                      )}
                    </dd>
                  </div>
                </div>
              );
            })}
            {user.businessName && (
              <div className="flex items-start gap-2.5">
                <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Business
                  </dt>
                  <dd className="truncate text-sm text-foreground">{user.businessName}</dd>
                </div>
              </div>
            )}
          </dl>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
            {[
              { label: 'Listings', value: listings.length },
              { label: 'Bookings', value: bookings.length },
              { label: 'Reviews', value: reviews.length },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-surface-sunken px-2 py-2.5 text-center">
                <p className="tabular text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <UserActions user={serialize({ _id: user._id, email: user.email, name: user.name, role: user.role, status: user.status })} />
          </div>
        </Card>

        {/* ── Related records ── */}
        <div className="min-w-0 space-y-3">
          {(user.role === 'owner' || user.role === 'admin') && (
            <Panel
              title="Their listings"
              count={listings.length}
              icon={Building2}
              action={
                listings.length ? (
                  <Button href={`/admin/listings?owner=${user._id}`} variant="ghost" size="sm">
                    Open in listings
                  </Button>
                ) : null
              }
            >
              {listings.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={Building2}
                    title="No listings yet"
                    description="Nothing has been submitted from this account."
                    action={
                      <Button href="/admin/listings/new" variant="secondary" size="sm">
                        Create one for them
                      </Button>
                    }
                    className="py-8"
                  />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {listings.map((h) => (
                    <li key={h._id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/listings/${h._id}/edit`}
                          className="block truncate text-sm font-medium text-foreground hover:text-brand-700 hover:underline dark:hover:text-brand-300"
                        >
                          {h.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {h.city} · <span className="tabular">{formatPKR(h.price)}</span> ·{' '}
                          <span className="tabular">{h.views}</span> views
                        </p>
                      </div>
                      <Rating value={h.rating} count={h.reviewCount} size="sm" />
                      <StatusBadge status={h.status} size="sm" />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <Panel title="Booking requests" count={bookings.length} icon={CalendarCheck}>
            {bookings.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={CalendarCheck}
                  title="No booking requests"
                  description="This account has not enquired about any listing."
                  action={
                    <Button href="/admin/bookings" variant="secondary" size="sm">
                      All bookings
                    </Button>
                  }
                  className="py-8"
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {bookings.map((b) => (
                  <li key={b._id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {b.hostelId?.name || 'Deleted listing'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {b.roomType || 'Any room'} ·{' '}
                        {b.moveInDate ? `moves in ${formatDate(b.moveInDate)}` : 'no date'} ·{' '}
                        {b.durationMonths || 1} months
                      </p>
                    </div>
                    <StatusBadge status={b.status} size="sm" />
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {timeAgo(b.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Reviews written" count={reviews.length} icon={MessageSquare}>
            {reviews.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={MessageSquare}
                  title="No reviews written"
                  description="Nothing to moderate from this account."
                  action={
                    <Button href="/admin/reviews" variant="secondary" size="sm">
                      Moderation queue
                    </Button>
                  }
                  className="py-8"
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {reviews.map((r) => (
                  <li key={r._id} className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Rating value={r.rating} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {r.hostelId?.name || 'Deleted listing'}
                      </span>
                      <StatusBadge status={r.status} size="sm" />
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {timeAgo(r.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground text-pretty">
                      {r.comment}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Saved hostels" count={saved.length} icon={Bookmark}>
            {saved.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Bookmark}
                  title="Nothing saved"
                  description="Saved listings show what this student is shortlisting."
                  action={
                    <Button href="/admin/listings" variant="secondary" size="sm">
                      Browse listings
                    </Button>
                  }
                  className="py-8"
                />
              </div>
            ) : (
              <ul className="flex flex-wrap gap-2 p-4">
                {saved.map((h) => (
                  <li key={h._id}>
                    <Link
                      href={`/admin/listings/${h._id}/edit`}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition-colors duration-200 hover:border-border-strong hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {h.name}
                      <span className="tabular text-muted-foreground">{formatPKR(h.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

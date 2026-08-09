'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Inbox, X } from 'lucide-react';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Avatar, EmptyState } from '@/components/ui/Feedback';
import { formatDate, timeAgo } from '@/lib/utils';
import RespondDialog from './BookingRespond';

/** Dashboard list with inline confirm/decline on anything still pending. */
export default function RecentBookings({ bookings }) {
  const [respond, setRespond] = useState(null);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Recent booking requests"
        description="Pending requests first. Students rarely wait more than a day."
        action={
          <Button href="/owner/bookings" variant="ghost" size="sm">
            View all
          </Button>
        }
      />
      <div className="flex-1 p-5 pt-4">
        {bookings.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No booking requests yet"
            description="Requests land here the moment a student enquires about one of your listings."
            action={
              <Button href="/owner/listings" variant="secondary" size="sm">
                Check your listings
              </Button>
            }
            className="py-10"
          />
        ) : (
          <ul className="space-y-2.5">
            {bookings.map((booking) => (
              <li
                key={booking._id}
                className="rounded-xl border border-border p-3 transition-colors duration-200 hover:border-border-strong"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={booking.studentName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {booking.studentName || 'Unnamed student'}
                      </p>
                      <StatusBadge status={booking.status} size="sm" />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      <Link
                        href={`/owner/bookings?hostelId=${booking.hostelId}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {booking.hostelName}
                      </Link>
                      {' · '}
                      {booking.roomType || 'Any room'}
                      {' · '}
                      <span className="tabular">
                        {booking.moveInDate ? formatDate(booking.moveInDate) : 'flexible'}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {timeAgo(booking.createdAt)}
                    </p>
                  </div>
                </div>

                {booking.status === 'pending' && (
                  <div className="mt-3 flex gap-2 pl-11">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setRespond({ booking, mode: 'confirmed' })}
                    >
                      <Check className="size-4" aria-hidden="true" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setRespond({ booking, mode: 'rejected' })}
                    >
                      <X className="size-4" aria-hidden="true" />
                      Decline
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {respond && (
        <RespondDialog
          booking={respond.booking}
          mode={respond.mode}
          onClose={() => setRespond(null)}
        />
      )}
    </Card>
  );
}

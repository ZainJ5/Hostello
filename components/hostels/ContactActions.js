'use client';

import Button from '@/components/ds/Button';
import { cn, normalizePhone, whatsappLink } from '@/lib/utils';

/**
 * The two routes that actually reach a hostel today: its own phone and its own
 * WhatsApp. Both are real anchors, so long press, "copy link" and middle click
 * behave the way a student expects.
 *
 * 104 of 124 listings carry a phone and 101 carry a WhatsApp number. THE
 * TWENTY WITHOUT ONE ARE WHY THIS COMPONENT RENDERS NOTHING RATHER THAN A
 * DISABLED BUTTON. An inert call button is worse than no call button: it looks
 * like the site is broken rather than like the owner has not given a number.
 *
 * The conversion ping is fired alongside the navigation with `keepalive`, never
 * instead of it, so a slow network cannot hold up the call.
 */
export function trackContact(slug, channel) {
  try {
    fetch(`/api/hostels/${encodeURIComponent(slug)}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never block the call.
  }
}

export function hasContact(hostel) {
  return Boolean(normalizePhone(hostel?.contact?.phone) || hostel?.contact?.whatsapp);
}

export default function ContactActions({ hostel, className }) {
  const slug = hostel.slug;
  const tel = normalizePhone(hostel.contact?.phone);
  const wa = whatsappLink(
    hostel.contact?.whatsapp || hostel.contact?.phone,
    `Hello, I found ${hostel.name} on Hostello and I would like to ask about a room.`
  );

  if (!tel && !wa) return null;

  return (
    <div className={cn('flex w-full flex-col gap-2.5', className)}>
      {tel ? (
        <Button
          href={`tel:${tel}`}
          variant="secondary"
          className="w-full"
          onClick={() => trackContact(slug, 'call')}
        >
          Call the hostel
        </Button>
      ) : null}

      {wa ? (
        <Button
          href={wa}
          variant="secondary"
          className="w-full"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackContact(slug, 'whatsapp')}
        >
          WhatsApp the hostel
        </Button>
      ) : null}
    </div>
  );
}

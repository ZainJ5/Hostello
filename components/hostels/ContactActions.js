'use client';

import { MessageCircle, Phone } from 'lucide-react';
import { cn, normalizePhone, whatsappLink } from '@/lib/utils';

/**
 * Call / WhatsApp buttons. Both are real anchors so long-press, "copy link"
 * and middle-click behave normally; the conversion ping is fired alongside the
 * navigation with `keepalive` rather than instead of it, so a slow network
 * can't hold up the student's call.
 *
 * Nothing renders when the listing carries no number — an inert phone button
 * is worse than no phone button.
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

const BASE =
  'inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border ' +
  'text-sm font-semibold transition-[background-color,box-shadow,transform] duration-200 ' +
  'active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * `compact` renders icon-only 48px squares for the mobile action bar, where
 * horizontal room is scarce; the accessible name moves to `aria-label`.
 */
export default function ContactActions({
  slug,
  phone,
  whatsapp,
  hostelName,
  compact = false,
  className,
}) {
  const tel = normalizePhone(phone);
  const wa = whatsappLink(
    whatsapp || phone,
    `Hi! I found ${hostelName} on Hostello and I'd like to ask about a room.`
  );

  if (!tel && !wa) return null;

  const shape = compact ? 'w-12 shrink-0' : 'flex-1 px-4';

  return (
    <div className={cn('flex items-stretch gap-2.5', className)}>
      {tel && (
        <a
          href={`tel:${tel}`}
          onClick={() => trackContact(slug, 'call')}
          aria-label={`Call ${hostelName}`}
          className={cn(
            BASE,
            shape,
            'border-border-strong bg-surface text-foreground hover:bg-muted'
          )}
        >
          <Phone className="size-4" aria-hidden="true" />
          {!compact && 'Call'}
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackContact(slug, 'whatsapp')}
          aria-label={`Message ${hostelName} on WhatsApp`}
          className={cn(
            BASE,
            shape,
            'border-success/30 bg-success-soft text-success hover:brightness-[0.97]',
            'dark:bg-success/15 dark:text-emerald-300'
          )}
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          {!compact && 'WhatsApp'}
        </a>
      )}
    </div>
  );
}

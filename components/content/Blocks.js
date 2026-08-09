import { cn } from '@/lib/utils';

/**
 * The four blocks the content frames are built from: a titled section, a
 * paragraph, a stack of bordered fact cards, and a callout that carries the
 * one thing the page most wants a student to hold on to.
 *
 * Elevation is the hairline border and a value step, never a shadow, which is
 * the rule the rest of the student site already follows.
 */

export function Section({ title, id, children, className }) {
  return (
    <section id={id} className={cn('flex flex-col gap-4', className)}>
      {title ? <h2 className="ds-display-m text-balance text-ds-ink">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Paragraph({ children, className }) {
  return <p className={cn('ds-body-m text-pretty text-ds-ink', className)}>{children}</p>;
}

/** Small print. Used for the honest caveats, never for anything load bearing. */
export function FinePrint({ children, className }) {
  return <p className={cn('ds-body-s text-pretty text-ds-ink-muted', className)}>{children}</p>;
}

export function NoteCard({ title, children, className }) {
  return (
    <div className={cn('ds-elevated flex flex-col gap-1.5 rounded-ds-inner p-4', className)}>
      <p className="ds-body-m-strong text-ds-ink">{title}</p>
      <div className="ds-body-s text-pretty text-ds-ink-muted">{children}</div>
    </div>
  );
}

/** `items` is an array of { title, body }. */
export function NoteList({ items, className }) {
  return (
    <ul className={cn('flex flex-col gap-3', className)}>
      {items.map((item) => (
        <li key={item.title}>
          <NoteCard title={item.title}>{item.body}</NoteCard>
        </li>
      ))}
    </ul>
  );
}

/**
 * The sunken panel with an ink keyline. It is not an alert and carries no
 * tone colour, because what it holds is always true rather than a state the
 * student got into.
 */
export function Callout({ title, children, className }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-ds-inner border border-solid border-ds-ink bg-ds-surface-sunken p-4',
        className
      )}
    >
      {title ? <p className="ds-body-m-strong text-ds-ink">{title}</p> : null}
      <div className="ds-body-s text-pretty text-ds-ink-muted">{children}</div>
    </div>
  );
}

/**
 * The Hostello support contact block. It never looks like the owner contact on
 * a listing: that one names the hostel, this one names Hostello, and the two
 * are labelled so they can never be read as the same number.
 *
 * The WhatsApp link drops the leading zero and carries the country code.
 * wa.me/03184308493 is a dead link and is the mistake that gets made.
 */
export const SUPPORT = {
  email: 'team@xaviot.com',
  phoneDisplay: '0318 4308493',
  phoneHref: 'tel:+923184308493',
  whatsappHref: 'https://wa.me/923184308493',
};

const contactLink =
  'ds-body-m-strong rounded-ds-chip text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt';

export function SupportContact({ className }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-1">
        <a href={`mailto:${SUPPORT.email}`} className={contactLink}>
          {SUPPORT.email}
        </a>
        <FinePrint>Email Hostello about the site, a listing or a safety report.</FinePrint>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href={SUPPORT.phoneHref} className={contactLink}>
            {SUPPORT.phoneDisplay}
          </a>
          <a href={SUPPORT.whatsappHref} className={cn(contactLink, 'ds-body-s')}>
            WhatsApp
          </a>
        </div>
        <FinePrint>
          That number reaches Hostello, not a hostel. Owner numbers are on each listing and
          nowhere else.
        </FinePrint>
      </div>
    </div>
  );
}

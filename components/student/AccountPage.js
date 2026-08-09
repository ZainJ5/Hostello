import Link from 'next/link';
import AccountNav from './AccountNav';
import { cn } from '@/lib/utils';

/**
 * Every account screen has the same frame: breadcrumb, display/xl title,
 * body/l lead, then the rail beside the content. The rail sits above the
 * content on a phone and to the left of it from lg up, at the 1440 frame's
 * proportions.
 *
 * The heading block is full width above both columns, which is what the frames
 * draw and what keeps the title from being squeezed into the content column at
 * 360.
 */

function Breadcrumb({ trail }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {trail.map((crumb, i) => (
          <li key={crumb.label} className="flex items-center gap-2">
            {i > 0 ? (
              <span aria-hidden="true" className="ds-body-s text-ds-ink-muted">
                /
              </span>
            ) : null}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="ds-body-s text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
              >
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="ds-body-s text-ds-ink-muted">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function AccountPage({ title, lead, current, children, className }) {
  const trail = [{ label: 'Home', href: '/' }];
  if (current) trail.push({ label: 'Account', href: '/account' }, { label: current });
  else trail.push({ label: 'Account' });

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <header className="flex flex-col gap-3">
        <Breadcrumb trail={trail} />
        <h1 className="ds-display-xl text-balance text-ds-ink">{title}</h1>
        {lead ? <p className="ds-body-l max-w-[80ch] text-pretty text-ds-ink-muted">{lead}</p> : null}
      </header>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
        <AccountNav className="lg:sticky lg:top-6 lg:self-start" />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Breadcrumb, title and lead, shared by every auth screen so they line up
 * exactly. The eyebrow pill and the decorative icon that used to sit above the
 * title are gone: no frame in the file carries either, and the breadcrumb
 * already answers the question the eyebrow was answering.
 */

export function Breadcrumb({ trail }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
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

export default function AuthHeading({ trail, title, description, className }) {
  return (
    <div className={cn('mb-8', className)}>
      {trail ? <Breadcrumb trail={trail} /> : null}
      <h1 className="ds-display-xl text-balance text-ds-ink">{title}</h1>
      {description ? (
        <p className="ds-body-l mt-4 text-pretty text-ds-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}

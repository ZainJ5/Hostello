import Link from 'next/link';

/**
 * Figma nav/breadcrumbs, as it appears on all four roommate frames.
 *
 * Local to this feature rather than added to components/ds. The ds set is
 * frozen for this work, and a shared breadcrumb needs the whole site's opinion
 * about trailing slashes and truncation, not one section's. If a second area
 * grows a breadcrumb, that is the moment to lift this into ds.
 */
export default function Breadcrumbs({ trail = [] }) {
  if (!trail.length) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="ds-body-s flex flex-wrap items-center gap-x-2 gap-y-1 text-ds-ink-muted">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-x-2">
              {crumb.href && !last ? (
                <Link
                  href={crumb.href}
                  className="text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined}>{crumb.label}</span>
              )}
              {last ? null : (
                <span aria-hidden="true" className="text-ds-ink-muted">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

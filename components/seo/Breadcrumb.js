import Link from 'next/link';

/**
 * The trail across the top of every landing template.
 *
 * A crumb without an href renders as plain text rather than a dead link, which
 * is how "Campuses" is drawn in the frame: it names the level, and there is no
 * index page behind it.
 *
 * The structured data is emitted beside it so the same trail reaches a search
 * result, which is the entire point of these three routes.
 */
export default function Breadcrumb({ items, siteUrl }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items
      .filter((i) => i.href)
      .map((i, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: i.label,
        item: `${siteUrl}${i.href}`,
      })),
  };

  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="ds-body-s flex flex-wrap items-center gap-x-2 gap-y-1 text-ds-ink-muted">
          {items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-x-2">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {item.href && !last ? (
                  <Link
                    href={item.href}
                    className="text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined} className={last ? 'text-ds-ink' : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
      />
    </>
  );
}

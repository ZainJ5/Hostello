import { cn } from '@/lib/utils';

/**
 * "Questions students ask about this search."
 *
 * Every answer on every landing page is generated from the rows the page just
 * loaded. Nothing here is written by hand about a hostel, because the Figma
 * copy answers questions the database cannot: warden on site, gate timings,
 * whether families may visit and what the deposit is are all absent on all 124
 * listings. Inventing a plausible answer on the acquisition channel is the
 * worst possible place to do it, so the pages answer what they can count and
 * say plainly what is not recorded.
 *
 * The blocks are open, not an accordion. A question a crawler has to click is
 * a question that did not need collapsing at this length.
 */
export default function Faq({ items, className }) {
  if (!items?.length) return null;

  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <section className={cn('flex flex-col gap-5', className)} aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="ds-display-m text-ds-ink">
        Questions students ask about this search
      </h2>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.q} className="ds-elevated flex flex-col gap-1.5 rounded-ds-inner p-4">
            <h3 className="ds-body-m-strong text-ds-ink">{item.q}</h3>
            <p className="ds-body-s max-w-[95ch] text-ds-ink-muted">{item.a}</p>
          </li>
        ))}
      </ul>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
      />
    </section>
  );
}

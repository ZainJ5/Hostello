import Link from 'next/link';
import { cn } from '@/lib/utils';
import FilterRow from './FilterRow';
import FilterSearch from './FilterSearch';
import { DEFAULT_FILTERS, activeFilterCount, hostelsHref } from './filters';
import { RENT_BANDS, activeRentBand, genderLabel, rentBandPatch } from './browse-copy';

/**
 * Figma filter-rail inside page/browse-hostels 77:923. A 300 wide panel of
 * hairline elevation, 20 of padding, five groups of 44 tall rows.
 *
 * SERVER RENDERED AND LINK BASED. Every row is an href, so the rail costs no
 * JavaScript, works with it switched off, and each filter combination is a URL
 * a student can share or a crawler can follow. The only client component in
 * here is the text field, which needs to debounce.
 *
 * Counts come from `facetCounts` in query.js and are computed against every
 * other active filter but never against the group they sit in, which is what
 * stops a list collapsing to one option the moment you tick something.
 */

/** The vocabulary the model stores, in the words the design uses. */
const FACILITY_LABELS = {
  Meals: 'Mess',
  WiFi: 'Wifi',
  'Power Backup': 'Backup power',
  'Attached Bath': 'Attached bath',
  'Hot Water': 'Hot water',
  'Study Room': 'Study room',
  'Prayer Area': 'Prayer area',
  'Outdoor Area': 'Outdoor area',
  'On-site Shop': 'On-site shop',
  'Common Lounge': 'Common lounge',
  'Filtered Water': 'Filtered water',
};

/** How many rows a long group shows before the rest go behind a disclosure. */
const VISIBLE = 5;

function Group({ title, children, note }) {
  return (
    <section className="flex w-full flex-col gap-2 border-t border-solid border-ds-hairline pt-6 first:border-0 first:pt-0">
      <h3 className="ds-label text-ds-ink-muted">{title}</h3>
      <ul className="flex w-full flex-col">{children}</ul>
      {note ? <p className="ds-body-s text-ds-ink-muted">{note}</p> : null}
    </section>
  );
}

/**
 * The overflow of a long group. A native details element keeps the extra rows
 * in the markup for a crawler and costs no JavaScript, and it holds its own
 * open state across a filter navigation without any wiring.
 */
function More({ label, children }) {
  return (
    <li>
      <details className="w-full">
        <summary
          className={cn(
            'ds-body-s-strong flex w-full cursor-pointer list-none items-center rounded-ds-inner px-1 text-ds-cobalt',
            'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ds-cobalt',
            '[&::-webkit-details-marker]:hidden'
          )}
          style={{ minHeight: 'var(--ds-control-h)' }}
        >
          {label}
        </summary>
        <ul className="flex w-full flex-col">{children}</ul>
      </details>
    </li>
  );
}

export default function FilterRail({ filters, facets, className, idPrefix = 'rail' }) {
  const f = filters;
  const count = activeFilterCount(f);
  const band = activeRentBand(f);

  const cities = facets?.cities || [];
  const genders = facets?.genders || [];
  const universities = [...(facets?.universities || [])].sort((a, b) => b.count - a.count);
  const facilities = [...(facets?.facilities || [])].sort((a, b) => b.count - a.count);

  const cityRow = (row) => {
    const selected = (f.city || []).includes(row.value);
    const next = selected
      ? (f.city || []).filter((c) => c !== row.value)
      : [...(f.city || []), row.value];
    return (
      <FilterRow
        key={`${idPrefix}-city-${row.value}`}
        href={hostelsHref(f, { city: next, page: 1 })}
        label={row.value}
        count={row.count}
        selected={selected}
        disabled={row.count === 0 && !selected}
      />
    );
  };

  const universityRow = (row) => {
    const selected = f.university === row.value;
    return (
      <FilterRow
        key={`${idPrefix}-uni-${row.value}`}
        href={hostelsHref(f, { university: selected ? '' : row.value, page: 1 })}
        label={row.value}
        count={row.count}
        selected={selected}
        disabled={row.count === 0 && !selected}
      />
    );
  };

  const facilityRow = (row) => {
    const selected = (f.facilities || []).includes(row.value);
    const next = selected
      ? (f.facilities || []).filter((x) => x !== row.value)
      : [...(f.facilities || []), row.value];
    return (
      <FilterRow
        key={`${idPrefix}-fac-${row.value}`}
        href={hostelsHref(f, { facilities: next, page: 1 })}
        label={FACILITY_LABELS[row.value] || row.value}
        count={row.count}
        selected={selected}
        disabled={row.count === 0 && !selected}
      />
    );
  };

  return (
    <div className={cn('flex w-full flex-col gap-6', className)}>
      <div className="flex w-full items-center justify-between gap-3">
        <h2 className="ds-display-s text-ds-ink">Filters</h2>
        {count > 0 ? (
          <Link
            href={hostelsHref(DEFAULT_FILTERS, { sort: f.sort, view: f.view })}
            scroll={false}
            className="ds-body-s-strong inline-flex items-center rounded-ds-inner px-1 text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
          >
            Clear {count}
          </Link>
        ) : null}
      </div>

      <FilterSearch filters={f} />

      <Group title="City">{cities.map(cityRow)}</Group>

      <Group title="Who can stay">
        {genders.map((row) => {
          const selected = f.gender === row.value;
          return (
            <FilterRow
              key={`${idPrefix}-gender-${row.value}`}
              href={hostelsHref(f, { gender: selected ? '' : row.value, page: 1 })}
              label={genderLabel(row.value)}
              count={row.count}
              selected={selected}
              disabled={row.count === 0 && !selected}
            />
          );
        })}
      </Group>

      <Group title="Campus">
        {universities.slice(0, VISIBLE).map(universityRow)}
        {universities.length > VISIBLE ? (
          <More label={`Show all ${universities.length} campuses`}>
            {universities.slice(VISIBLE).map(universityRow)}
          </More>
        ) : null}
      </Group>

      {/* Rent carries no count. The facet aggregation in query.js produces
          counts for city, campus, who can stay and what is included, and this
          build reuses that layer exactly as it is rather than widening it. */}
      <Group title="Monthly rent">
        {RENT_BANDS.map((b) => (
          <FilterRow
            key={`${idPrefix}-rent-${b.id}`}
            href={hostelsHref(f, { ...rentBandPatch(f, b), page: 1 })}
            label={b.label}
            selected={band?.id === b.id}
          />
        ))}
      </Group>

      <Group
        title="What is included"
        note="Counts update as you filter. A count of zero disables the row rather than hiding it, so you can see what your filters cost you."
      >
        {facilities.slice(0, VISIBLE).map(facilityRow)}
        {facilities.length > VISIBLE ? (
          <More label={`Show all ${facilities.length}`}>
            {facilities.slice(VISIBLE).map(facilityRow)}
          </More>
        ) : null}
      </Group>
    </div>
  );
}

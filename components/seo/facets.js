/**
 * Builds the five facet groups the landing frames draw: City, Who can stay,
 * Campus, Monthly rent and What is included.
 *
 * The rule that decides whether a row is a filter or a link:
 *
 *   a row that names another landing page navigates to that page,
 *   every other row toggles a query parameter on this one.
 *
 * From Islamabad, Rawalpindi is a different page. From the NUST page, "Female
 * only" is a filter. That keeps every URL canonical, gives a crawler a real
 * edge to follow in both directions, and means no two URLs ever describe the
 * same result set.
 *
 * A row the route itself fixes is still tickable, and unticking it walks up to
 * the broader page rather than doing nothing.
 */

import { PRICE_MAX, PRICE_MIN } from '@/components/hostels/filters';
import {
  CITY_NAMES,
  GENDER_SLUGS,
  GENDER_SLUG_LIST,
  activeRentBand,
  campusPath,
  cityPath,
  genderCityPath,
  genderSlugFor,
} from './catalog';

/** The five rows the frame lists, by the vocabulary the model stores. */
const FACILITY_ROWS = [
  { value: 'Meals', label: 'Mess' },
  { value: 'WiFi', label: 'WiFi' },
  { value: 'Power Backup', label: 'Backup power' },
  { value: 'Security', label: 'Security' },
  { value: 'Transport', label: 'Transport' },
];

const GENDER_ROWS = [
  { slug: 'girls', value: 'Female', label: 'Female only' },
  { slug: 'boys', value: 'Male', label: 'Male only' },
  { slug: 'mixed', value: 'Mixed', label: 'Mixed' },
];

/** How many campus rows the panel shows before it stops. */
const CAMPUS_ROWS = 6;

function countOf(list, value) {
  return list?.find((r) => r.value === value)?.count ?? 0;
}

function toggle(list, value) {
  const set = list || [];
  return set.includes(value) ? set.filter((v) => v !== value) : [...set, value];
}

export default function buildFacetGroups({
  kind,
  locked = {},
  filters,
  facets,
  index,
  rentBands,
  hrefFor,
}) {
  const groups = [];
  const lockedGenderSlug = locked.gender ? genderSlugFor(locked.gender) : '';

  // A row that filters shows what it would leave behind here. A row that
  // navigates shows the size of the page it goes to. Those are different
  // numbers and only one of them is honest in each place.
  const cityGenderTotal = (city, gender) => index?.byCityGender?.[`${city}|${gender}`] ?? 0;

  /* ── City ─────────────────────────────────────────────────────────────── */

  groups.push({
    title: 'City',
    rows: CITY_NAMES.map((city) => {
      const isRoute = locked.city === city;
      const selected = isRoute || (!locked.city && (filters.city || []).includes(city));

      let href;
      let count;
      if (kind === 'campus') {
        href = hrefFor({ city: toggle(filters.city, city), page: 1 });
        count = countOf(facets?.cities, city);
      } else if (isRoute) {
        href = kind === 'gender' ? `/hostels?gender=${encodeURIComponent(locked.gender)}` : '/hostels';
        count = countOf(facets?.cities, city);
      } else if (kind === 'gender') {
        href = genderCityPath(city, lockedGenderSlug);
        count = cityGenderTotal(city, locked.gender);
      } else {
        href = cityPath(city);
        count = index?.byCity?.[city] ?? 0;
      }

      return {
        key: `city-${city}`,
        label: city,
        count,
        selected,
        // A route row always stays clickable so it can be unticked; only a
        // genuinely empty option is disabled.
        disabled: !isRoute && count === 0,
        href,
      };
    }),
  });

  /* ── Who can stay ─────────────────────────────────────────────────────── */

  groups.push({
    title: 'Who can stay',
    rows: GENDER_ROWS.map((row) => {
      const isRoute = locked.gender === row.value;
      const selected = isRoute || (!locked.gender && filters.gender === row.value);

      let href;
      let count = countOf(facets?.genders, row.value);
      if (kind === 'campus') {
        href = hrefFor({ gender: selected ? '' : row.value, page: 1 });
      } else if (isRoute) {
        href = cityPath(locked.city);
      } else {
        href = genderCityPath(locked.city, row.slug);
        count = cityGenderTotal(locked.city, row.value);
      }

      return {
        key: `gender-${row.value}`,
        label: row.label,
        count,
        selected,
        disabled: !isRoute && count === 0,
        href,
      };
    }),
  });

  /* ── Campus ───────────────────────────────────────────────────────────── */

  const campusPool = [...(facets?.universities || [])].sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value)
  );
  const shown = campusPool.slice(0, CAMPUS_ROWS).map((r) => r.value);
  if (locked.university && !shown.includes(locked.university)) shown.unshift(locked.university);
  if (filters.university && !shown.includes(filters.university)) shown.unshift(filters.university);

  groups.push({
    title: 'Campus',
    rows: shown.map((name) => {
      const isRoute = locked.university === name;
      const selected = isRoute || (!locked.university && filters.university === name);

      let href;
      let count = countOf(campusPool, name);
      if (kind === 'campus') {
        href = isRoute ? '/hostels' : campusPath(name);
        if (!isRoute) count = index?.byCampus?.[name] ?? 0;
      } else {
        href = hrefFor({ university: selected ? '' : name, page: 1 });
      }

      return {
        key: `campus-${name}`,
        label: name,
        count,
        selected,
        disabled: !isRoute && count === 0,
        href,
      };
    }),
  });

  /* ── Monthly rent ─────────────────────────────────────────────────────── */

  const current = activeRentBand(filters);

  groups.push({
    title: 'Monthly rent',
    rows: (rentBands || []).map((band) => {
      const selected = current?.key === band.key;
      return {
        key: `rent-${band.key}`,
        label: band.label,
        count: band.count,
        selected,
        disabled: !selected && band.count === 0,
        href: hrefFor(
          selected
            ? { minPrice: PRICE_MIN, maxPrice: PRICE_MAX, page: 1 }
            : { minPrice: band.min, maxPrice: band.max, page: 1 }
        ),
      };
    }),
  });

  /* ── What is included ─────────────────────────────────────────────────── */

  const extra = (filters.facilities || [])
    .filter((f) => !FACILITY_ROWS.some((r) => r.value === f))
    .map((f) => ({ value: f, label: f }));

  groups.push({
    title: 'What is included',
    rows: [...FACILITY_ROWS, ...extra].map((row) => {
      const count = countOf(facets?.facilities, row.value);
      const selected = (filters.facilities || []).includes(row.value);
      return {
        key: `facility-${row.value}`,
        label: row.label,
        count,
        selected,
        disabled: !selected && count === 0,
        href: hrefFor({ facilities: toggle(filters.facilities, row.value), page: 1 }),
      };
    }),
  });

  return groups;
}

/** Used by the gender template to name the other two options in prose. */
export function otherGenderSlugs(slug) {
  return GENDER_SLUG_LIST.filter((s) => s !== slug).map((s) => ({ slug: s, ...GENDER_SLUGS[s] }));
}

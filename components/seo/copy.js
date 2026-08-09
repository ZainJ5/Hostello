/**
 * Every sentence on the three landing templates, generated from the rows the
 * page has just counted.
 *
 * WHY NONE OF THE FIGMA COPY SURVIVED VERBATIM. The frames answer questions
 * the database cannot: "every one with a female warden on site", "gate timings
 * between 9pm and 10pm", "deposit is usually one month and refundable", "four
 * bed rooms start around PKR 12,000". Warden, gate timings, house rules,
 * deposit and room types are empty on all 124 listings. On the acquisition
 * channel, a plausible invented answer is the most expensive kind, so the
 * copy here says what it can count and names what is not recorded.
 *
 * The shape, the tone and the question slots are the frame's. Only the claims
 * changed.
 */

import { formatPKR } from '@/lib/utils';
import { DISTANCE_NOTE } from '@/lib/distance';
import { GENDER_SLUGS, campusPath, cityPath, genderCityPath } from './catalog';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const hostels = (n) => plural(n, 'hostel', 'hostels');

function rentSentence(stats) {
  if (!stats.rentLow || !stats.rentHigh) return 'Rents are not recorded on these listings.';
  if (stats.rentLow === stats.rentHigh) return `Rent is ${formatPKR(stats.rentLow)} a month.`;
  return `Rents run from ${formatPKR(stats.rentLow)} to ${formatPKR(stats.rentHigh)} a month.`;
}

function typicalSentence(stats) {
  const lo = stats.rentTypicalLow;
  const hi = stats.rentTypicalHigh;
  if (!lo || !hi || lo === hi) return '';
  return ` The middle of the range sits between ${formatPKR(lo)} and ${formatPKR(hi)}.`;
}

function bandSentence(stats, origin) {
  const b = stats.bands;
  const total = b.walkable + b['a short ride'] + b['a commute'];
  if (!total) return `No listing here carries usable coordinates, so ${origin} distance is not shown.`;
  return (
    `${plural(b.walkable, 'hostel sits', 'hostels sit')} inside 2.5 km of ${origin}, ` +
    `${b['a short ride']} between 2.5 and 6 km, and ${b['a commute']} further out.` +
    (stats.nearestKm !== null ? ` The closest is ${stats.nearestKm.toFixed(1)} km away.` : '')
  );
}

const takes = (n) => `${n} ${n === 1 ? 'takes' : 'take'}`;

function genderSentence(stats) {
  const g = stats.genders;
  return `${takes(g.Female)} female students only, ${takes(g.Male)} male students only, and ${takes(g.Mixed)} both.`;
}

function verifiedSentence(stats) {
  const rest = stats.total - stats.verified;
  if (!stats.total) return '';
  if (!rest) {
    return stats.total === 1
      ? 'The one listing here carries a verified badge.'
      : `All ${hostels(stats.total)} here carry a verified badge.`;
  }
  if (!stats.verified) {
    return stats.total === 1
      ? 'The one listing here does not carry a verified badge.'
      : `None of the ${hostels(stats.total)} here carry a verified badge.`;
  }
  const carries = stats.verified === 1 ? 'carries' : 'carry';
  const does = rest === 1 ? 'does' : 'do';
  return `${stats.verified} of the ${hostels(stats.total)} ${carries} a verified badge and ${rest} ${does} not.`;
}

function messSentence(stats) {
  const meals = stats.facilities?.Meals || 0;
  if (!meals) return 'None of them include a mess.';
  if (meals === stats.total) return stats.total === 1 ? 'It includes a mess.' : 'All of them include a mess.';
  return `${meals} of them ${meals === 1 ? 'includes' : 'include'} a mess.`;
}

/**
 * The same answer on all three templates, because it is the same gap. Stated
 * once, plainly, rather than papered over with a plausible number.
 */
const NOT_RECORDED = {
  q: 'What is not on these listings yet?',
  a:
    'Room types and bed counts, security deposits, house rules and gate timings are not recorded on any listing in the directory today, so no page here shows them. ' +
    'They are questions worth asking on the call. What every listing does carry is a rent range, a location, facilities and, on most of them, a phone number.',
};

/* ── Campus template ────────────────────────────────────────────────────── */

export function campusCopy(campus, stats) {
  const gate = `the ${campus.name} main gate`;

  return {
    title: `Hostels near ${campus.name}`,
    intro:
      `${hostels(stats.total)} ${stats.total === 1 ? 'names' : 'name'} ${campus.full} among the campuses ${stats.total === 1 ? 'it sits' : 'they sit'} near. ` +
      `Sorted by straight line distance from the main gate. ` +
      `${rentSentence(stats)} ${messSentence(stats)}`,
    headline: (total) => `${hostels(total)} near ${campus.name}`,
    description:
      `${hostels(stats.total)} near ${campus.full}, ${campus.city}. ` +
      `${rentSentence(stats)} Compare rent, facilities and straight line distance from the main gate, then contact the owner yourself.`,
    faqs: [
      {
        q: `How far from ${campus.name} are these hostels?`,
        a: `${bandSentence(stats, gate)} ${DISTANCE_NOTE}`,
      },
      {
        q: `What do hostels near ${campus.name} cost?`,
        a: `${rentSentence(stats)}${typicalSentence(stats)} ${messSentence(stats)} Hostello holds no security deposit figure for any listing, so that one is a phone call.`,
      },
      {
        q: 'Do any of them take both boys and girls?',
        a: `${genderSentence(stats)} Use the who can stay filter to narrow it.`,
      },
      NOT_RECORDED,
    ],
  };
}

/* ── City template ──────────────────────────────────────────────────────── */

export function cityCopy(city, stats) {
  const top = stats.topCampuses.slice(0, 4);
  const campusList = top.length
    ? top.map((c) => `${c.name} (${c.count})`).join(', ')
    : 'no campus in the catalogue';

  return {
    title: `Student hostels in ${city}`,
    intro:
      `${hostels(stats.total)} published in ${city}. ` +
      `${rentSentence(stats)} ${verifiedSentence(stats)}`,
    headline: (total) => `${hostels(total)} in ${city}`,
    description:
      `${hostels(stats.total)} in ${city}. ${rentSentence(stats)} ` +
      `Compare rent, facilities and distance to campus, then contact the owner directly on Hostello.`,
    faqs: [
      {
        q: `What is a normal rent in ${city}?`,
        a: `${rentSentence(stats)}${typicalSentence(stats)} ${messSentence(stats)}`,
      },
      {
        q: `Which campuses are these hostels near?`,
        a: `Counted by the campuses each listing names: ${campusList}. ${bandSentence(stats, 'the nearest campus gate each listing names')}`,
      },
      {
        q: 'How many are verified, and who can stay?',
        a: `${verifiedSentence(stats)} ${genderSentence(stats)}`,
      },
      NOT_RECORDED,
    ],
  };
}

/* ── Gender plus city template ──────────────────────────────────────────── */

export function genderCityCopy(city, gender, stats) {
  const verb = stats.total === 1 ? 'takes' : 'take';
  const who =
    gender.word === 'mixed'
      ? `${verb} students of any gender`
      : `${verb} ${gender.word === 'girls' ? 'female' : 'male'} students only`;

  // The description reads about the whole set, so it never uses the singular.
  const whoPlural = who.replace(/^takes /, 'take ');
  const label = `${gender.word} hostels in ${city}`;

  return {
    title: `${gender.word[0].toUpperCase()}${gender.word.slice(1)} hostels in ${city}`,
    intro:
      `${hostels(stats.total)} in ${city} that ${who}. ` +
      `${rentSentence(stats)} ${verifiedSentence(stats)}`,
    headline: (total) => `${plural(total, `${gender.word} hostel`, `${gender.word} hostels`)} in ${city}`,
    description:
      `${hostels(stats.total)} in ${city} that ${whoPlural}. ${rentSentence(stats)} ` +
      `Compare rent, facilities and distance to campus on Hostello.`,
    faqs: [
      {
        q: `What do ${label} cost?`,
        a: `${rentSentence(stats)}${typicalSentence(stats)} ${messSentence(stats)}`,
      },
      {
        q: 'How close to campus are they?',
        a: `${bandSentence(stats, 'the nearest campus gate each listing names')} ${DISTANCE_NOTE}`,
      },
      {
        q: `What does "${gender.chip}" mean on a listing?`,
        a:
          'It is the answer the owner gave for the building, and it is the only thing the directory records about who lives there. ' +
          'Whether a warden lives on site, when the gate shuts and whether families may visit are not recorded on any listing yet, so they are worth asking before a visit.',
      },
      NOT_RECORDED,
    ],
  };
}

/* ── Sideways moves ─────────────────────────────────────────────────────── */

/**
 * Every count on a related chip is the size of the page it links to, taken
 * from the directory index rather than from the facet counts of the page it
 * sits on. A chip that promises 35 and delivers 91 is worse than a chip with
 * no number at all.
 */
const cap = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;

const topCampuses = (index, exclude, limit) =>
  Object.entries(index?.byCampus || {})
    .filter(([name, n]) => n > 0 && name !== exclude)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);

export function campusRelated(campus, index) {
  const gendered = (value) => index?.byCampusGender?.[`${campus.name}|${value}`] ?? 0;

  return [
    {
      href: `${campusPath(campus.name)}?gender=Female`,
      label: `Girls hostels near ${campus.name}`,
      count: gendered('Female'),
    },
    {
      href: `${campusPath(campus.name)}?gender=Male`,
      label: `Boys hostels near ${campus.name}`,
      count: gendered('Male'),
    },
    ...topCampuses(index, campus.name, 3).map(([name, n]) => ({
      href: campusPath(name),
      label: `Hostels near ${name}`,
      count: n,
    })),
    {
      href: cityPath(campus.city),
      label: `Student hostels in ${campus.city}`,
      count: index?.byCity?.[campus.city] ?? 0,
    },
  ];
}

export function cityRelated(city, index) {
  const otherCities = Object.entries(index?.byCity || {}).filter(([name]) => name !== city);

  return [
    ...Object.entries(GENDER_SLUGS).map(([slug, g]) => ({
      href: genderCityPath(city, slug),
      label: `${cap(g.word)} hostels in ${city}`,
      count: index?.byCityGender?.[`${city}|${g.value}`] ?? 0,
    })),
    ...topCampuses(index, null, 3).map(([name, n]) => ({
      href: campusPath(name),
      label: `Hostels near ${name}`,
      count: n,
    })),
    ...otherCities.map(([name, n]) => ({
      href: cityPath(name),
      label: `Student hostels in ${name}`,
      count: n,
    })),
  ];
}

export function genderCityRelated(city, slug, index) {
  const g = GENDER_SLUGS[slug];
  const otherGenders = Object.entries(GENDER_SLUGS).filter(([key]) => key !== slug);
  const otherCities = Object.entries(index?.byCity || {}).filter(([name]) => name !== city);

  return [
    ...topCampuses(index, null, 3).map(([name]) => ({
      href: `${campusPath(name)}?gender=${encodeURIComponent(g.value)}`,
      label: `${cap(g.word)} hostels near ${name}`,
      count: index?.byCampusGender?.[`${name}|${g.value}`] ?? 0,
    })),
    ...otherGenders.map(([key, other]) => ({
      href: genderCityPath(city, key),
      label: `${cap(other.word)} hostels in ${city}`,
      count: index?.byCityGender?.[`${city}|${other.value}`] ?? 0,
    })),
    ...otherCities.map(([name]) => ({
      href: genderCityPath(name, slug),
      label: `${cap(g.word)} hostels in ${name}`,
      count: index?.byCityGender?.[`${name}|${g.value}`] ?? 0,
    })),
    {
      href: cityPath(city),
      label: `Student hostels in ${city}`,
      count: index?.byCity?.[city] ?? 0,
    },
  ];
}

/**
 * Lahore has 3 listings and Karachi has 2. A page with two results should say
 * so rather than pad itself out, so the thin case is a named state.
 */
export function thinNoticeFor(phrase, total) {
  if (total === 0 || total > 5) return null;
  return {
    title: `Coverage ${phrase} is thin`,
    body: `Hostello has ${hostels(total)} published here. Most of the directory is in Islamabad and Rawalpindi, so this page is short on purpose rather than filtered down to nothing.`,
  };
}

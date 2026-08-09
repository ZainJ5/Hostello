import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Figma section/mess-menu 85:2135, with one divergence that the data forces.
 *
 * The frame draws four columns: Day, Breakfast, Lunch, Dinner. `Hostel.messMenu`
 * is a Map of day to a single string, so the three meals are not separable and
 * a four column table would have to invent the split. It is rendered as two
 * columns, Day and what the kitchen serves, which is exactly what the owner
 * typed.
 *
 * Six of 124 listings carry a day map and one carries a photo, so the section
 * is absent on almost every listing rather than showing an empty table.
 *
 * The keys are whatever the owner typed, so they are sorted against a
 * canonical week and anything unrecognised keeps its insertion order at the
 * end.
 */
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LONG = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

function orderDays(entries) {
  const rank = (k) => {
    const i = WEEK.findIndex((d) => String(k).toLowerCase().startsWith(d.toLowerCase()));
    return i === -1 ? 99 : i;
  };
  return [...entries].sort((a, b) => rank(a[0]) - rank(b[0]));
}

/** True when a listing has anything to show, so the page can omit the section. */
export function hasMess(hostel) {
  const days = Object.entries(hostel?.messMenu || {}).filter(([, v]) => v);
  const photos = (hostel?.messMenuImages || []).filter(Boolean);
  return days.length > 0 || photos.length > 0;
}

export default function MessMenu({ menu, images = [], name, className }) {
  const entries = orderDays(Object.entries(menu || {}).filter(([, v]) => v));
  const photos = (images || []).filter(Boolean);

  if (!entries.length && !photos.length) return null;

  return (
    <div className={cn('flex w-full flex-col gap-4', className)}>
      {entries.length ? (
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Weekly mess menu for {name}</caption>
          <thead>
            <tr className="border-b border-solid border-ds-hairline">
              <th scope="col" className="ds-label w-2/5 py-2 text-ds-ink-muted">
                Day
              </th>
              <th scope="col" className="ds-label py-2 text-ds-ink-muted">
                What the kitchen serves
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([day, meal]) => (
              <tr key={day} className="border-b border-solid border-ds-hairline">
                <th scope="row" className="ds-body-m py-2.5 pr-4 align-top font-normal text-ds-ink">
                  {LONG[day] || day}
                </th>
                <td className="ds-mono-table py-2.5 align-top text-ds-ink">{meal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {photos.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {photos.map((src, i) => (
            <li key={src} className="relative aspect-4/3 overflow-hidden rounded-ds-inner bg-ds-photo">
              <Image
                src={src}
                alt={`${name}, mess menu photograph ${i + 1}`}
                fill
                sizes="(min-width: 640px) 26rem, 100vw"
                className="object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}

      <p className="ds-body-s text-ds-ink-muted">
        The menu rotates and the owner updates it, so treat it as the shape of the week rather
        than a promise. Timings and whether the mess runs on a Sunday are worth confirming on
        the call.
      </p>
    </div>
  );
}

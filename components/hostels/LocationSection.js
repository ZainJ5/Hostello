import Link from 'next/link';
import { GraduationCap, MapPin, Navigation } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn, haversineKm } from '@/lib/utils';
import { CAMPUSES, campusesInCity, getCampus } from './campuses';

/**
 * Address plus a distance table to every campus this listing is tagged with.
 *
 * Listings only store `distanceKm` to their *nearest* university, which can't
 * answer "and how far is COMSATS?", so distances are computed here with
 * `haversineKm` against the campus coordinate table. Straight-line distance is
 * labelled as such; on Islamabad's grid it runs roughly 20–30% under the road
 * distance and we don't want to imply otherwise.
 */
function walkingHint(km) {
  if (km < 1) return 'a short walk';
  if (km < 2.5) return 'a 10-minute rickshaw';
  if (km < 6) return 'a short ride';
  return 'a commute';
}

export default function LocationSection({ hostel, className }) {
  const { lat, lng, universities = [], city, area, address } = hostel;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);

  // Tagged campuses first, then anything else in the same city that is close
  // enough to be useful; a listing 30km from a campus isn't "near" it.
  const tagged = universities.map((u) => getCampus(u)).filter(Boolean);
  const taggedNames = new Set(tagged.map((c) => c.name));
  const nearby = hasCoords
    ? campusesInCity(city)
        .filter((c) => !taggedNames.has(c.name))
        .map((c) => ({ campus: c, km: haversineKm(lat, lng, c.lat, c.lng) }))
        .filter((r) => r.km <= 12)
    : [];

  const rows = [
    ...tagged.map((c) => ({
      campus: c,
      km: hasCoords ? haversineKm(lat, lng, c.lat, c.lng) : null,
      tagged: true,
    })),
    ...nearby.map((r) => ({ ...r, tagged: false })),
  ]
    .sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9))
    .slice(0, 8);

  const line = [area, address].filter(Boolean).join(' · ') || city;
  const mapsHref = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hostel.name} ${line} ${city}`)}`;

  return (
    <div className={className}>
      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface-sunken p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            <MapPin className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{city}</p>
            <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{line}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button href={mapsHref} variant="secondary" size="md" target="_blank" rel="noopener noreferrer">
            <Navigation className="size-4" aria-hidden="true" />
            Open in Maps
          </Button>
          <Button href={`/map?city=${encodeURIComponent(city)}`} variant="ghost" size="md">
            See on Hostello map
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Distance to campus</h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rows.map(({ campus, km, tagged: isTagged }) => (
              <li key={campus.name}>
                <Link
                  href={`/hostels?university=${encodeURIComponent(campus.name)}`}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors duration-200',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isTagged
                      ? 'border-brand-200 bg-brand-50/60 hover:bg-brand-50 dark:border-brand-900 dark:bg-brand-950/40 dark:hover:bg-brand-950'
                      : 'border-border bg-surface hover:bg-muted'
                  )}
                >
                  <GraduationCap
                    className={cn(
                      'size-4 shrink-0',
                      isTagged ? 'text-brand-700 dark:text-brand-300' : 'text-muted-foreground'
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {campus.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {CAMPUSES[campus.name]?.full || campus.full}
                    </span>
                  </span>
                  {km !== null && (
                    <span className="tabular shrink-0 text-right">
                      <span className="block text-sm font-semibold text-foreground">
                        {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {walkingHint(km)}
                      </span>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Straight-line distance from the listing to the main campus gate. Road
            distance is usually a little longer.
          </p>
        </div>
      )}
    </div>
  );
}

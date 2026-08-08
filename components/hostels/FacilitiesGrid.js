import { CircleSlash } from 'lucide-react';
import { FACILITIES } from '@/models/Hostel';
import { cn } from '@/lib/utils';
import { facilityIcon } from './facility-icons';

/**
 * What the hostel offers, in the vocabulary's own order so the same facility
 * always sits in the same place across listings. Notable absences are listed
 * separately and struck through — "no AC" is exactly the sort of thing a
 * student needs to learn before they visit, not after.
 */
export default function FacilitiesGrid({ facilities = [], className }) {
  const has = new Set(facilities);
  const present = FACILITIES.filter((f) => has.has(f));
  // Only call out the handful of amenities people actively screen for.
  const NOTABLE = ['WiFi', 'Meals', 'AC', 'Power Backup', 'Attached Bath', 'Laundry'];
  const missing = NOTABLE.filter((f) => !has.has(f));

  if (!present.length && !missing.length) return null;

  return (
    <div className={className}>
      {present.length > 0 ? (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
          {present.map((f) => {
            const Icon = facilityIcon(f);
            return (
              <li key={f} className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 text-sm text-foreground">{f}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          The owner hasn&apos;t listed facilities yet — worth asking when you call.
        </p>
      )}

      {missing.length > 0 && present.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-3 text-sm font-medium text-foreground">Not offered</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
            {missing.map((f) => (
              <li key={f} className={cn('flex items-center gap-2 text-sm text-muted-foreground')}>
                <CircleSlash className="size-4 shrink-0" aria-hidden="true" />
                <span className="line-through decoration-muted-foreground/50">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

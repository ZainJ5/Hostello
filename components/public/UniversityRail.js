import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Horizontal campus rail. Bleeds to the viewport edge below `lg` so the last
 * card is visibly cut off, which is the cheapest "there is more here" cue, and
 * hides its scrollbar rather than reserving a strip of empty space.
 */
export default function UniversityRail({ universities = [], className }) {
  if (!universities.length) return null;

  return (
    <div
      className={cn(
        'no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0',
        className
      )}
    >
      {universities.map((university) => (
        <Link
          key={university.name}
          href={`/hostels?university=${encodeURIComponent(university.name)}`}
          className={cn(
            'group flex min-w-44 shrink-0 snap-start flex-col gap-3 rounded-[var(--radius-card)]',
            'border border-border bg-surface p-4',
            'transition-[transform,border-color,box-shadow] duration-200 ease-out',
            'hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-md',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
          )}
        >
          <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700 transition-colors duration-200 group-hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:group-hover:bg-brand-900">
            <GraduationCap className="size-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-foreground">{university.name}</span>
          <span className="tabular text-sm text-muted-foreground">
            {university.count} {university.count === 1 ? 'hostel' : 'hostels'}
          </span>
        </Link>
      ))}
    </div>
  );
}

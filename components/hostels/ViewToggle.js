import Link from 'next/link';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hostelsHref } from './filters';

const OPTIONS = [
  { value: 'grid', label: 'Grid view', icon: LayoutGrid },
  { value: 'list', label: 'List view', icon: Rows3 },
];

/**
 * Grid vs list. Plain links rather than a client toggle: the layout lives in
 * the URL, so it survives a refresh and a shared link opens the same way.
 */
export default function ViewToggle({ filters, className }) {
  return (
    <div
      role="group"
      aria-label="Result layout"
      className={cn('inline-flex items-center rounded-xl bg-muted', className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = filters.view === value;
        return (
          <Link
            key={value}
            href={hostelsHref(filters, { view: value })}
            scroll={false}
            aria-label={label}
            aria-current={active ? 'true' : undefined}
            className={cn(
              // 44px target on every device, and the group is exactly as tall
              // as the sort control sitting beside it.
              'grid size-11 cursor-pointer place-items-center rounded-xl transition-all duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              active
                ? 'bg-surface text-brand-800 ring-1 ring-border shadow-sm dark:text-brand-200'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}

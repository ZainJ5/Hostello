import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Consistent page masthead for the console. Server component, so nothing here
 * is interactive beyond links.
 */
export default function PageHeader({ title, description, action, back, className }) {
  return (
    <div className={cn('mb-6', className)}>
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex h-9 items-center gap-1 rounded-lg pr-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-h2 text-foreground text-balance">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

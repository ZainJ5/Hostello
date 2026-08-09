'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

/**
 * Error boundary for the owner console. Keeps the owner inside their console
 * with a way forward instead of dropping them on a blank framework error page.
 */
export default function OwnerError({ error, reset }) {
  useEffect(() => {
    console.error('[owner console]', error);
  }, [error]);

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger dark:bg-danger/15 dark:text-red-300">
          <TriangleAlert className="size-7" aria-hidden="true" />
        </span>
        <h1 className="text-h3 text-foreground">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground text-pretty">
          We could not load this part of your console. Nothing you saved has been lost. Try again,
          and if it keeps happening, tell us what you were doing.
        </p>
        {error?.digest && (
          <p className="tabular text-xs text-muted-foreground">Reference: {error.digest}</p>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" href="/owner">
            Back to dashboard
          </Button>
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </Card>
  );
}

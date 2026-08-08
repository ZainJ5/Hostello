'use client';

import { useEffect } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';

export default function AdminError({ error, reset }) {
  useEffect(() => {
    console.error('[admin]', error);
  }, [error]);

  return (
    <EmptyState
      icon={TriangleAlert}
      title="This screen failed to load"
      description={
        error?.message ||
        'Something went wrong reading from the database. Try again, and check the server log if it keeps happening.'
      }
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" onClick={reset}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Try again
          </Button>
          <Button href="/admin" variant="secondary" size="sm">
            Back to overview
          </Button>
        </div>
      }
    />
  );
}

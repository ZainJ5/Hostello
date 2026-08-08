import { Inbox } from 'lucide-react';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';

export default function AdminNotFound() {
  return (
    <EmptyState
      icon={Inbox}
      title="That record no longer exists"
      description="It may have been deleted, or the link points at an id that was never valid."
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button href="/admin" size="sm">
            Back to overview
          </Button>
          <Button href="/admin/listings" variant="secondary" size="sm">
            All listings
          </Button>
        </div>
      }
    />
  );
}

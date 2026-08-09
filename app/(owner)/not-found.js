import { SearchX } from 'lucide-react';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';

export const metadata = { title: 'Not found' };

/**
 * Shown when a listing, booking or receipt id does not resolve, including when
 * it exists but belongs to another owner. The two cases are deliberately
 * indistinguishable so ids cannot be probed from this console.
 */
export default function OwnerNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="We could not find that"
      description="The listing or record you followed does not exist, or it is not one of yours."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button href="/owner" variant="secondary">
            Dashboard
          </Button>
          <Button href="/owner/listings" variant="primary">
            My listings
          </Button>
        </div>
      }
    />
  );
}

import Container from '@/components/public/Container';
import { Skeleton } from '@/components/ds/Feedback';
import { HostelGridSkeleton } from '@/components/hostels/HostelCardSkeleton';

/**
 * Mirrors /hostels exactly: same gutter, same header band, same 300 rail plus
 * fluid results split, same twelve card grid. The real page then swaps in
 * without moving anything the student is already reading.
 */
export default function HostelsLoading() {
  return (
    <>
      <Container as="section" className="flex flex-col gap-6 pb-7 pt-7">
        <Skeleton className="h-4.5 w-64 max-w-full" />
        <Skeleton className="h-12 w-md max-w-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full max-w-240" />
          <Skeleton className="h-4 w-4/5 max-w-3xl" />
        </div>
      </Container>

      <Container as="section" className="pb-16 pt-2 lg:pt-8">
        <div className="grid items-start gap-10 lg:grid-cols-[18.75rem_minmax(0,1fr)]">
          <div className="ds-elevated hidden rounded-ds-inner p-5 lg:block">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-6 h-11 w-full" />
            {[4, 3, 5, 3, 5].map((rowCount, section) => (
              <div key={section} className="mt-6 flex flex-col gap-2 border-t border-solid border-ds-hairline pt-6">
                <Skeleton className="h-4 w-28" />
                {Array.from({ length: rowCount }, (_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ))}
          </div>

          <div className="min-w-px">
            <div className="-mx-4 mb-6 flex flex-wrap items-center gap-3 bg-ds-surface-sunken px-4 py-3 lg:mx-0 lg:mb-5 lg:bg-transparent lg:px-0 lg:py-0">
              <Skeleton className="order-3 h-5 w-56 lg:order-1 lg:min-w-px lg:flex-1" />
              <Skeleton className="order-1 h-11 w-28 lg:hidden" />
              <Skeleton className="order-2 h-11 min-w-px flex-1 lg:order-3 lg:w-60 lg:flex-none" />
              <Skeleton className="order-4 hidden h-11 w-28 sm:block" />
            </div>
            <HostelGridSkeleton count={12} />
          </div>
        </div>
      </Container>
    </>
  );
}

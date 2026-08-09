import Container from '@/components/public/Container';
import { Skeleton } from '@/components/ds/Feedback';

/**
 * Mirrors the listing page's geometry: header band, three photo slots, and the
 * content plus contact rail split. The real page then drops in without moving
 * anything the student is already looking at.
 */
export default function HostelDetailLoading() {
  return (
    <>
      <Container as="section" className="flex flex-col gap-4 pb-6 pt-6">
        <Skeleton className="h-4.5 w-80 max-w-full" />
        <Skeleton className="h-12 w-lg max-w-full" />
        <Skeleton className="h-6 w-96 max-w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-36 rounded-ds-chip" />
          <Skeleton className="h-7 w-24 rounded-ds-chip" />
          <Skeleton className="h-7 w-40 rounded-ds-chip" />
        </div>
      </Container>

      <Container as="section" className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <Skeleton className="aspect-4/3 w-full" />
          <Skeleton className="hidden aspect-4/3 w-full sm:block" />
          <Skeleton className="hidden aspect-4/3 w-full sm:block" />
        </div>
        <Skeleton className="h-4 w-full max-w-240" />
      </Container>

      <Container as="section" className="pb-28 pt-8 lg:pb-16">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_23.75rem]">
          <div className="flex min-w-px flex-col gap-9">
            {[3, 2, 5, 4].map((lines, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="h-6 w-56" />
                {Array.from({ length: lines }, (_, n) => (
                  <Skeleton key={n} className="h-4 w-full" />
                ))}
              </div>
            ))}
          </div>

          <div className="hidden self-start lg:block">
            <Skeleton className="h-[26rem] w-full rounded-ds-inner" />
          </div>
        </div>
      </Container>
    </>
  );
}

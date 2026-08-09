import Container from '@/components/public/Container';
import { Skeleton } from '@/components/ds/Feedback';

/** Mirrors the enquire page: header band, the routes column and the side panel. */
export default function EnquireLoading() {
  return (
    <>
      <Container as="section" className="flex flex-col gap-4 pb-6 pt-6">
        <Skeleton className="h-4.5 w-96 max-w-full" />
        <Skeleton className="h-12 w-96 max-w-full" />
        <Skeleton className="h-6 w-full max-w-240" />
        <Skeleton className="h-[4.5rem] w-full rounded-ds-inner" />
      </Container>

      <Container as="section" className="pb-16 pt-2">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_25rem]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-80 max-w-full" />
            <Skeleton className="h-36 w-full rounded-ds-inner" />
            <Skeleton className="h-40 w-full rounded-ds-inner" />
            <Skeleton className="h-80 w-full rounded-ds-inner" />
          </div>
          <Skeleton className="hidden h-80 w-full rounded-ds-inner lg:block" />
        </div>
      </Container>
    </>
  );
}

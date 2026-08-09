import { Skeleton } from '@/components/ds/Feedback';

/**
 * The loading shape every community route shares.
 *
 * It draws the layout that is coming, at the sizes it will arrive at: a
 * breadcrumb row, a heading, a paragraph and a stack of cards. A spinner in
 * the middle of an empty page would tell a student nothing about whether they
 * are two seconds from a list or from an empty state, and the page would jump
 * when it resolved.
 *
 * `Skeleton` carries the shimmer and respects prefers-reduced-motion through
 * the shared `.skeleton` rule, so nothing here has to opt out of animation on
 * its own.
 */
export default function PageSkeleton({ cards = 3 }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <span className="sr-only" role="status">
        Loading
      </span>

      <Skeleton className="h-4 w-56" />
      <Skeleton className="mt-4 h-11 w-full max-w-lg" />
      <Skeleton className="mt-4 h-4 w-full max-w-xl" />
      <Skeleton className="mt-2 h-4 w-full max-w-md" />

      <div className="mt-8 flex flex-col gap-3">
        {Array.from({ length: cards }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}

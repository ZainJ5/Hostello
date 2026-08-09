'use client';

import Button from './Button';

/**
 * The body of a route error boundary.
 *
 * It says what went wrong and how to recover, with no apology and no vague
 * wording. The reset button is a real retry: Next re-renders the segment
 * rather than reloading the document, so a transient database timeout costs a
 * tap instead of a page load.
 *
 * The underlying message is never printed. A thrown error can carry a query, a
 * connection string or a stack, and none of that belongs on a student's
 * screen. The digest is shown because it is the only thing that ties what the
 * student saw to what the server logged.
 */
export default function ErrorState({
  title = 'Something went wrong at our end',
  body = 'The page did not load. It is not something you did, and trying again usually works.',
  digest,
  reset,
  homeHref = '/',
  homeLabel = 'Go to the home page',
}) {
  return (
    <div className="mx-auto flex w-full max-w-160 flex-col items-start gap-5 px-4 py-16">
      <h1 className="ds-display-m text-balance text-ds-ink">{title}</h1>
      <p className="ds-body-l text-pretty text-ds-ink-muted">{body}</p>

      <div className="flex flex-wrap items-center gap-3">
        {reset ? <Button onClick={reset}>Try again</Button> : null}
        <Button href={homeHref} variant="secondary">
          {homeLabel}
        </Button>
      </div>

      {digest ? (
        <p className="ds-mono-meta text-ds-ink-muted">
          Reference {digest}. Quote this if you contact us.
        </p>
      ) : null}
    </div>
  );
}

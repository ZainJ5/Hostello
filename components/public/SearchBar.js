'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';
import { cn } from '@/lib/utils';

/**
 * Figma campus-field plus button/primary inside section/hero 89:2480.
 *
 * ONE FIELD, NOT FIVE. The live site's hero carried a search box and three
 * selects in a pill. Four controls before a student has decided anything is a
 * form, not an entry point, and the only one of the four that changes what
 * they see in a useful way is the campus: rent and gender are one tap away on
 * the browse page, with live counts beside every option, which is a better
 * place to make that decision than a hero with no results on screen.
 *
 * Selecting a campus and pressing the button lands on /hostels?university=X,
 * so the hero produces a real URL rather than a client side state.
 *
 * The control is a native select. It gives the platform picker on a phone, a
 * real listbox to a screen reader, and correct keyboard handling, and the
 * closed control matches the frame.
 */
export default function SearchBar({ universities = [], className }) {
  const router = useRouter();
  const [university, setUniversity] = useState('');

  function submit(event) {
    event.preventDefault();
    router.push(university ? `/hostels?university=${encodeURIComponent(university)}` : '/hostels');
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn('flex w-full flex-col gap-3 sm:flex-row sm:items-center', className)}
    >
      <div
        className={cn(
          'flex min-w-px flex-1 rounded-ds-slot',
          'focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt'
        )}
        style={{ padding: 'var(--ds-focus-gap)' }}
      >
        <div
          className={cn(
            'flex min-w-px flex-1 flex-col justify-center gap-0.5 overflow-hidden px-3 py-2',
            'rounded-ds-inner border border-solid border-ds-control bg-ds-surface-raised',
            'transition-colors duration-150 motion-reduce:transition-none',
            'hover:border-ds-cobalt focus-within:border-ds-ink'
          )}
        >
          <label htmlFor="hero-campus" className="ds-body-s text-ds-ink-muted">
            Your university
          </label>
          <select
            id="hero-campus"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            className="ds-body-m-strong w-full min-w-px cursor-pointer appearance-none bg-transparent text-ds-ink focus:outline-none"
          >
            <option value="">
              {universities.length
                ? `Pick from ${universities.length} campuses`
                : 'Every campus'}
            </option>
            {universities.map((u) => (
              <option key={u.name} value={u.name}>
                {u.name}
                {typeof u.count === 'number' ? `, ${u.count} hostels` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button type="submit" className="w-full sm:w-auto sm:shrink-0">
        Show hostels
      </Button>
    </form>
  );
}

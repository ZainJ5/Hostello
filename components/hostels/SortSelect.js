'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui/Field';
import { SORTS, hostelsHref } from './filters';

/**
 * Sort is a real navigation so the chosen order lives in the URL. Changing it
 * always returns to page 1, because page 3 of "price low to high" has nothing
 * to do with page 3 of "newest".
 */
export default function SortSelect({ filters, className }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      aria-label="Sort results"
      value={filters.sort}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() =>
          router.push(hostelsHref(filters, { sort: e.target.value, page: 1 }), { scroll: false })
        )
      }
      className={className}
    >
      {SORTS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </Select>
  );
}

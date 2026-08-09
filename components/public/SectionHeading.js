import { SECTION_TITLE } from './type';
import { cn } from '@/lib/utils';

/**
 * One heading treatment for every home page section, from page/home/1440
 * 89:2467: a display/m title, then one line of body/m underneath it that says
 * what the section is and, where it matters, what it is not.
 *
 * No eyebrow. The 2026 system has no label style sitting above a heading, and
 * an all-caps kicker over every block is noise repeated eight times down a
 * page.
 */
export default function SectionHeading({ title, description, action, className }) {
  return (
    <div className={cn('flex w-full flex-col gap-5', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <h2 className={cn(SECTION_TITLE, 'min-w-px max-w-[30ch] text-balance text-ds-ink')}>{title}</h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {description ? (
        <p className="ds-body-m max-w-[100ch] text-pretty text-ds-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}

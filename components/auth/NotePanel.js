import { cn } from '@/lib/utils';

/**
 * The explanatory panel that closes four of the five auth frames: sunken fill,
 * hairline keyline, a strong title and one or two paragraphs of plain body.
 *
 * It is not an Alert. Nothing has gone wrong and nothing needs acting on, so
 * it carries no role, no tone and no icon. It exists because these screens ask
 * for something and the panel says what happens to it.
 */
export default function NotePanel({ title, children, className }) {
  return (
    <section
      className={cn(
        'flex flex-col gap-2 rounded-ds-inner border border-solid border-ds-hairline bg-ds-surface-sunken p-4',
        className
      )}
    >
      {title ? <h2 className="ds-body-m-strong text-ds-ink">{title}</h2> : null}
      <div className="ds-body-s flex flex-col gap-2 text-pretty text-ds-ink-muted">
        {children}
      </div>
    </section>
  );
}

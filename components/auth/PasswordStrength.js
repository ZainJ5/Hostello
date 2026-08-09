'use client';

import { cn } from '@/lib/utils';
import { PASSWORD_RULES, scorePassword } from './validation';

/**
 * Strength meter for the signup and reset forms.
 *
 * It uses the strip grammar the design system already has: solid ink for a
 * segment that counts, a hollow keyline for one that does not, at the 6px meta
 * height rather than the 12px the bed strip reserves for itself. The 2026
 * palette carries no green and no amber, so there is no traffic light ramp to
 * lean on here, and the reading was never allowed to depend on colour anyway.
 *
 * The word beside the strip and the checklist below it carry the meaning. The
 * checklist marks a met rule with a solid square and an unmet one with a
 * hollow square, the same solid versus hollow rule, so the list reads without
 * colour and without an icon font.
 */
export default function PasswordStrength({ value = '', className }) {
  const password = String(value || '');
  const { score, label } = scorePassword(password);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-3">
        <div aria-hidden="true" className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={cn(
                'min-w-px flex-1 border border-solid border-ds-control',
                step <= score ? 'bg-ds-ink' : 'bg-ds-surface'
              )}
              style={{ height: 'var(--ds-strip-meta)' }}
            />
          ))}
        </div>
        <span className="ds-body-s-strong w-14 shrink-0 text-right text-ds-ink">{label}</span>
      </div>

      {/* One polite announcement instead of a stream of them per keystroke. */}
      <p className="sr-only" aria-live="polite">
        {label ? `Password strength: ${label}` : ''}
      </p>

      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(password);
          return (
            <li
              key={rule.id}
              className={cn(
                'ds-body-s inline-flex items-center gap-1.5',
                passed ? 'text-ds-ink' : 'text-ds-ink-muted'
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'size-2 shrink-0 border border-solid border-ds-control',
                  passed && 'bg-ds-ink'
                )}
              />
              <span>{rule.label}</span>
              <span className="sr-only">{passed ? ': met' : ': not met yet'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

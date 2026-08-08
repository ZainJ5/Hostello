'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PASSWORD_RULES, scorePassword } from './validation';

/*
 * Text colours step away from the raw status tokens where those tokens don't
 * clear 4.5:1 on the surface behind them — `warning` (#d97706) and `success`
 * (#059669) both fall short on white at this size, so the light theme borrows
 * the darker step from the same hue.
 */
const TONES = [
  { bar: 'bg-muted', text: 'text-muted-foreground' },
  { bar: 'bg-danger', text: 'text-red-600 dark:text-red-400' },
  { bar: 'bg-warning', text: 'text-amber-700 dark:text-amber-400' },
  { bar: 'bg-brand-500', text: 'text-brand-700 dark:text-brand-300' },
  { bar: 'bg-success', text: 'text-emerald-700 dark:text-emerald-400' },
];

/**
 * Strength meter for the signup and reset forms. The four bars are decorative —
 * the word beside them ("Weak" … "Strong") and the checklist below carry the
 * meaning, so the reading never depends on colour alone.
 */
export default function PasswordStrength({ value = '', className }) {
  const password = String(value || '');
  const { score, label } = scorePassword(password);
  const tone = TONES[score] || TONES[0];

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-1.5 flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={cn(
                'h-full flex-1 rounded-full transition-colors duration-300',
                step <= score ? tone.bar : 'bg-muted'
              )}
            />
          ))}
        </div>
        <span className={cn('w-12 text-right text-xs font-semibold', tone.text)}>
          {label}
        </span>
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
                'inline-flex items-center gap-1.5 text-xs transition-colors duration-200',
                passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
              )}
            >
              {passed ? (
                <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />
              ) : (
                <X className="size-3.5 shrink-0 opacity-50" aria-hidden="true" />
              )}
              <span>{rule.label}</span>
              <span className="sr-only">{passed ? '— met' : '— not met yet'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

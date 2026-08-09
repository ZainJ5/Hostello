'use client';

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export const OTP_LENGTH = 6;

/**
 * Six-box one-time-code entry.
 *
 * Behaviour worth knowing:
 *  - The value is always left-packed, so there is never a hole in the middle.
 *    Clicking an empty box past the end bounces focus to the first empty one.
 *  - Pasting anywhere fills every box; non-digits in the clipboard are dropped,
 *    so "Your code is 418 302" pastes cleanly.
 *  - Backspace clears the current box, or steps back and clears the previous
 *    one when the current box is already empty.
 *  - Arrow keys, Home and End move between boxes; typing over a filled box
 *    replaces it instead of being swallowed by maxLength.
 *  - The first box carries autocomplete="one-time-code" so iOS and Android
 *    offer the code straight from the SMS/mail notification.
 */
export default function OtpInput({
  value = '',
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
  autoFocus = false,
  label = 'Verification code',
  describedBy,
}) {
  const refs = useRef([]);
  const chars = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] || '');
  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  const focusAt = useCallback((index) => {
    const el = refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))];
    if (!el) return;
    el.focus();
    el.select?.();
  }, []);

  useEffect(() => {
    if (autoFocus) focusAt(0);
  }, [autoFocus, focusAt]);

  const emit = useCallback(
    (raw, focusIndex, { force = false } = {}) => {
      const next = String(raw).replace(/\D/g, '').slice(0, OTP_LENGTH);
      const wasIncomplete = value.length < OTP_LENGTH;
      onChange?.(next);
      if (focusIndex !== undefined) {
        // After React commits the new values, or the caret lands in a box that
        // is about to be re-rendered.
        requestAnimationFrame(() => focusAt(focusIndex));
      }
      // Only on the transition into a full code (or an explicit refill), so
      // going back to correct one digit doesn't re-fire the auto-submit.
      if (next.length === OTP_LENGTH && (wasIncomplete || force)) onComplete?.(next);
    },
    [focusAt, onChange, onComplete, value.length]
  );

  function handleChange(index, raw) {
    const digits = String(raw).replace(/\D/g, '');
    if (!digits) return;

    // A password manager or Android autofill can drop the whole code into one
    // box, so treat that like a paste.
    if (digits.length > 1) {
      emit(digits, Math.min(digits.length, OTP_LENGTH - 1), { force: true });
      return;
    }

    const arr = value.split('');
    arr[Math.min(index, arr.length)] = digits;
    emit(arr.join(''), index + 1);
  }

  function handleKeyDown(index, event) {
    const arr = value.split('');

    switch (event.key) {
      case 'Backspace': {
        event.preventDefault();
        if (arr[index]) {
          arr.splice(index, 1);
          emit(arr.join(''), index);
        } else if (index > 0) {
          arr.splice(index - 1, 1);
          emit(arr.join(''), index - 1);
        }
        return;
      }
      case 'Delete': {
        event.preventDefault();
        arr.splice(index, 1);
        emit(arr.join(''), index);
        return;
      }
      case 'ArrowLeft':
        event.preventDefault();
        focusAt(index - 1);
        return;
      case 'ArrowRight':
        event.preventDefault();
        focusAt(index + 1);
        return;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        return;
      case 'End':
        event.preventDefault();
        focusAt(activeIndex);
        return;
      default:
        break;
    }

    if (/^\d$/.test(event.key) && arr[index]) {
      event.preventDefault();
      arr[index] = event.key;
      emit(arr.join(''), index + 1);
    }
  }

  function handlePaste(event) {
    const text = (event.clipboardData?.getData('text') || '')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH);
    if (!text) return;
    event.preventDefault();
    emit(text, Math.min(text.length, OTP_LENGTH - 1), { force: true });
  }

  function handleFocus(index, event) {
    if (index > activeIndex) {
      focusAt(activeIndex);
      return;
    }
    event.target.select?.();
  }

  return (
    <div
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      className="grid grid-cols-6 gap-2 sm:gap-2.5"
    >
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={char}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
          aria-invalid={invalid ? 'true' : undefined}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => handleFocus(index, e)}
          className={cn(
            'ds-figure-l w-full rounded-ds-inner border border-solid bg-ds-surface-raised text-center text-ds-ink',
            'transition-colors duration-150 motion-reduce:transition-none',
            // The boxes sit in a gapped grid, so the ring can be drawn on the
            // box itself at zero offset without a slot and without reflow.
            'focus:outline-2 focus:outline-offset-0 focus:outline-ds-cobalt focus:border-ds-ink',
            'disabled:cursor-not-allowed disabled:border-ds-hairline disabled:bg-ds-surface-sunken disabled:text-ds-ink-muted',
            invalid
              ? 'border-ds-error'
              : char
                ? 'border-ds-ink hover:border-ds-cobalt'
                : 'border-ds-control hover:border-ds-cobalt'
          )}
          style={{ height: 'var(--ds-control-h)' }}
        />
      ))}
    </div>
  );
}

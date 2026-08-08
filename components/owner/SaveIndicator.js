'use client';

import { Check, CircleAlert, CloudUpload, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Persistent autosave status. Owners fill a long form on a phone; they need to
 * be able to glance up and know their work is safe.
 */
export default function SaveIndicator({ state, dirty, error, className }) {
  const resolved = state === 'saving' ? 'saving' : state === 'error' ? 'error' : dirty ? 'dirty' : state;

  const map = {
    saving: { icon: CloudUpload, label: 'Saving…', tone: 'text-muted-foreground' },
    dirty: { icon: Pencil, label: 'Unsaved changes', tone: 'text-muted-foreground' },
    saved: { icon: Check, label: 'Draft saved', tone: 'text-success dark:text-emerald-400' },
    error: { icon: CircleAlert, label: error || 'Could not save', tone: 'text-danger' },
    idle: { icon: Check, label: 'Up to date', tone: 'text-muted-foreground' },
  };

  const entry = map[resolved] || map.idle;
  const Icon = entry.icon;

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium', entry.tone, className)}
    >
      <Icon className={cn('size-3.5 shrink-0', resolved === 'saving' && 'animate-pulse')} aria-hidden="true" />
      {entry.label}
    </p>
  );
}

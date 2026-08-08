'use client';

import { useEffect, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Native share sheet where the platform offers one (all mobile browsers),
 * clipboard copy everywhere else. The confirmation is announced politely so
 * the outcome isn't colour-and-icon only.
 */
export default function ShareButton({ title, text, className }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(t);
  }, [copied]);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // A dismissed share sheet rejects too — nothing to report either way.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        'inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-medium',
        'text-foreground transition-colors duration-200 hover:bg-muted',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className
      )}
    >
      {copied ? (
        <Check className="size-4 text-success" aria-hidden="true" />
      ) : (
        <Share2 className="size-4" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{copied ? 'Link copied' : 'Share'}</span>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Link copied to clipboard' : ''}
      </span>
      <span className="sr-only sm:hidden">Share this hostel</span>
    </button>
  );
}

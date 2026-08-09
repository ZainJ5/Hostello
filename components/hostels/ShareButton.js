'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ds/Button';
import { cn } from '@/lib/utils';

/**
 * "Send this to your family" from aside/contact 85:2268.
 *
 * That is what this control is actually for in Pakistan: the person who
 * decides is very often a parent, and the way it reaches them is WhatsApp. So
 * the native share sheet is the first choice, because on every phone browser
 * it opens WhatsApp with one tap. Clipboard copy is the desktop fallback.
 *
 * The outcome is announced politely and stated in words, never as a colour
 * change on an icon.
 */
export default function ShareButton({ title, text, label = 'Send this to your family', className }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2400);
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
      // A dismissed share sheet rejects too, so there is nothing to report.
    }
  }

  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      <Button variant="secondary" onClick={share} className="w-full">
        {copied ? 'Link copied' : label}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Link copied to the clipboard' : ''}
      </span>
    </div>
  );
}

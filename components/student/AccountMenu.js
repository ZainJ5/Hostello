'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Compass, LogOut, UserRound } from 'lucide-react';
import { Avatar } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';

/**
 * Compact account control for the student shell. Sign-out posts to the auth
 * stream's endpoint, then navigates home and refreshes — the refresh clears
 * the client router cache so no dashboard payload rendered under the old
 * session can be restored with the back button.
 */
export default function AccountMenu({ name, email, avatar }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrap = useRef(null);
  const trigger = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(e) {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Network failure still falls through to the redirect below — the route
      // guard will bounce them if the cookie somehow survived.
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="relative" ref={wrap}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-transparent pr-2 pl-1.5 text-sm font-medium',
          'transition-colors duration-200 hover:border-border hover:bg-muted',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          open && 'border-border bg-muted'
        )}
      >
        <Avatar name={name} src={avatar} size="sm" />
        <span className="hidden max-w-32 truncate sm:block">{name}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="animate-scale-in absolute right-0 z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-xl"
        >
          <div className="border-b border-border p-4">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <div className="p-1.5">
            <Link
              role="menuitem"
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
              Profile &amp; settings
              <ChevronRight className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
            <Link
              role="menuitem"
              href="/hostels"
              onClick={() => setOpen(false)}
              className="flex h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <Compass className="size-4 text-muted-foreground" aria-hidden="true" />
              Browse hostels
              <ChevronRight className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </div>
          <div className="border-t border-border p-1.5">
            <button
              role="menuitem"
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm text-danger transition-colors duration-200 hover:bg-danger-soft/60 disabled:opacity-60 dark:hover:bg-danger/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

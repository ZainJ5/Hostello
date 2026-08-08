import { Terminal } from 'lucide-react';
import { Alert } from '@/components/ui/Feedback';

/**
 * Shown when `sendVerificationCode` reported `delivered: false` — no SMTP_HOST
 * is configured, so the code went to the server console instead of an inbox.
 *
 * The code itself is deliberately not here. The API never returns `devCode`,
 * and printing it in the page would make the "dev only" convenience a real
 * account-takeover primitive the moment this build reaches a shared host.
 */
export default function DevMailNotice({ show, className }) {
  if (!show) return null;

  return (
    <Alert tone="warning" title="Development mode — no email was sent" className={className}>
      <span className="flex gap-2">
        <Terminal className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          <code className="rounded bg-warning/15 px-1 py-0.5 font-mono text-[0.8125rem]">
            SMTP_HOST
          </code>{' '}
          is empty, so your 6-digit code was printed to the terminal running{' '}
          <code className="rounded bg-warning/15 px-1 py-0.5 font-mono text-[0.8125rem]">
            npm run dev
          </code>
          . Copy it from the server console.
        </span>
      </span>
    </Alert>
  );
}

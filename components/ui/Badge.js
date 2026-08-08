import { cn } from '@/lib/utils';

const TONES = {
  neutral: 'bg-muted text-muted-foreground',
  brand: 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-300',
  accent: 'bg-accent-100 text-accent-700 dark:bg-accent-700/20 dark:text-accent-300',
  success: 'bg-success-soft text-success dark:bg-success/15 dark:text-emerald-300',
  warning: 'bg-warning-soft text-warning dark:bg-warning/15 dark:text-amber-300',
  danger: 'bg-danger-soft text-danger dark:bg-danger/15 dark:text-red-300',
  info: 'bg-info-soft text-info dark:bg-info/15 dark:text-sky-300',
  solid: 'bg-foreground text-background',
};

const SIZES = {
  sm: 'h-5 px-2 text-[11px] gap-1',
  md: 'h-6 px-2.5 text-xs gap-1.5',
  lg: 'h-7 px-3 text-sm gap-1.5',
};

export default function Badge({
  tone = 'neutral',
  size = 'md',
  className,
  children,
  ...props
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        TONES[tone] || TONES.neutral,
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * Maps a listing/booking/payment status to a consistent tone and label so the
 * same state never appears in two different colours across the app.
 */
const STATUS_MAP = {
  // Hostel
  draft: { tone: 'neutral', label: 'Draft' },
  pending_payment: { tone: 'warning', label: 'Awaiting payment' },
  pending_review: { tone: 'info', label: 'In review' },
  published: { tone: 'success', label: 'Live' },
  rejected: { tone: 'danger', label: 'Rejected' },
  suspended: { tone: 'danger', label: 'Suspended' },
  // Booking
  pending: { tone: 'warning', label: 'Pending' },
  confirmed: { tone: 'success', label: 'Confirmed' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
  completed: { tone: 'brand', label: 'Completed' },
  // Payment
  approved: { tone: 'success', label: 'Approved' },
  // Review
  flagged: { tone: 'warning', label: 'Flagged' },
  removed: { tone: 'danger', label: 'Removed' },
  // User
  active: { tone: 'success', label: 'Active' },
};

export function StatusBadge({ status, size = 'md', className }) {
  const s = STATUS_MAP[status] || { tone: 'neutral', label: status };
  return (
    <Badge tone={s.tone} size={size} className={className}>
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-current opacity-70"
      />
      {s.label}
    </Badge>
  );
}

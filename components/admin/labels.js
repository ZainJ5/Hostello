/**
 * Shared vocabulary for the console. Deliberately free of imports so both the
 * server route handlers and the client tables can use the same strings.
 */
export const ACTION_LABELS = {
  'listing.create': 'Created listing',
  'listing.update': 'Updated listing',
  'listing.delete': 'Deleted listing',
  'listing.status': 'Changed listing status',
  'listing.bulk': 'Bulk listing action',
  'payment.approve': 'Approved payment',
  'payment.reject': 'Rejected payment',
  'booking.status': 'Changed booking status',
  'review.approve': 'Approved review',
  'review.remove': 'Removed review',
  'review.restore': 'Restored review',
  'review.delete': 'Deleted review',
  'user.role': 'Changed user role',
  'user.status': 'Changed user status',
  'user.delete': 'Deleted account',
  'settings.update': 'Updated platform settings',
  'upload.create': 'Uploaded images',
  'upload.delete': 'Deleted an image',
  'user.signup': 'New account',
  'booking.created': 'New booking request',
};

export function actionLabel(action) {
  return ACTION_LABELS[action] || String(action || '').replace(/[.\-_]/g, ' ');
}

/** Tone used for the dot beside an activity row, never the only cue. */
export function actionTone(action) {
  if (!action) return 'neutral';
  if (action.endsWith('.delete') || action.endsWith('.reject') || action.endsWith('.remove')) {
    return 'danger';
  }
  if (action.endsWith('.approve') || action === 'listing.create' || action === 'user.signup') {
    return 'success';
  }
  if (action.startsWith('settings')) return 'warning';
  return 'info';
}

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_payment', label: 'Awaiting payment' },
  { value: 'pending_review', label: 'In review' },
  { value: 'published', label: 'Live' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

export const BOOKING_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

export const REVIEW_STATUS_OPTIONS = [
  { value: 'flagged', label: 'Flagged' },
  { value: 'published', label: 'Published' },
  { value: 'removed', label: 'Removed' },
];

export const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
];

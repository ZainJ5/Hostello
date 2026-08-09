'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { formatDate } from '@/lib/utils';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { apiSend } from './api-client';

/**
 * Confirm/decline dialog shared by the dashboard's inline list and the full
 * bookings page, so the wording, the optional message and the email that goes
 * to the student are identical wherever an owner responds from.
 */
export default function RespondDialog({ booking, mode, onClose, onDone }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const router = useRouter();

  const confirming = mode === 'confirmed';
  if (!booking) return null;

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const data = await apiSend(`/api/owner/bookings/${booking._id}`, {
        method: 'PATCH',
        body: { status: mode, message: message.trim() || undefined },
      });
      toast.success(
        confirming
          ? `Confirmed. ${booking.studentName || 'The student'} has been emailed.`
          : `Declined. ${booking.studentName || 'The student'} has been emailed.`
      );
      onDone?.(data.booking);
      onClose?.();
      router.refresh();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title={confirming ? 'Confirm this booking' : 'Decline this request'}
      description={
        confirming
          ? 'The student is emailed straight away with your contact details.'
          : 'The student is emailed and pointed at similar hostels.'
      }
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={confirming ? 'primary' : 'danger'}
            onClick={submit}
            loading={busy}
          >
            {confirming ? 'Confirm booking' : 'Decline request'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-surface-sunken p-4 text-sm">
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Student</dt>
            <dd className="font-medium text-foreground">{booking.studentName || 'Unnamed'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Listing</dt>
            <dd className="truncate font-medium text-foreground">{booking.hostelName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Room type</dt>
            <dd className="font-medium text-foreground">{booking.roomType || 'Any'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Move-in</dt>
            <dd className="tabular font-medium text-foreground">
              {booking.moveInDate ? formatDate(booking.moveInDate) : 'Flexible'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Duration</dt>
            <dd className="tabular font-medium text-foreground">
              {booking.durationMonths} month{booking.durationMonths === 1 ? '' : 's'}
            </dd>
          </div>
        </dl>

        <Textarea
          label={confirming ? 'Message to the student (optional)' : 'Reason (optional)'}
          hint={
            confirming
              ? 'Tell them what to bring, or when to visit. This goes into the email.'
              : 'A short honest reason, such as "no female rooms free until March", saves everyone time.'
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={
            confirming
              ? 'Your room is held for 3 days. Call me to arrange a viewing.'
              : 'Sorry, all double rooms are taken until the next semester.'
          }
        />

        {error && <Alert tone="danger">{error}</Alert>}
      </div>
    </Modal>
  );
}

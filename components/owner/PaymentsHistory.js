'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ImageIcon, Receipt, Upload } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { cn, formatDate, formatPKR } from '@/lib/utils';
import { Modal } from './Modal';

/**
 * The receipt is fetched from the authenticated route, not from
 * `/uploads/payments/...`, so it is only ever served to this owner or an admin.
 */
function ReceiptViewer({ payment, onClose }) {
  const [failed, setFailed] = useState(false);

  return (
    <Modal
      open
      onClose={onClose}
      title="Payment receipt"
      description={`${payment.hostel?.name || 'Listing'} · ${formatPKR(payment.amount)} · ${
        payment.method
      }`}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {failed ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-sunken px-4 py-14 text-center">
          <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Receipt image unavailable</p>
          <p className="max-w-xs text-xs text-muted-foreground text-pretty">
            The file is missing from storage. If an admin needs it, upload the receipt again from
            the listing’s payment page.
          </p>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/owner/payments/${payment._id}/screenshot`}
          alt={`Receipt for ${formatPKR(payment.amount)} paid by ${payment.method}`}
          onError={() => setFailed(true)}
          className="mx-auto max-h-[60vh] w-auto rounded-xl border border-border object-contain"
        />
      )}
    </Modal>
  );
}

export default function PaymentsHistory({ payments, totals }) {
  const [viewing, setViewing] = useState(null);

  if (!payments.length) {
    return (
      <EmptyState
        icon={Receipt}
        title="No payments yet"
        description="When you submit a listing you transfer the fee and upload the receipt here. Every submission stays on this page with its outcome."
        action={
          <Button href="/owner/listings" variant="secondary">
            Go to my listings
          </Button>
        }
      />
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <caption className="sr-only">Your listing-fee payments and their outcomes</caption>
            <thead className="bg-surface-sunken">
              <tr className="text-left">
                <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Submitted</th>
                <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Listing</th>
                <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Method</th>
                <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Reference</th>
                <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Receipt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((payment) => (
                <tr key={payment._id} className="align-top transition-colors duration-200 hover:bg-muted/50">
                  <td className="tabular px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(payment.createdAt)}
                  </td>
                  <td className="max-w-[220px] px-4 py-3">
                    {payment.hostel ? (
                      <Link
                        href={`/owner/listings/${payment.hostelId}/edit`}
                        className="block truncate font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {payment.hostel.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Listing removed</span>
                    )}
                    {payment.status === 'rejected' && payment.reviewNote && (
                      <span className="mt-1 block text-xs text-danger text-pretty">
                        Admin note: {payment.reviewNote}
                      </span>
                    )}
                    {payment.status === 'approved' && payment.reviewedAt && (
                      <span className="tabular mt-1 block text-xs text-muted-foreground">
                        Approved {formatDate(payment.reviewedAt)}
                      </span>
                    )}
                  </td>
                  <td className="tabular px-4 py-3 text-right font-semibold whitespace-nowrap text-foreground">
                    {formatPKR(payment.amount)}
                    {payment.planMonths > 1 && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {payment.planMonths} months
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {payment.method}
                  </td>
                  <td className="tabular max-w-[160px] truncate px-4 py-3 text-muted-foreground">
                    {payment.transactionRef || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={payment.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(payment)}>
                        View
                      </Button>
                      {payment.status === 'rejected' && payment.hostel && (
                        <Button
                          size="sm"
                          variant="secondary"
                          href={`/owner/listings/${payment.hostelId}/payment`}
                        >
                          <Upload className="size-4" aria-hidden="true" />
                          Re-upload
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {totals.rejected > 0 && (
        <Alert tone="warning" title="Some payments were rejected" className="mt-4">
          Open the listing’s payment page and upload a clearer receipt, or one that matches the
          amount and reference on the transfer.
        </Alert>
      )}

      <p className={cn('mt-4 text-xs text-muted-foreground')}>
        Receipts are private — only you and Hostello admins can open them.
      </p>

      {viewing && <ReceiptViewer payment={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

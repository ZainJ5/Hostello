import { Clock, CircleCheck, Receipt, Wallet } from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import { formatPKR, serialize } from '@/lib/utils';
import PageHeader from '@/components/owner/PageHeader';
import PaymentsHistory from '@/components/owner/PaymentsHistory';
import { getOwnerContext, getOwnerPayments } from '../../_lib/owner-data';

export const metadata = { title: 'Payments' };

export default async function OwnerPaymentsPage({ searchParams }) {
  const sp = await searchParams;
  const { ownerId } = await getOwnerContext(sp?.ownerId);
  const data = serialize(await getOwnerPayments(ownerId));

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every listing fee you have submitted, and what an admin decided."
      />

      {data.payments.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total approved"
            value={formatPKR(data.totals.paid)}
            icon={Wallet}
            hint="across all your listings"
          />
          <StatCard
            label="Submissions"
            value={data.totals.count}
            icon={Receipt}
            hint="receipts uploaded"
          />
          <StatCard
            label="Awaiting review"
            value={data.totals.pending}
            icon={Clock}
            hint={data.totals.pending ? 'usually cleared within a day' : 'nothing pending'}
          />
          <StatCard
            label="Rejected"
            value={data.totals.rejected}
            icon={CircleCheck}
            hint={data.totals.rejected ? 'needs a new receipt' : 'none rejected'}
          />
        </div>
      )}

      <PaymentsHistory payments={data.payments} totals={data.totals} />
    </>
  );
}

import AuditLog from '@/models/AuditLog';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import PageHeader from '@/components/admin/PageHeader';
import AuditTable from '@/components/admin/audit/AuditTable';
import { serialize } from '@/lib/utils';

export const metadata = { title: 'Audit log' };

const PER_PAGE = 25;

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function AdminAuditPage({ searchParams }) {
  await requireAdminPage();
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);

  const query = {};
  if (sp.action) query.action = sp.action;
  if (sp.target) query.targetType = sp.target;
  if (sp.q) {
    const rx = new RegExp(escapeRegex(String(sp.q).trim()), 'i');
    query.$or = [{ actorEmail: rx }, { targetId: rx }, { action: rx }];
  }

  const [total, rows, actions, targetTypes] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .lean(),
    AuditLog.distinct('action'),
    AuditLog.distinct('targetType'),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Insight"
        title="Audit log"
        description="An append-only record of every privileged action taken in this console. Expand a row for the full before-and-after context."
      />

      <AuditTable
        rows={serialize(rows)}
        total={total}
        page={Math.min(page, pages)}
        pages={pages}
        perPage={PER_PAGE}
        actions={actions.filter(Boolean).sort()}
        targetTypes={targetTypes.filter(Boolean).sort()}
      />
    </div>
  );
}

import AuditLog from '@/models/AuditLog';
import { clientIp } from '@/lib/api';

export { actionLabel, ACTION_LABELS } from '@/components/admin/labels';

/**
 * Appends one row to the privileged-action trail. Never throws into the
 * caller: an audit write failing must not roll back the action the admin
 * already performed — it is logged and swallowed.
 */
export async function writeAudit(req, session, entry) {
  try {
    await AuditLog.create({
      actorId: session?.userId || null,
      actorEmail: session?.email || '',
      action: entry.action,
      targetType: entry.targetType || '',
      targetId: entry.targetId ? String(entry.targetId) : '',
      meta: entry.meta || {},
      ip: req ? clientIp(req) : '',
    });
  } catch (err) {
    console.error('[audit] failed to record', entry.action, err);
  }
}

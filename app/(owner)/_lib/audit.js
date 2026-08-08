import AuditLog from '@/models/AuditLog';
import { clientIp } from '@/lib/api';

/**
 * Records an owner action on the shared audit trail the admin panel reads.
 *
 * Deliberately best-effort: a logging failure must never roll back a payment
 * submission or a booking response the owner has already been told succeeded.
 */
export async function auditOwner(req, session, action, { targetType, targetId, meta } = {}) {
  try {
    await AuditLog.create({
      actorId: session.userId,
      actorEmail: session.email || '',
      action,
      targetType: targetType || '',
      targetId: targetId ? String(targetId) : '',
      meta: meta || {},
      ip: req ? clientIp(req) : '',
    });
  } catch (err) {
    console.error('[owner audit]', action, err?.message);
  }
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import Modal, { ConfirmDialog } from '@/components/admin/Modal';
import { useToast } from '@/components/admin/ToastProvider';
import { apiSend } from '@/components/admin/client';
import { ROLE_OPTIONS } from '@/components/admin/labels';

export default function UserActions({ user }) {
  const router = useRouter();
  const toast = useToast();

  const [roleOpen, setRoleOpen] = useState(false);
  const [nextRole, setNextRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function toggleStatus() {
    const status = user.status === 'active' ? 'suspended' : 'active';
    setStatusBusy(true);
    const res = await apiSend(`/api/admin/users/${user._id}`, { method: 'PATCH', body: { status } });
    setStatusBusy(false);
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not update', description: res.error });
    toast({
      title: status === 'suspended' ? 'Account suspended' : 'Account reactivated',
      description: user.email,
    });
    router.refresh();
  }

  async function saveRole() {
    setSaving(true);
    const res = await apiSend(`/api/admin/users/${user._id}`, {
      method: 'PATCH',
      body: { role: nextRole },
    });
    setSaving(false);
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not change role', description: res.error });
    setRoleOpen(false);
    toast({ title: 'Role updated', description: `${user.email} is now ${nextRole}` });
    router.refresh();
  }

  async function confirmDelete() {
    const res = await apiSend(`/api/admin/users/${user._id}`, { method: 'DELETE' });
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not delete', description: res.error });
    toast({ tone: 'info', title: 'Account deleted', description: user.email });
    router.push('/admin/users');
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setRoleOpen(true)}>
          <UserCog className="size-4" aria-hidden="true" />
          Change role
        </Button>
        <Button variant="secondary" size="sm" onClick={toggleStatus} loading={statusBusy}>
          {user.status === 'active' ? (
            <>
              <Ban className="size-4" aria-hidden="true" />
              Suspend
            </>
          ) : (
            <>
              <ShieldCheck className="size-4" aria-hidden="true" />
              Reactivate
            </>
          )}
        </Button>
        <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </Button>
      </div>

      <Modal
        open={roleOpen}
        onClose={() => setRoleOpen(false)}
        title="Change role"
        description={user.email}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRoleOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveRole} loading={saving}>
              Save role
            </Button>
          </>
        }
      >
        <Select
          data-autofocus
          label="Role"
          value={nextRole}
          onChange={(e) => setNextRole(e.target.value)}
          hint="Owners can list hostels; admins can do everything in this console."
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete this account?"
        description="Their reviews and bookings are deleted; listings they own are kept but suspended."
        confirmLabel="Delete account"
        confirmPhrase={user.email}
      >
        <p className="text-sm text-muted-foreground text-pretty">
          Suspending blocks access and is reversible. Deleting is not.
        </p>
      </ConfirmDialog>
    </>
  );
}

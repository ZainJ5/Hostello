'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ban, Eye, ShieldCheck, Trash2, UserCog, Users as UsersIcon } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { Avatar, EmptyState } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Field';
import {
  FilterBar,
  FilterSelect,
  Pagination,
  PendingOverlay,
  ResetFilters,
  SearchBox,
  useAdminQuery,
} from '@/components/admin/Filters';
import {
  Stacked,
  Table,
  TableWrap,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/admin/Table';
import ActionMenu from '@/components/admin/ActionMenu';
import Modal, { ConfirmDialog } from '@/components/admin/Modal';
import { useToast } from '@/components/admin/ToastProvider';
import { apiSend } from '@/components/admin/client';
import { ROLE_OPTIONS } from '@/components/admin/labels';
import { timeAgo } from '@/lib/utils';

const ROLE_TONE = { admin: 'brand', owner: 'accent', student: 'neutral' };

export default function UsersTable({ rows, total, page, pages, perPage, stats }) {
  const router = useRouter();
  const toast = useToast();
  const { get, set, toggleSort, reset, pending } = useAdminQuery();

  const [roleTarget, setRoleTarget] = useState(null);
  const [nextRole, setNextRole] = useState('student');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const sort = get('sort', 'createdAt');
  const dir = get('dir', 'desc');
  const filtersActive = ['q', 'role', 'status'].some((k) => get(k));

  async function setStatus(row, status) {
    const res = await apiSend(`/api/admin/users/${row._id}`, { method: 'PATCH', body: { status } });
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not update', description: res.error });
    toast({
      title: status === 'suspended' ? 'Account suspended' : 'Account reactivated',
      description: row.email,
    });
    router.refresh();
  }

  async function saveRole() {
    if (!roleTarget) return;
    setSaving(true);
    const res = await apiSend(`/api/admin/users/${roleTarget._id}`, {
      method: 'PATCH',
      body: { role: nextRole },
    });
    setSaving(false);
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not change role', description: res.error });
    setRoleTarget(null);
    toast({ title: 'Role updated', description: `${roleTarget.email} is now ${nextRole}` });
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await apiSend(`/api/admin/users/${deleteTarget._id}`, { method: 'DELETE' });
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not delete', description: res.error });
    setDeleteTarget(null);
    toast({
      tone: 'info',
      title: 'Account deleted',
      description: 'Their reviews and bookings were removed; any listings they owned were suspended.',
    });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: '', label: 'All accounts', value: stats.total },
          { key: 'student', label: 'Students', value: stats.student || 0 },
          { key: 'owner', label: 'Owners', value: stats.owner || 0 },
          { key: 'admin', label: 'Admins', value: stats.admin || 0 },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            aria-pressed={get('role') === s.key}
            onClick={() => set({ role: get('role') === s.key ? '' : s.key })}
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-card)] border px-4 py-3 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              get('role') === s.key && s.key
                ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/50'
                : 'border-border bg-surface hover:bg-muted/60'
            }`}
          >
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <span className="tabular text-sm font-semibold text-foreground">
              {(s.value || 0).toLocaleString('en-PK')}
            </span>
          </button>
        ))}
      </div>

      <FilterBar>
        <SearchBox
          value={get('q')}
          onSearch={(v) => set({ q: v })}
          placeholder="Name, email or phone…"
        />
        <FilterSelect
          label="Role"
          value={get('role')}
          onChange={(v) => set({ role: v })}
          options={ROLE_OPTIONS}
          allLabel="Any role"
        />
        <FilterSelect
          label="Status"
          value={get('status')}
          onChange={(v) => set({ status: v })}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
          ]}
          allLabel="Any status"
        />
        <ResetFilters onReset={reset} active={filtersActive} />
      </FilterBar>

      <PendingOverlay pending={pending}>
        {rows.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={filtersActive ? 'No accounts match those filters' : 'No accounts yet'}
            description={
              filtersActive
                ? 'Reset the filters to see every account.'
                : 'Students, owners and admins appear here as they sign up.'
            }
            action={
              filtersActive ? (
                <Button variant="secondary" size="sm" onClick={reset}>
                  Reset filters
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <TableWrap>
              <Table minWidth="min-w-[62rem]">
                <THead>
                  <tr>
                    <Th sortKey="name" activeSort={sort} dir={dir} onSort={toggleSort}>
                      Account
                    </Th>
                    <Th sortKey="role" activeSort={sort} dir={dir} onSort={toggleSort}>
                      Role
                    </Th>
                    <Th sortKey="status" activeSort={sort} dir={dir} onSort={toggleSort}>
                      Status
                    </Th>
                    <Th>City / university</Th>
                    <Th align="right">Listings</Th>
                    <Th align="right">Bookings</Th>
                    <Th align="right">Reviews</Th>
                    <Th sortKey="lastLoginAt" activeSort={sort} dir={dir} onSort={toggleSort} align="right">
                      Last seen
                    </Th>
                    <Th sortKey="createdAt" activeSort={sort} dir={dir} onSort={toggleSort} align="right">
                      Joined
                    </Th>
                    <Th width="4rem" align="right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((row) => (
                    <Tr key={row._id}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.name} src={row.avatar} size="sm" />
                          <Link href={`/admin/users/${row._id}`} className="min-w-0">
                            <Stacked primary={row.name} secondary={row.email} />
                          </Link>
                          {!row.emailVerified && (
                            <Badge tone="warning" size="sm">
                              Unverified
                            </Badge>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <Badge tone={ROLE_TONE[row.role] || 'neutral'} size="sm">
                          {row.role}
                        </Badge>
                      </Td>
                      <Td>
                        <StatusBadge status={row.status} size="sm" />
                      </Td>
                      <Td className="text-sm text-muted-foreground">
                        {[row.city, row.university].filter(Boolean).join(' · ') || 'Not set'}
                      </Td>
                      <Td align="right" className="tabular">
                        {row.listings || 0}
                      </Td>
                      <Td align="right" className="tabular">
                        {row.bookings || 0}
                      </Td>
                      <Td align="right" className="tabular">
                        {row.reviews || 0}
                      </Td>
                      <Td align="right" className="whitespace-nowrap text-xs text-muted-foreground">
                        {row.lastLoginAt ? timeAgo(row.lastLoginAt) : 'Never'}
                      </Td>
                      <Td align="right" className="whitespace-nowrap text-xs text-muted-foreground">
                        {timeAgo(row.createdAt)}
                      </Td>
                      <Td align="right">
                        <ActionMenu
                          label={`Actions for ${row.name}`}
                          items={[
                            { label: 'Open profile', href: `/admin/users/${row._id}`, icon: Eye },
                            {
                              label: 'Change role…',
                              icon: UserCog,
                              onSelect: () => {
                                setRoleTarget(row);
                                setNextRole(row.role);
                              },
                            },
                            { separator: true },
                            row.status === 'active'
                              ? {
                                  label: 'Suspend account',
                                  icon: Ban,
                                  onSelect: () => setStatus(row, 'suspended'),
                                }
                              : {
                                  label: 'Reactivate account',
                                  icon: ShieldCheck,
                                  onSelect: () => setStatus(row, 'active'),
                                },
                            {
                              label: 'Delete account',
                              icon: Trash2,
                              tone: 'danger',
                              onSelect: () => setDeleteTarget(row),
                            },
                          ]}
                        />
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableWrap>

            <Pagination
              page={page}
              pages={pages}
              total={total}
              perPage={perPage}
              onPage={(n) => set({ page: n }, { keepPage: true })}
              label="accounts"
            />
          </>
        )}
      </PendingOverlay>

      <Modal
        open={Boolean(roleTarget)}
        onClose={() => setRoleTarget(null)}
        title="Change role"
        description={roleTarget?.email}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRoleTarget(null)} disabled={saving}>
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
          hint="Admins can see and change everything in this console."
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete this account?"
        description="Their reviews and bookings are deleted. Listings they own are kept but suspended."
        confirmLabel="Delete account"
        confirmPhrase={deleteTarget?.email}
      >
        <p className="text-sm text-muted-foreground text-pretty">
          <span className="font-medium text-foreground">{deleteTarget?.name}</span> ·{' '}
          {deleteTarget?.email}. Suspending is reversible; this is not.
        </p>
      </ConfirmDialog>
    </div>
  );
}

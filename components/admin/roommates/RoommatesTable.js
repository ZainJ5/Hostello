'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, UserRoundSearch } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Avatar, EmptyState } from '@/components/ui/Feedback';
import {
  FilterBar,
  FilterSelect,
  Pagination,
  PendingOverlay,
  ResetFilters,
  SearchBox,
  useAdminQuery,
} from '@/components/admin/Filters';
import { Table, TableWrap, TBody, Td, Th, THead, Tr } from '@/components/admin/Table';
import { useToast } from '@/components/admin/ToastProvider';
import { apiSend } from '@/components/admin/client';
import { timeAgo } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'complete', label: 'Answered all six' },
  { value: 'started', label: 'Started only' },
  { value: 'hidden', label: 'Hidden from matching' },
];

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

export default function RoommatesTable({ rows, total, page, pages, perPage, campuses, totals }) {
  const router = useRouter();
  const toast = useToast();
  const { get, set, reset, pending } = useAdminQuery();
  const [busy, setBusy] = useState(null);

  const filtersActive = ['q', 'campus', 'gender', 'status'].some((k) => get(k));

  async function toggleVisible(row) {
    const next = !row.visible;
    setBusy(row._id);
    const res = await apiSend(`/api/admin/roommates/${row._id}`, {
      method: 'PATCH',
      body: { action: next ? 'show' : 'hide' },
    });
    setBusy(null);
    if (!res.ok) {
      return toast({ tone: 'danger', title: 'Could not update', description: res.error });
    }
    toast({
      title: next ? 'Back in matching' : 'Hidden from matching',
      description: next
        ? `${row.displayName || 'This student'} can be suggested again.`
        : `${row.displayName || 'This student'} will not be suggested to anyone. Their answers are untouched.`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <FilterBar>
        <SearchBox
          value={get('q')}
          onSearch={(v) => set({ q: v })}
          placeholder="Name, campus or programme…"
        />
        <FilterSelect
          label="Campus"
          value={get('campus')}
          onChange={(v) => set({ campus: v })}
          options={campuses}
          allLabel="All campuses"
        />
        <FilterSelect
          label="Gender"
          value={get('gender')}
          onChange={(v) => set({ gender: v })}
          options={GENDER_OPTIONS}
          allLabel="Any"
        />
        <FilterSelect
          label="Status"
          value={get('status')}
          onChange={(v) => set({ status: v })}
          options={STATUS_OPTIONS}
          allLabel="All profiles"
        />
        <ResetFilters onReset={reset} active={filtersActive} />
      </FilterBar>

      <p className="text-xs text-muted-foreground">
        {totals.all} {totals.all === 1 ? 'profile' : 'profiles'} · {totals.complete} answered all
        six · {totals.hidden} hidden
        {filtersActive ? ` · ${total} match these filters` : ''}
      </p>

      <PendingOverlay pending={pending}>
      {rows.length === 0 ? (
        <EmptyState
          icon={UserRoundSearch}
          title="No roommate profiles here"
          description={
            filtersActive
              ? 'Clear the filters to see every profile.'
              : 'A profile appears the first time a signed in student opens the six questions.'
          }
        />
      ) : (
        <div>
          <TableWrap>
            <Table minWidth="min-w-[64rem]">
              <THead>
                <tr>
                  <Th>Student</Th>
                  <Th>Campus</Th>
                  <Th>Year and programme</Th>
                  <Th align="right">Answers</Th>
                  <Th align="right">Intros</Th>
                  <Th>State</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <Tr key={r._id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Avatar name={r.displayName || r.initials || '?'} size="sm" />
                        <div className="min-w-px">
                          <p className="font-semibold text-foreground">
                            {r.displayName || 'No name yet'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Joined {timeAgo(r.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p>{r.campus || 'Not set'}</p>
                      <p className="text-xs text-muted-foreground">{r.gender || 'Not set'}</p>
                    </Td>
                    <Td>
                      <p>{r.year || 'Not set'}</p>
                      <p className="text-xs text-muted-foreground">{r.programme || ''}</p>
                    </Td>
                    <Td align="right">
                      <span className="tabular">{r.answeredCount} of 6</span>
                    </Td>
                    <Td align="right">
                      <span className="tabular">
                        {r.received} in · {r.sent} out
                      </span>
                      <p className="text-xs text-muted-foreground">{r.accepted} accepted</p>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {r.complete ? (
                          <Badge size="sm" tone="success">
                            Can be matched
                          </Badge>
                        ) : (
                          <Badge size="sm" tone="warning">
                            Unfinished
                          </Badge>
                        )}
                        {!r.visible && (
                          <Badge size="sm" tone="info">
                            Hidden
                          </Badge>
                        )}
                        {r.blockedCount > 0 && (
                          <Badge size="sm">{r.blockedCount} blocked</Badge>
                        )}
                      </div>
                    </Td>
                    <Td align="right">
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busy === r._id}
                        onClick={() => toggleVisible(r)}
                      >
                        {r.visible ? (
                          <>
                            <EyeOff className="size-3.5" aria-hidden="true" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="size-3.5" aria-hidden="true" />
                            Show
                          </>
                        )}
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </div>
      )}

      <Pagination
        page={page}
        pages={pages}
        total={total}
        perPage={perPage}
        onPage={(n) => set({ page: n }, { keepPage: true })}
        label="profiles"
      />
      </PendingOverlay>
    </div>
  );
}

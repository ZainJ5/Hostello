'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, ScrollText } from 'lucide-react';
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
import {
  Table,
  TableWrap,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/admin/Table';
import { formatDateTime } from '@/components/admin/client';
import { actionLabel, actionTone } from '@/components/admin/labels';
import { cn, timeAgo } from '@/lib/utils';

const TONE = { success: 'success', danger: 'danger', warning: 'warning', info: 'info', neutral: 'neutral' };

export default function AuditTable({ rows, total, page, pages, perPage, actions, targetTypes }) {
  const { get, set, reset, pending } = useAdminQuery();
  const [expanded, setExpanded] = useState(() => new Set());

  const filtersActive = ['q', 'action', 'target'].some((k) => get(k));

  function toggle(id) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  return (
    <div className="space-y-3">
      <FilterBar>
        <SearchBox
          value={get('q')}
          onSearch={(v) => set({ q: v })}
          placeholder="Actor email or target…"
        />
        <FilterSelect
          label="Action"
          value={get('action')}
          onChange={(v) => set({ action: v })}
          options={actions.map((a) => ({ value: a, label: actionLabel(a) }))}
          allLabel="Any action"
          className="max-w-56"
        />
        <FilterSelect
          label="Target"
          value={get('target')}
          onChange={(v) => set({ target: v })}
          options={targetTypes}
          allLabel="Any target"
        />
        <ResetFilters onReset={reset} active={filtersActive} />
      </FilterBar>

      <PendingOverlay pending={pending}>
        {rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={filtersActive ? 'No entries match those filters' : 'The audit trail is empty'}
            description={
              filtersActive
                ? 'Reset the filters to see the full trail.'
                : 'Every privileged action (approvals, status changes, deletions and settings edits) is appended here as it happens.'
            }
            action={
              filtersActive ? (
                <Button variant="secondary" size="sm" onClick={reset}>
                  Reset filters
                </Button>
              ) : (
                <Button href="/admin/payments" variant="secondary" size="sm">
                  Go to the payment queue
                </Button>
              )
            }
          />
        ) : (
          <>
            <TableWrap>
              <Table minWidth="min-w-[58rem]">
                <THead>
                  <tr>
                    <Th width="3rem">
                      <span className="sr-only">Expand</span>
                    </Th>
                    <Th>Action</Th>
                    <Th>Actor</Th>
                    <Th>Target</Th>
                    <Th>IP</Th>
                    <Th align="right">When</Th>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((row) => {
                    const open = expanded.has(row._id);
                    const hasMeta = row.meta && Object.keys(row.meta).length > 0;
                    return (
                      <Fragment key={row._id}>
                        <Tr onClick={hasMeta ? () => toggle(row._id) : undefined}>
                          <Td>
                            {hasMeta ? (
                              <button
                                type="button"
                                aria-expanded={open}
                                aria-label={open ? 'Hide details' : 'Show details'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggle(row._id);
                                }}
                                className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                              >
                                {open ? (
                                  <ChevronDown className="size-4" aria-hidden="true" />
                                ) : (
                                  <ChevronRight className="size-4" aria-hidden="true" />
                                )}
                              </button>
                            ) : null}
                          </Td>
                          <Td>
                            <Badge tone={TONE[actionTone(row.action)]} size="sm">
                              {actionLabel(row.action)}
                            </Badge>
                            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                              {row.action}
                            </p>
                          </Td>
                          <Td>
                            <div className="flex items-center gap-2">
                              <Avatar name={row.actorEmail || 'system'} size="sm" />
                              <span className="max-w-52 truncate text-sm text-foreground">
                                {row.actorEmail || 'system'}
                              </span>
                            </div>
                          </Td>
                          <Td>
                            <span className="text-sm text-foreground">{row.targetType || 'None'}</span>
                            {row.targetId && (
                              <p className="max-w-56 truncate font-mono text-[11px] text-muted-foreground">
                                {row.targetId}
                              </p>
                            )}
                          </Td>
                          <Td className="font-mono text-xs text-muted-foreground">
                            {row.ip || 'Unknown'}
                          </Td>
                          <Td align="right" className="whitespace-nowrap">
                            <span className="block text-sm text-foreground">
                              {timeAgo(row.createdAt)}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {formatDateTime(row.createdAt)}
                            </span>
                          </Td>
                        </Tr>
                        {open && hasMeta && (
                          <tr className="bg-surface-sunken">
                            <td colSpan={6} className="border-b border-border px-4 py-3">
                              <pre
                                className={cn(
                                  'max-h-72 overflow-auto rounded-xl border border-border bg-surface p-3',
                                  'font-mono text-xs leading-relaxed text-muted-foreground'
                                )}
                              >
                                {JSON.stringify(row.meta, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </TBody>
              </Table>
            </TableWrap>

            <Pagination
              page={page}
              pages={pages}
              total={total}
              perPage={perPage}
              onPage={(n) => set({ page: n }, { keepPage: true })}
              label="entries"
            />
          </>
        )}
      </PendingOverlay>
    </div>
  );
}

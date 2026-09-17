'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, MapPin, Pencil, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';
import { Checkbox, Input } from '@/components/ui/Field';
import { FilterBar, FilterSelect } from '@/components/admin/Filters';
import { Table, TableWrap, TBody, Td, Th, THead, Tr } from '@/components/admin/Table';
import Modal, { ConfirmDialog } from '@/components/admin/Modal';
import { useToast } from '@/components/admin/ToastProvider';
import { apiSend } from '@/components/admin/client';

const EMPTY = { key: '', full: '', city: '', sector: '', lat: '', lng: '', active: true };

function mapsLink(lat, lng) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
}

/** Accepts "31.47, 74.41" pasted from Google Maps into either field. */
function splitPair(value) {
  const m = String(value).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  return m ? { lat: m[1], lng: m[2] } : null;
}

export default function UniversitiesManager({ rows, cities }) {
  const router = useRouter();
  const toast = useToast();

  const [city, setCity] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | row
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [recomputing, setRecomputing] = useState(false);

  async function recompute() {
    setRecomputing(true);
    const res = await apiSend('/api/admin/universities/recompute', { method: 'POST' });
    setRecomputing(false);
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not recalculate', description: res.error });
    toast({
      title: 'Distances recalculated',
      description: `Checked ${res.data.checked} listings, ${res.data.updated} had a new figure.`,
    });
    router.refresh();
  }

  const cityOptions = useMemo(
    () => [...new Set([...cities, ...rows.map((r) => r.city)])].filter(Boolean),
    [cities, rows]
  );

  const visible = rows.filter((r) => {
    if (city && r.city !== city) return false;
    if (!q) return true;
    const hay = `${r.key} ${r.full} ${r.sector}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  function openNew() {
    setForm({ ...EMPTY, city: city || '' });
    setErrors({});
    setEditing('new');
  }

  function openEdit(row) {
    setForm({
      key: row.key,
      full: row.full,
      city: row.city,
      sector: row.sector || '',
      lat: String(row.lat),
      lng: String(row.lng),
      active: row.active,
    });
    setErrors({});
    setEditing(row);
  }

  function update(field, value) {
    if ((field === 'lat' || field === 'lng') && splitPair(value)) {
      setForm((f) => ({ ...f, ...splitPair(value) }));
      return;
    }
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save() {
    setSaving(true);
    const isNew = editing === 'new';
    const res = await apiSend(
      isNew ? '/api/admin/universities' : `/api/admin/universities/${encodeURIComponent(editing.key)}`,
      {
        method: isNew ? 'POST' : 'PATCH',
        body: { ...form, lat: Number(form.lat), lng: Number(form.lng) },
      }
    );
    setSaving(false);
    if (!res.ok) {
      setErrors(
        Object.fromEntries(Object.entries(res.fieldErrors || {}).map(([k, v]) => [k, v?.[0]]))
      );
      return toast({ tone: 'danger', title: 'Could not save', description: res.error });
    }
    toast({
      title: isNew ? 'University added' : 'University updated',
      description: `${form.key} is saved. ${res.data?.distances?.updated ?? 0} listing distances changed.`,
    });
    setEditing(null);
    router.refresh();
  }

  async function confirmRemove() {
    const row = removeTarget;
    const res = await apiSend(`/api/admin/universities/${encodeURIComponent(row.key)}`, {
      method: 'DELETE',
    });
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not remove', description: res.error });
    setRemoveTarget(null);
    toast({
      tone: 'info',
      title: row.builtin ? 'Reset to original' : 'University deleted',
      description: row.builtin
        ? `${row.key} uses its original name and pin again.`
        : `${row.key} was removed from the list.`,
    });
    router.refresh();
  }

  const isNew = editing === 'new';
  const lockedKey = !isNew;

  return (
    <div className="space-y-3">
      <FilterBar>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Search
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or area"
            className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-brand-600 focus:outline-none"
          />
        </label>
        <FilterSelect
          label="City"
          value={city}
          onChange={setCity}
          options={cityOptions}
          allLabel="All cities"
        />
        <div className="flex items-end gap-2">
          <Button size="sm" variant="secondary" onClick={recompute} loading={recomputing}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Recalculate distances
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="size-4" aria-hidden="true" />
            Add university
          </Button>
        </div>
      </FilterBar>

      <p className="text-xs text-muted-foreground">
        {visible.length} of {rows.length} universities
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No universities match"
          description="Clear the search or add the campus you are looking for."
          action={
            <Button size="sm" variant="secondary" onClick={openNew}>
              Add university
            </Button>
          }
        />
      ) : (
        <TableWrap>
          <Table minWidth="min-w-[56rem]">
            <THead>
              <tr>
                <Th>University</Th>
                <Th>City</Th>
                <Th>Map pin</Th>
                <Th align="right">Listings</Th>
                <Th>Type</Th>
                <Th align="right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {visible.map((r) => (
                <Tr key={r.key}>
                  <Td>
                    <p className="font-semibold text-foreground">{r.key}</p>
                    <p className="text-xs text-muted-foreground">{r.full}</p>
                  </Td>
                  <Td>
                    <p>{r.city}</p>
                    {r.sector && <p className="text-xs text-muted-foreground">{r.sector}</p>}
                  </Td>
                  <Td>
                    <a
                      href={mapsLink(r.lat, r.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline dark:text-brand-300"
                    >
                      <MapPin className="size-3.5" aria-hidden="true" />
                      <span className="tabular">
                        {Number(r.lat).toFixed(4)}, {Number(r.lng).toFixed(4)}
                      </span>
                    </a>
                  </Td>
                  <Td align="right">
                    <span className="tabular">{r.listings}</span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {r.builtin ? (
                        <Badge size="sm">Built-in</Badge>
                      ) : (
                        <Badge size="sm" tone="brand">
                          Added
                        </Badge>
                      )}
                      {r.edited && (
                        <Badge size="sm" tone="info">
                          Edited
                        </Badge>
                      )}
                      {!r.active && (
                        <Badge size="sm" tone="warning">
                          Hidden
                        </Badge>
                      )}
                    </div>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Edit
                      </Button>
                      {r.builtin && r.edited && (
                        <Button size="sm" variant="ghost" onClick={() => setRemoveTarget(r)}>
                          <RotateCcw className="size-3.5" aria-hidden="true" />
                          Reset
                        </Button>
                      )}
                      {!r.builtin && (
                        <Button size="sm" variant="ghost" onClick={() => setRemoveTarget(r)}>
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => (saving ? null : setEditing(null))}
        title={isNew ? 'Add a university' : `Edit ${editing?.key || ''}`}
        description="Drop a pin on the main gate in Google Maps, copy the coordinates and paste them into Latitude. Both boxes fill in."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} loading={saving}>
              {isNew ? 'Add university' : 'Save changes'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Short name"
            hint={lockedKey ? 'Listings are tagged with this, so it cannot change' : 'Shown on cards and filters, for example "UMT"'}
            value={form.key}
            onChange={(e) => update('key', e.target.value)}
            disabled={lockedKey}
            error={errors.key}
            required
          />
          <Input
            label="Full name"
            value={form.full}
            onChange={(e) => update('full', e.target.value)}
            error={errors.full}
            required
          />
          <Input
            label="City"
            hint="Pick one or type a new city. A new city opens across the site with its first university."
            list="university-city-options"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            error={errors.city}
            required
          />
          <datalist id="university-city-options">
            {cityOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Input
            label="Area"
            hint="Optional, for example Johar Town"
            value={form.sector}
            onChange={(e) => update('sector', e.target.value)}
            error={errors.sector}
          />
          <Input
            label="Latitude"
            inputMode="decimal"
            placeholder="31.4514"
            value={form.lat}
            onChange={(e) => update('lat', e.target.value)}
            error={errors.lat}
            required
          />
          <Input
            label="Longitude"
            inputMode="decimal"
            placeholder="74.2941"
            value={form.lng}
            onChange={(e) => update('lng', e.target.value)}
            error={errors.lng}
            required
          />
        </div>
        {form.lat && form.lng && (
          <a
            href={mapsLink(form.lat, form.lng)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline dark:text-brand-300"
          >
            <MapPin className="size-4" aria-hidden="true" />
            Check this pin on the map
          </a>
        )}
        {!(editing && editing !== 'new' && editing.builtin) && (
          <Checkbox
            className="mt-3"
            label="Show on the site"
            description="Hidden universities drop out of pickers, filters and the map."
            checked={form.active}
            onChange={(e) => update('active', e.target.checked)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
        title={removeTarget?.builtin ? `Reset ${removeTarget?.key}?` : `Delete ${removeTarget?.key}?`}
        description={
          removeTarget?.builtin
            ? 'The name and map pin go back to the original values.'
            : 'This only works when no listing is tagged with it.'
        }
        confirmLabel={removeTarget?.builtin ? 'Reset' : 'Delete'}
      />
    </div>
  );
}

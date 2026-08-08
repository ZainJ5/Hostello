'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, Plus, Save, Sparkles, Trash2, Wallet } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Feedback';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/admin/ToastProvider';
import { apiSend } from '@/components/admin/client';
import { formatPKR } from '@/lib/utils';

function Section({ title, description, icon: Icon, children }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </Card>
  );
}

export default function SettingsForm({ settings, methods, featuredInUse }) {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState({
    listingFee: settings.listingFee ?? 5000,
    listingPeriodMonths: settings.listingPeriodMonths ?? 6,
    paymentInstructions: settings.paymentInstructions ?? '',
    accounts: settings.accounts ?? [],
    featuredSlots: settings.featuredSlots ?? 8,
    supportEmail: settings.supportEmail ?? '',
    supportPhone: settings.supportPhone ?? '',
    autoPublishOnApproval: settings.autoPublishOnApproval !== false,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function setAccount(i, patch) {
    const accounts = [...form.accounts];
    accounts[i] = { ...accounts[i], ...patch };
    set({ accounts });
  }

  async function submit(e) {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    const res = await apiSend('/api/admin/settings', {
      method: 'PUT',
      body: {
        ...form,
        listingFee: Number(form.listingFee) || 0,
        listingPeriodMonths: Number(form.listingPeriodMonths) || 1,
        featuredSlots: Number(form.featuredSlots) || 0,
      },
    });
    setSaving(false);

    if (!res.ok) {
      if (res.fieldErrors) {
        setErrors(
          Object.fromEntries(
            Object.entries(res.fieldErrors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          )
        );
      }
      return toast({ tone: 'danger', title: 'Could not save settings', description: res.error });
    }

    toast({
      title: 'Settings saved',
      description: res.data.changed?.length
        ? `Updated ${res.data.changed.join(', ')}.`
        : 'Nothing had changed.',
    });
    router.refresh();
  }

  const overSlots = featuredInUse > Number(form.featuredSlots);

  return (
    <form onSubmit={submit} className="space-y-4">
      <Section
        title="Listing fee"
        description="What an owner pays to have a listing reviewed and published."
        icon={Wallet}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Fee amount (PKR)"
            required
            inputMode="numeric"
            value={form.listingFee}
            error={errors.listingFee}
            onChange={(e) => set({ listingFee: e.target.value })}
            hint={formatPKR(Number(form.listingFee) || 0)}
          />
          <Input
            label="Listing period (months)"
            required
            inputMode="numeric"
            value={form.listingPeriodMonths}
            error={errors.listingPeriodMonths}
            onChange={(e) => set({ listingPeriodMonths: e.target.value })}
            hint="Used to set the payment's expiry date."
          />
          <div className="sm:col-span-1">
            <Checkbox
              label="Publish on approval"
              description="Off means an approved payment leaves the listing in review for a second check."
              checked={form.autoPublishOnApproval}
              onChange={(e) => set({ autoPublishOnApproval: e.target.checked })}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Payment instructions"
        description="Shown verbatim to owners on the payment screen, above the accounts below."
        icon={Banknote}
      >
        <Textarea
          label="Instructions"
          rows={4}
          maxLength={2000}
          value={form.paymentInstructions}
          error={errors.paymentInstructions}
          onChange={(e) => set({ paymentInstructions: e.target.value })}
          hint={`${form.paymentInstructions.length.toLocaleString('en-PK')} / 2,000 characters`}
        />

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-foreground">Receiving accounts</h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                set({
                  accounts: [
                    ...form.accounts,
                    { label: '', method: methods[0], accountName: '', accountNumber: '' },
                  ],
                })
              }
              disabled={form.accounts.length >= 8}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Add account
            </Button>
          </div>

          {form.accounts.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-border-strong bg-surface-sunken px-3 py-4 text-center text-sm text-muted-foreground">
              No accounts configured — owners have nowhere to send the fee.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {form.accounts.map((acc, i) => (
                <li
                  key={i}
                  className="grid gap-2 rounded-xl border border-border bg-surface-sunken p-2.5 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                >
                  <Input
                    label="Label"
                    value={acc.label}
                    onChange={(e) => setAccount(i, { label: e.target.value })}
                    placeholder="Main account"
                  />
                  <Select
                    label="Method"
                    value={acc.method}
                    onChange={(e) => setAccount(i, { method: e.target.value })}
                  >
                    {methods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Account title"
                    value={acc.accountName}
                    onChange={(e) => setAccount(i, { accountName: e.target.value })}
                    placeholder="Hostello (Pvt) Ltd"
                  />
                  <Input
                    label="Number / IBAN"
                    value={acc.accountNumber}
                    onChange={(e) => setAccount(i, { accountNumber: e.target.value })}
                    placeholder="PK00 MEZN 0000 0000 0000 0000"
                  />
                  <div className="flex items-end">
                    <button
                      type="button"
                      aria-label={`Remove account ${i + 1}`}
                      onClick={() => set({ accounts: form.accounts.filter((_, j) => j !== i) })}
                      className="grid size-11 cursor-pointer place-items-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-danger-soft hover:text-danger dark:hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section
        title="Featured listings"
        description="Featured slots are finite inventory — bulk actions refuse to exceed the cap."
        icon={Sparkles}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Featured slots"
            required
            inputMode="numeric"
            value={form.featuredSlots}
            error={errors.featuredSlots}
            onChange={(e) => set({ featuredSlots: e.target.value })}
          />
          <div className="flex items-end pb-1">
            <Badge tone={overSlots ? 'danger' : 'brand'} className="tabular">
              {featuredInUse} of {form.featuredSlots || 0} in use
            </Badge>
          </div>
        </div>

        {overSlots && (
          <Alert tone="warning" title="More listings are featured than you have slots">
            {featuredInUse} listings currently carry the featured flag. Lower the count on the
            listings page, or raise the cap here.
          </Alert>
        )}
      </Section>

      <Section
        title="Support contact"
        description="Where owners and students are told to reach a human."
        icon={Banknote}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Support email"
            type="email"
            value={form.supportEmail}
            error={errors.supportEmail}
            onChange={(e) => set({ supportEmail: e.target.value })}
            placeholder="support@hostello.tech"
          />
          <Input
            label="Support phone"
            type="tel"
            value={form.supportPhone}
            error={errors.supportPhone}
            onChange={(e) => set({ supportPhone: e.target.value })}
            placeholder="+92 300 1234567"
          />
        </div>
      </Section>

      <div className="sticky bottom-0 z-30 -mx-3 border-t border-border bg-surface/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Changes are recorded in the audit log with a before-and-after diff.
          </p>
          <Button type="submit" size="sm" loading={saving}>
            <Save className="size-3.5" aria-hidden="true" />
            Save settings
          </Button>
        </div>
      </div>
    </form>
  );
}

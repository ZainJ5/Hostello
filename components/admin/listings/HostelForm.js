'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Check,
  CircleAlert,
  Eye,
  Images,
  ListFilter,
  MapPin,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Feedback';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field';
import ImageUploader from '@/components/admin/listings/ImageUploader';
import { useToast } from '@/components/admin/ToastProvider';
import { apiGet, apiSend } from '@/components/admin/client';
import { STATUS_OPTIONS } from '@/components/admin/labels';
import { cn, slugify } from '@/lib/utils';

const SECTIONS = [
  { id: 'basics', label: 'Basics', icon: Building2 },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'pricing', label: 'Pricing & rooms', icon: Wallet },
  { id: 'details', label: 'Details', icon: ListFilter },
  { id: 'photos', label: 'Photos', icon: Images },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'visibility', label: 'Visibility', icon: ShieldCheck },
];

const EMPTY = {
  name: '',
  slug: '',
  city: '',
  area: '',
  address: '',
  universities: [],
  gender: 'Male',
  price: '',
  priceMin: '',
  priceMax: '',
  rooms: [],
  securityDeposit: '',
  description: '',
  facilities: [],
  rules: [],
  images: [],
  lat: '',
  lng: '',
  contact: { name: '', phone: '', whatsapp: '', email: '' },
  ownerId: '',
  status: 'draft',
  rejectionReason: '',
  available: true,
  verified: false,
  featured: false,
};

function toForm(hostel) {
  if (!hostel) return EMPTY;
  return {
    ...EMPTY,
    ...hostel,
    price: hostel.price ?? '',
    priceMin: hostel.priceMin ?? '',
    priceMax: hostel.priceMax ?? '',
    securityDeposit: hostel.securityDeposit ?? '',
    lat: hostel.lat ?? '',
    lng: hostel.lng ?? '',
    universities: hostel.universities || [],
    facilities: hostel.facilities || [],
    rules: hostel.rules || [],
    images: hostel.images || [],
    rooms: hostel.rooms || [],
    contact: { ...EMPTY.contact, ...(hostel.contact || {}) },
    ownerId: hostel.ownerId ? String(hostel.ownerId) : '',
  };
}

/** Accepts "33.68, 73.02", a Google Maps @lat,lng URL, or an OSM #map link. */
function parseCoords(text) {
  const s = String(text || '');
  const at = s.match(/@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (at) return { lat: at[1], lng: at[2] };
  const osm = s.match(/#map=\d+\/(-?\d{1,3}(?:\.\d+)?)\/(-?\d{1,3}(?:\.\d+)?)/);
  if (osm) return { lat: osm[1], lng: osm[2] };
  const pair = s.match(/(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/);
  if (pair) return { lat: pair[1], lng: pair[2] };
  return null;
}

function ChipGroup({ legend, hint, options, value, onToggle }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(opt)}
              className={cn(
                'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm transition-colors duration-200',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                on
                  ? 'border-brand-600 bg-brand-50 font-medium text-brand-800 dark:bg-brand-950 dark:text-brand-200'
                  : 'border-border text-muted-foreground hover:border-border-strong hover:bg-muted hover:text-foreground'
              )}
            >
              {on && <Check className="size-3.5" aria-hidden="true" />}
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Section({ id, title, description, icon: Icon, children }) {
  return (
    <Card id={id} className="scroll-mt-20 overflow-hidden">
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

export default function HostelForm({
  mode = 'create',
  hostel = null,
  owners = [],
  cities = [],
  universities = [],
  facilities = [],
  roomTypes = [],
}) {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState(() => toForm(hostel));
  const [slugTouched, setSlugTouched] = useState(Boolean(hostel?.slug));
  const [slugState, setSlugState] = useState({ checking: false, available: true, suggestion: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState('basics');
  const [coordPaste, setCoordPaste] = useState('');
  const firstRender = useRef(true);

  const set = useCallback((patch) => setForm((f) => ({ ...f, ...patch })), []);
  const setContact = useCallback(
    (patch) => setForm((f) => ({ ...f, contact: { ...f.contact, ...patch } })),
    []
  );

  const effectiveSlug = slugTouched ? form.slug : slugify(form.name);

  // ── Live slug uniqueness ──
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      if (!hostel) return undefined;
    }
    const candidate = slugify(effectiveSlug);
    if (!candidate) {
      setSlugState({ checking: false, available: true, suggestion: '' });
      return undefined;
    }
    setSlugState((s) => ({ ...s, checking: true }));
    const t = setTimeout(async () => {
      const qs = new URLSearchParams({ slug: candidate });
      if (hostel?._id) qs.set('excludeId', hostel._id);
      const res = await apiGet(`/api/admin/listings/slug?${qs}`);
      setSlugState({
        checking: false,
        available: res.ok ? res.data.available : true,
        suggestion: res.ok ? res.data.suggestion : '',
      });
    }, 400);
    return () => clearTimeout(t);
  }, [effectiveSlug, hostel]);

  // ── Which section is in view ──
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!els.length) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: '-80px 0px -65% 0px', threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const toggleIn = (key) => (item) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(item) ? f[key].filter((x) => x !== item) : [...f[key], item],
    }));

  const roomTotal = useMemo(
    () => form.rooms.reduce((a, r) => a + (Number(r.available) || 0), 0),
    [form.rooms]
  );

  async function submit(e) {
    e.preventDefault();
    setErrors({});

    const payload = {
      ...form,
      slug: slugify(effectiveSlug),
      price: Number(form.price) || 0,
      priceMin: Number(form.priceMin) || 0,
      priceMax: Number(form.priceMax) || 0,
      securityDeposit: Number(form.securityDeposit) || 0,
      lat: Number(form.lat) || 0,
      lng: Number(form.lng) || 0,
      rooms: form.rooms
        .filter((r) => r.type)
        .map((r) => ({
          type: r.type,
          price: Number(r.price) || 0,
          capacity: Number(r.capacity) || 1,
          available: Number(r.available) || 0,
        })),
      rules: form.rules.map((r) => String(r).trim()).filter(Boolean),
      ownerId: form.ownerId || '',
    };

    // Cheap client-side gates so the server round trip is only for real saves.
    const local = {};
    if (!payload.name || payload.name.trim().length < 3) local.name = 'Give the listing a name';
    if (!payload.city) local.city = 'City is required';
    if (!payload.price) local.price = 'Set a monthly rent';
    if (Object.keys(local).length) {
      setErrors(local);
      toast({ tone: 'warning', title: 'Check the highlighted fields' });
      document.getElementById('basics')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setSaving(true);
    const res =
      mode === 'edit'
        ? await apiSend(`/api/admin/listings/${hostel._id}`, { method: 'PATCH', body: payload })
        : await apiSend('/api/admin/listings', { method: 'POST', body: payload });
    setSaving(false);

    if (!res.ok) {
      if (res.fieldErrors) {
        setErrors(
          Object.fromEntries(
            Object.entries(res.fieldErrors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          )
        );
      }
      return toast({ tone: 'danger', title: 'Could not save', description: res.error });
    }

    toast({
      title: mode === 'edit' ? 'Listing saved' : 'Listing created',
      description: payload.name,
    });
    router.push('/admin/listings');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[13rem_minmax(0,1fr)]">
      {/* ── Section rail ── */}
      <nav aria-label="Form sections" className="hidden xl:block">
        <ul className="sticky top-20 space-y-0.5">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={active === s.id ? 'true' : undefined}
                  className={cn(
                    'flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors duration-200',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    active === s.id
                      ? 'bg-brand-50 font-medium text-brand-800 dark:bg-brand-950/70 dark:text-brand-200'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {s.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0 space-y-4">
        {/* ── Basics ── */}
        <Section
          id="basics"
          title="Basics"
          description="What the listing is called and where it sits in the review pipeline."
          icon={Building2}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Listing name"
              required
              value={form.name}
              error={errors.name}
              maxLength={120}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Al-Noor Girls Hostel G-11"
            />
            <div>
              <Input
                label="URL slug"
                value={effectiveSlug}
                error={errors.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set({ slug: slugify(e.target.value) });
                }}
                hint={
                  slugTouched
                    ? 'Manual override — clear it to follow the name again.'
                    : 'Generated from the name. Type here to override.'
                }
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <code className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                  /hostels/{slugify(effectiveSlug) || '…'}
                </code>
                {slugState.checking ? (
                  <span className="text-muted-foreground">Checking…</span>
                ) : !slugify(effectiveSlug) ? null : slugState.available ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <Check className="size-3.5" aria-hidden="true" />
                    Available
                  </span>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-1.5 text-danger">
                    <CircleAlert className="size-3.5" aria-hidden="true" />
                    Taken.
                    {slugState.suggestion && (
                      <button
                        type="button"
                        onClick={() => {
                          setSlugTouched(true);
                          set({ slug: slugState.suggestion });
                        }}
                        className="cursor-pointer font-medium underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        Use {slugState.suggestion}
                      </button>
                    )}
                  </span>
                )}
                {slugTouched && (
                  <button
                    type="button"
                    onClick={() => {
                      setSlugTouched(false);
                      set({ slug: '' });
                    }}
                    className="cursor-pointer text-muted-foreground underline hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Reset to name
                  </button>
                )}
              </div>
            </div>

            <Select
              label="Status"
              value={form.status}
              onChange={(e) => set({ status: e.target.value })}
              hint="Only “Live” is returned by public queries."
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>

            <Select
              label="Owner"
              value={form.ownerId}
              onChange={(e) => set({ ownerId: e.target.value })}
              hint="Who manages this listing and receives booking requests."
            >
              <option value="">Unassigned</option>
              {owners.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          {form.status === 'rejected' && (
            <Textarea
              label="Rejection reason"
              rows={2}
              value={form.rejectionReason}
              onChange={(e) => set({ rejectionReason: e.target.value })}
              hint="Shown to the owner so they know what to fix."
            />
          )}
        </Section>

        {/* ── Location ── */}
        <Section
          id="location"
          title="Location"
          description="Where it is, and which campuses it serves."
          icon={MapPin}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Input
                label="City"
                required
                list="admin-city-list"
                value={form.city}
                error={errors.city}
                onChange={(e) => set({ city: e.target.value })}
                placeholder="Islamabad"
              />
              <datalist id="admin-city-list">
                {cities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <Input
              label="Area / sector"
              value={form.area}
              onChange={(e) => set({ area: e.target.value })}
              placeholder="G-11/3"
            />
          </div>

          <Input
            label="Full address"
            value={form.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="House 12, Street 45, G-11/3, Islamabad"
          />

          <ChipGroup
            legend="Universities served"
            hint="Students filter by campus, so pick every one within a sensible commute."
            options={universities}
            value={form.universities}
            onToggle={toggleIn('universities')}
          />

          <div className="rounded-[var(--radius-card)] border border-border bg-surface-sunken p-3">
            <div className="flex flex-wrap items-end gap-3">
              <Input
                label="Latitude"
                inputMode="decimal"
                value={form.lat}
                onChange={(e) => set({ lat: e.target.value })}
                placeholder="33.6844"
                className="w-40"
              />
              <Input
                label="Longitude"
                inputMode="decimal"
                value={form.lng}
                onChange={(e) => set({ lng: e.target.value })}
                placeholder="73.0479"
                className="w-40"
              />
              {Number(form.lat) && Number(form.lng) ? (
                <Button
                  as="a"
                  href={`https://www.openstreetmap.org/?mlat=${form.lat}&mlon=${form.lng}#map=17/${form.lat}/${form.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  variant="secondary"
                  size="sm"
                >
                  <Eye className="size-3.5" aria-hidden="true" />
                  Check on the map
                </Button>
              ) : null}
            </div>

            <div className="mt-3">
              <Field
                label="Pick on a map"
                hint="No map picker here yet — open the map, drop a pin, then paste the link or the coordinates below."
              >
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={coordPaste}
                    onChange={(e) => setCoordPaste(e.target.value)}
                    placeholder="Paste a maps link or “33.6844, 73.0479”"
                    aria-label="Paste coordinates or a map link"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors duration-200 hover:border-border-strong focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const parsed = parseCoords(coordPaste);
                      if (!parsed) {
                        return toast({
                          tone: 'warning',
                          title: 'No coordinates found',
                          description: 'Expected something like 33.6844, 73.0479',
                        });
                      }
                      set({ lat: parsed.lat, lng: parsed.lng });
                      setCoordPaste('');
                      toast({ title: 'Coordinates filled in' });
                    }}
                  >
                    Use these
                  </Button>
                  <Button
                    as="a"
                    href="https://www.openstreetmap.org/"
                    target="_blank"
                    rel="noreferrer"
                    variant="ghost"
                  >
                    Open map
                  </Button>
                </div>
              </Field>
            </div>
          </div>
        </Section>

        {/* ── Pricing ── */}
        <Section
          id="pricing"
          title="Pricing & rooms"
          description="The headline rent, the band it sits in, and per-room availability."
          icon={Wallet}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Monthly rent (PKR)"
              required
              inputMode="numeric"
              value={form.price}
              error={errors.price}
              onChange={(e) => set({ price: e.target.value })}
              placeholder="14000"
            />
            <Input
              label="Lowest rent"
              inputMode="numeric"
              value={form.priceMin}
              onChange={(e) => set({ priceMin: e.target.value })}
              hint="Blank = derived from rooms"
            />
            <Input
              label="Highest rent"
              inputMode="numeric"
              value={form.priceMax}
              onChange={(e) => set({ priceMax: e.target.value })}
              hint="Blank = derived from rooms"
            />
            <Input
              label="Security deposit"
              inputMode="numeric"
              value={form.securityDeposit}
              onChange={(e) => set({ securityDeposit: e.target.value })}
              placeholder="0"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">Room types</h3>
              <div className="flex items-center gap-2">
                {form.rooms.length > 0 && (
                  <Badge tone="brand" size="sm" className="tabular">
                    {roomTotal} bed{roomTotal === 1 ? '' : 's'} free
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    set({
                      rooms: [
                        ...form.rooms,
                        { type: roomTypes[0] || 'Single', price: '', capacity: 1, available: 0 },
                      ],
                    })
                  }
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add room type
                </Button>
              </div>
            </div>

            {form.rooms.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-border-strong bg-surface-sunken px-3 py-4 text-center text-sm text-muted-foreground">
                No room breakdown yet — the headline rent is used on its own.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {form.rooms.map((room, i) => (
                  <li
                    key={i}
                    className="grid gap-2 rounded-xl border border-border bg-surface-sunken p-2.5 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                  >
                    <Select
                      label="Type"
                      value={room.type}
                      onChange={(e) => {
                        const rooms = [...form.rooms];
                        rooms[i] = { ...room, type: e.target.value };
                        set({ rooms });
                      }}
                    >
                      {roomTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label="Rent"
                      inputMode="numeric"
                      value={room.price}
                      onChange={(e) => {
                        const rooms = [...form.rooms];
                        rooms[i] = { ...room, price: e.target.value };
                        set({ rooms });
                      }}
                    />
                    <Input
                      label="Beds per room"
                      inputMode="numeric"
                      value={room.capacity}
                      onChange={(e) => {
                        const rooms = [...form.rooms];
                        rooms[i] = { ...room, capacity: e.target.value };
                        set({ rooms });
                      }}
                    />
                    <Input
                      label="Available now"
                      inputMode="numeric"
                      value={room.available}
                      onChange={(e) => {
                        const rooms = [...form.rooms];
                        rooms[i] = { ...room, available: e.target.value };
                        set({ rooms });
                      }}
                    />
                    <div className="flex items-end">
                      <button
                        type="button"
                        aria-label={`Remove ${room.type || 'room'} row`}
                        onClick={() => set({ rooms: form.rooms.filter((_, j) => j !== i) })}
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

        {/* ── Details ── */}
        <Section
          id="details"
          title="Details"
          description="Who it is for, what it offers, and the house rules."
          icon={ListFilter}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Gender"
              value={form.gender}
              onChange={(e) => set({ gender: e.target.value })}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Mixed">Mixed</option>
            </Select>
          </div>

          <Textarea
            label="Description"
            rows={6}
            maxLength={4000}
            value={form.description}
            error={errors.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Furnished rooms with attached washrooms, three meals a day, backup power and 24/7 security…"
            hint={`${form.description.length.toLocaleString('en-PK')} / 4,000 characters`}
          />

          <ChipGroup
            legend="Facilities"
            hint="Drawn from the shared FACILITIES vocabulary so search filters keep matching."
            options={facilities}
            value={form.facilities}
            onToggle={toggleIn('facilities')}
          />

          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">House rules</h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => set({ rules: [...form.rules, ''] })}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add rule
              </Button>
            </div>
            {form.rules.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-border-strong bg-surface-sunken px-3 py-4 text-center text-sm text-muted-foreground">
                No rules listed.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {form.rules.map((rule, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="tabular w-6 shrink-0 text-center text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={rule}
                      aria-label={`House rule ${i + 1}`}
                      maxLength={200}
                      onChange={(e) => {
                        const rules = [...form.rules];
                        rules[i] = e.target.value;
                        set({ rules });
                      }}
                      placeholder="Gate closes at 10pm"
                      className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors duration-200 hover:border-border-strong focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12"
                    />
                    <button
                      type="button"
                      aria-label={`Remove rule ${i + 1}`}
                      onClick={() => set({ rules: form.rules.filter((_, j) => j !== i) })}
                      className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-danger-soft hover:text-danger dark:hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        {/* ── Photos ── */}
        <Section
          id="photos"
          title="Photos"
          description="Uploaded to public/uploads/hostels. The first image is the cover."
          icon={Images}
        >
          <ImageUploader value={form.images} onChange={(images) => set({ images })} />
        </Section>

        {/* ── Contact ── */}
        <Section
          id="contact"
          title="Contact"
          description="How a student reaches this hostel from the public listing."
          icon={Phone}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Contact name"
              value={form.contact.name}
              onChange={(e) => setContact({ name: e.target.value })}
              placeholder="Warden or manager"
            />
            <Input
              label="Phone"
              type="tel"
              value={form.contact.phone}
              onChange={(e) => setContact({ phone: e.target.value })}
              placeholder="+92 300 1234567"
            />
            <Input
              label="WhatsApp"
              type="tel"
              value={form.contact.whatsapp}
              onChange={(e) => setContact({ whatsapp: e.target.value })}
              placeholder="+92 300 1234567"
            />
            <Input
              label="Email"
              type="email"
              value={form.contact.email}
              onChange={(e) => setContact({ email: e.target.value })}
              placeholder="hostel@example.com"
            />
          </div>
        </Section>

        {/* ── Visibility ── */}
        <Section
          id="visibility"
          title="Visibility"
          description="Trust badges and whether the listing is taking students right now."
          icon={ShieldCheck}
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <Checkbox
              label="Accepting students"
              description="Unchecked shows a “full” badge on the card."
              checked={form.available}
              onChange={(e) => set({ available: e.target.checked })}
            />
            <Checkbox
              label="Verified"
              description="Someone from Hostello has physically checked this hostel."
              checked={form.verified}
              onChange={(e) => set({ verified: e.target.checked })}
            />
            <Checkbox
              label="Featured"
              description="Promoted across the public site. Slots are limited in settings."
              checked={form.featured}
              onChange={(e) => set({ featured: e.target.checked })}
            />
          </div>

          {form.status === 'published' && !form.images.length && (
            <Alert tone="warning" title="No photos on a live listing">
              It will render the branded monogram tile instead. Add at least one photo before
              publishing if you can.
            </Alert>
          )}
        </Section>

        {/* ── Sticky save bar ── */}
        <div className="sticky bottom-0 z-30 -mx-3 border-t border-border bg-surface/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {mode === 'edit' ? 'Editing' : 'Creating'}{' '}
              <span className="font-medium text-foreground">{form.name || 'a new listing'}</span> ·
              status <span className="font-medium text-foreground">{form.status.replace(/_/g, ' ')}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => router.push('/admin/listings')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={saving}>
                <Save className="size-3.5" aria-hidden="true" />
                {mode === 'edit' ? 'Save changes' : 'Create listing'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

'use client';

import { useId, useState } from 'react';
import {
  Building2,
  Check,
  CircleAlert,
  Compass,
  ExternalLink,
  LocateFixed,
  MapPin,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Input, Select, Textarea, Field } from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Alert, Rating } from '@/components/ui/Feedback';
import { cn, formatPKR, formatPriceRange, haversineKm } from '@/lib/utils';
import {
  CITIES,
  CITY_CENTRES,
  GENDERS,
  PK_BOUNDS,
  SUGGESTED_RULES,
  UNIVERSITIES,
} from './constants';
import PhotoUploader from './PhotoUploader';

/**
 * The six field groups behind both the create wizard and the single-page edit
 * form. Each is a pure controlled component over the same `values` object, so
 * the two entry points can never drift apart in validation or wording.
 */

export function FormSection({ title, description, children, id }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4">
        <h2 className="text-h3 text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** Multi-select chips. Keyboard operable — each option is a real button. */
function ChipGroup({ label, hint, options, selected, onToggle, error, allowCustom, customLabel }) {
  const [custom, setCustom] = useState('');
  const groupId = useId();

  return (
    <Field label={label} hint={hint} error={error} htmlFor={groupId}>
      <div id={groupId} className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className={cn(
                'inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 text-sm font-medium',
                'transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                active
                  ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
                  : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground'
              )}
            >
              {active && <Check className="size-4 shrink-0" aria-hidden="true" />}
              {option}
            </button>
          );
        })}
        {/* Anything the owner added that is not in the standard vocabulary. */}
        {selected
          .filter((s) => !options.includes(s))
          .map((extra) => (
            <button
              key={extra}
              type="button"
              aria-pressed
              onClick={() => onToggle(extra)}
              className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-brand-600 bg-brand-50 px-3.5 text-sm font-medium text-brand-800 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-brand-950 dark:text-brand-200"
            >
              <X className="size-4 shrink-0" aria-hidden="true" />
              {extra}
            </button>
          ))}
      </div>

      {allowCustom && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (custom.trim()) {
                  onToggle(custom.trim());
                  setCustom('');
                }
              }
            }}
            placeholder={customLabel || 'Add another'}
            aria-label={customLabel || 'Add another'}
            className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground transition-colors duration-200 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 focus:outline-none"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (custom.trim()) {
                onToggle(custom.trim());
                setCustom('');
              }
            }}
            disabled={!custom.trim()}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Button>
        </div>
      )}
    </Field>
  );
}

// ─── 1. Basics ──────────────────────────────────────────────────────────

export function BasicsSection({ values, setField, errors }) {
  const cityListId = useId();

  return (
    <FormSection
      id="basics"
      title="The basics"
      description="What students see first in search results."
    >
      <Input
        label="Hostel name"
        required
        value={values.name}
        onChange={(e) => setField('name', e.target.value)}
        error={errors.name}
        maxLength={120}
        placeholder="Al-Noor Girls Hostel G-11"
        hint="Use the name on your signboard — students search for it."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Input
            label="City"
            required
            list={cityListId}
            value={values.city}
            onChange={(e) => setField('city', e.target.value)}
            error={errors.city}
            placeholder="Islamabad"
          />
          <datalist id={cityListId}>
            {CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </div>
        <Input
          label="Area or sector"
          value={values.area}
          onChange={(e) => setField('area', e.target.value)}
          error={errors.area}
          placeholder="G-11/3"
          hint="The sector or neighbourhood."
        />
      </div>

      <Input
        label="Street address"
        value={values.address}
        onChange={(e) => setField('address', e.target.value)}
        error={errors.address}
        placeholder="House 42, Street 18, G-11/3"
        hint="Only shown to students after you confirm a booking."
      />

      <ChipGroup
        label="Universities nearby"
        hint="Pick every campus within a reasonable commute — this is how most students filter."
        options={UNIVERSITIES}
        selected={values.universities}
        onToggle={(uni) =>
          setField(
            'universities',
            values.universities.includes(uni)
              ? values.universities.filter((u) => u !== uni)
              : [...values.universities, uni]
          )
        }
        error={errors.universities}
        allowCustom
        customLabel="Add another university"
      />

      <Select
        label="Who can stay"
        required
        value={values.gender}
        onChange={(e) => setField('gender', e.target.value)}
        error={errors.gender}
      >
        {GENDERS.map((g) => (
          <option key={g} value={g}>
            {g === 'Mixed' ? 'Mixed — men and women' : `${g} only`}
          </option>
        ))}
      </Select>
    </FormSection>
  );
}

// ─── 2. Pricing ─────────────────────────────────────────────────────────

export function PricingSection({ values, setField, errors, roomTypes = [] }) {
  const rooms = values.rooms || [];

  function updateRoom(index, key, value) {
    const next = rooms.map((room, i) => (i === index ? { ...room, [key]: value } : room));
    setField('rooms', next);
  }

  function addRoom() {
    setField('rooms', [
      ...rooms,
      { type: roomTypes[0] || 'Single', price: values.price || '', capacity: 1, available: 1 },
    ]);
  }

  return (
    <FormSection
      id="pricing"
      title="Pricing"
      description="Monthly rent in PKR. Be exact — students filter hard on price."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Headline monthly rent"
          required
          type="number"
          inputMode="numeric"
          min={0}
          step={500}
          value={values.price}
          onChange={(e) => setField('price', e.target.value)}
          error={errors.price}
          placeholder="15000"
          hint="The price shown on your card in search results."
        />
        <Input
          label="Security deposit"
          type="number"
          inputMode="numeric"
          min={0}
          step={500}
          value={values.securityDeposit}
          onChange={(e) => setField('securityDeposit', e.target.value)}
          error={errors.securityDeposit}
          placeholder="10000"
          hint="Refundable. Leave 0 if you do not take one."
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Lowest room price"
          type="number"
          inputMode="numeric"
          min={0}
          step={500}
          value={values.priceMin}
          onChange={(e) => setField('priceMin', e.target.value)}
          error={errors.priceMin}
          placeholder="12000"
        />
        <Input
          label="Highest room price"
          type="number"
          inputMode="numeric"
          min={0}
          step={500}
          value={values.priceMax}
          onChange={(e) => setField('priceMax', e.target.value)}
          error={errors.priceMax}
          placeholder="22000"
          hint="Leave both blank and we derive the range from your room table."
        />
      </div>

      {(values.priceMin || values.priceMax) && (
        <p className="tabular rounded-xl bg-surface-sunken px-4 py-3 text-sm text-muted-foreground">
          Students will see{' '}
          <span className="font-semibold text-foreground">
            {formatPriceRange(values.priceMin || values.price, values.priceMax)}
          </span>{' '}
          per month.
        </p>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Room types</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Optional, but listings with a room table get noticeably more enquiries.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addRoom}>
            <Plus className="size-4" aria-hidden="true" />
            Add room type
          </Button>
        </div>

        {rooms.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong bg-surface-sunken px-4 py-6 text-center text-sm text-muted-foreground">
            No room types yet. Add one for each room configuration you rent.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left">
                  <th scope="col" className="pb-2 pr-3 font-medium text-muted-foreground">Type</th>
                  <th scope="col" className="px-3 pb-2 font-medium text-muted-foreground">Rent / month</th>
                  <th scope="col" className="px-3 pb-2 font-medium text-muted-foreground">Beds in room</th>
                  <th scope="col" className="px-3 pb-2 font-medium text-muted-foreground">Beds free</th>
                  <th scope="col" className="pb-2 pl-3">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, index) => (
                  <tr key={index} className="align-top">
                    <td className="py-1.5 pr-3">
                      <select
                        aria-label={`Room ${index + 1} type`}
                        value={room.type}
                        onChange={(e) => updateRoom(index, 'type', e.target.value)}
                        className="h-11 w-full cursor-pointer rounded-xl border border-border bg-surface px-3 text-sm text-foreground transition-colors duration-200 hover:border-border-strong focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 focus:outline-none"
                      >
                        {roomTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min={0}
                        step={500}
                        aria-label={`Room ${index + 1} price`}
                        value={room.price}
                        onChange={(e) => updateRoom(index, 'price', e.target.value)}
                        className="tabular h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground transition-colors duration-200 hover:border-border-strong focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min={1}
                        aria-label={`Room ${index + 1} capacity`}
                        value={room.capacity}
                        onChange={(e) => updateRoom(index, 'capacity', e.target.value)}
                        className="tabular h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground transition-colors duration-200 hover:border-border-strong focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min={0}
                        aria-label={`Room ${index + 1} beds available`}
                        value={room.available}
                        onChange={(e) => updateRoom(index, 'available', e.target.value)}
                        className="tabular h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground transition-colors duration-200 hover:border-border-strong focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 pl-3">
                      <button
                        type="button"
                        onClick={() => setField('rooms', rooms.filter((_, i) => i !== index))}
                        aria-label={`Remove room type ${index + 1}`}
                        className="grid size-11 cursor-pointer place-items-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:bg-danger/15"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {errors.rooms && (
          <p className="mt-2 text-xs text-danger" role="alert">
            {errors.rooms}
          </p>
        )}
      </div>
    </FormSection>
  );
}

// ─── 3. Details ─────────────────────────────────────────────────────────

export function DetailsSection({ values, setField, errors, facilities = [] }) {
  const [rule, setRule] = useState('');
  const rules = values.rules || [];
  const length = (values.description || '').trim().length;

  function addRule(text) {
    const trimmed = text.trim();
    if (!trimmed || rules.includes(trimmed)) return;
    setField('rules', [...rules, trimmed]);
  }

  return (
    <FormSection
      id="details"
      title="Details"
      description="What makes your hostel worth choosing over the one down the road."
    >
      <div>
        <Textarea
          label="Description"
          required
          rows={7}
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
          error={errors.description}
          maxLength={4000}
          placeholder="Purpose-built girls hostel two minutes' walk from NUML. Furnished rooms with attached washrooms, three meals a day, backup power through load shedding, and a warden on site 24/7."
        />
        <p
          className={cn(
            'tabular mt-1 text-right text-xs',
            length < 60 ? 'text-muted-foreground' : 'text-success'
          )}
        >
          {length} / 4000 characters{length < 60 ? ` · ${60 - length} more needed` : ''}
        </p>
      </div>

      <ChipGroup
        label="Facilities"
        hint="Only tick what you actually provide — students review honestly."
        options={facilities}
        selected={values.facilities}
        onToggle={(f) =>
          setField(
            'facilities',
            values.facilities.includes(f)
              ? values.facilities.filter((x) => x !== f)
              : [...values.facilities, f]
          )
        }
        error={errors.facilities}
      />

      <Field
        label="House rules"
        hint="Set expectations up front and you get fewer awkward conversations later."
        error={errors.rules}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addRule(rule);
                setRule('');
              }
            }}
            placeholder="Gate closes at midnight"
            aria-label="Add a house rule"
            maxLength={160}
            className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground transition-colors duration-200 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 focus:outline-none"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              addRule(rule);
              setRule('');
            }}
            disabled={!rule.trim()}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Button>
        </div>

        {rules.length > 0 && (
          <ul className="mt-3 space-y-2">
            {rules.map((r, i) => (
              <li
                key={`${r}-${i}`}
                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-foreground"
              >
                <span className="min-w-0 flex-1 text-pretty">{r}</span>
                <button
                  type="button"
                  onClick={() => setField('rules', rules.filter((_, index) => index !== i))}
                  aria-label={`Remove rule: ${r}`}
                  className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:bg-danger/15"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {rules.length < 6 && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-muted-foreground">Common rules — tap to add:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_RULES.filter((s) => !rules.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addRule(s)}
                  className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-dashed border-border-strong px-2.5 text-xs text-muted-foreground transition-colors duration-200 hover:border-brand-600 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:text-brand-300"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </Field>
    </FormSection>
  );
}

// ─── 4. Photos ──────────────────────────────────────────────────────────

export function PhotosSection({ values, setField, errors, listingId }) {
  return (
    <FormSection
      id="photos"
      title="Photos"
      description="Listings with photos get several times the enquiries of listings without."
    >
      <PhotoUploader
        listingId={listingId}
        images={values.images || []}
        onChange={(images) => setField('images', images)}
        error={errors.images}
      />
    </FormSection>
  );
}

// ─── 5. Location ────────────────────────────────────────────────────────

export function LocationSection({ values, setField, errors }) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  const lat = Number(values.lat);
  const lng = Number(values.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  const inPakistan =
    hasCoords &&
    lat >= PK_BOUNDS.minLat &&
    lat <= PK_BOUNDS.maxLat &&
    lng >= PK_BOUNDS.minLng &&
    lng <= PK_BOUNDS.maxLng;

  const centre = CITY_CENTRES[values.city];
  const distance = hasCoords && centre ? haversineKm(lat, lng, centre.lat, centre.lng) : null;

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError('Your browser cannot share a location. Type the coordinates instead.');
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setField('lat', Number(position.coords.latitude.toFixed(6)));
        setField('lng', Number(position.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      () => {
        setGeoError('We could not read your location. Type the coordinates instead.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <FormSection
      id="location"
      title="Location"
      description="The pin decides whether you show up in “near my campus” searches."
    >
      <Alert tone="info" title="Finding your coordinates">
        Open Google Maps or OpenStreetMap, long-press your building, and copy the two numbers it
        shows. Latitude first, longitude second.
      </Alert>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Latitude"
          required
          type="number"
          step="0.000001"
          inputMode="decimal"
          value={values.lat}
          onChange={(e) => setField('lat', e.target.value)}
          error={errors.lat}
          placeholder="33.684400"
        />
        <Input
          label="Longitude"
          required
          type="number"
          step="0.000001"
          inputMode="decimal"
          value={values.lng}
          onChange={(e) => setField('lng', e.target.value)}
          error={errors.lng}
          placeholder="73.047900"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={useMyLocation} loading={locating}>
          <LocateFixed className="size-4" aria-hidden="true" />
          Use my current location
        </Button>
        {centre && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setField('lat', centre.lat);
              setField('lng', centre.lng);
            }}
          >
            <Compass className="size-4" aria-hidden="true" />
            Start from {values.city} centre
          </Button>
        )}
      </div>

      {geoError && <Alert tone="warning">{geoError}</Alert>}

      {/* Coordinate confirmation: echoes the pin back in plain language, with a
          sanity check against the city the owner chose, and a link out to a real
          map so they can verify the exact building. */}
      <div
        className={cn(
          'rounded-[var(--radius-card)] border p-4',
          hasCoords && inPakistan ? 'border-border bg-surface-sunken' : 'border-warning/40 bg-warning-soft/40'
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-xl',
              hasCoords && inPakistan
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                : 'bg-warning-soft text-warning dark:bg-warning/15 dark:text-amber-300'
            )}
          >
            {hasCoords && inPakistan ? (
              <MapPin className="size-5" aria-hidden="true" />
            ) : (
              <CircleAlert className="size-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            {!hasCoords ? (
              <>
                <p className="text-sm font-semibold text-foreground">No pin set yet</p>
                <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                  Enter a latitude and longitude, or use your current location while standing at the
                  hostel.
                </p>
              </>
            ) : !inPakistan ? (
              <>
                <p className="text-sm font-semibold text-warning dark:text-amber-300">
                  These coordinates are outside Pakistan
                </p>
                <p className="tabular mt-0.5 text-sm text-muted-foreground">
                  {lat.toFixed(6)}, {lng.toFixed(6)} — did you swap latitude and longitude?
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">Pin confirmed</p>
                <p className="tabular mt-0.5 text-sm text-foreground">
                  {lat.toFixed(6)}° N, {lng.toFixed(6)}° E
                </p>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">
                  {distance !== null
                    ? `About ${distance.toFixed(1)} km from the centre of ${values.city}.`
                    : 'Check it on the map before you submit.'}
                  {distance !== null && distance > 40 && (
                    <span className="ml-1 font-medium text-warning dark:text-amber-300">
                      That is a long way out — double-check the pin.
                    </span>
                  )}
                </p>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg text-sm font-medium text-brand-700 underline-offset-4 transition-colors duration-200 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand-300"
                >
                  Open this pin on a map
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </FormSection>
  );
}

// ─── 6. Contact ─────────────────────────────────────────────────────────

export function ContactSection({ values, setField, errors }) {
  const contact = values.contact || {};

  function setContact(key, value) {
    setField('contact', { ...contact, [key]: value });
  }

  const sameAsPhone = contact.whatsapp && contact.whatsapp === contact.phone;

  return (
    <FormSection
      id="contact"
      title="Contact"
      description="Every contact tap is counted, so you can see which listings actually generate calls."
    >
      <Input
        label="Contact person"
        required
        value={contact.name || ''}
        onChange={(e) => setContact('name', e.target.value)}
        error={errors['contact.name']}
        placeholder="Zahra Jamshaid"
        hint="Who students should ask for when they call."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Phone"
          required
          type="tel"
          inputMode="tel"
          value={contact.phone || ''}
          onChange={(e) => setContact('phone', e.target.value)}
          error={errors['contact.phone']}
          placeholder="+92 300 1234567"
        />
        <div>
          <Input
            label="WhatsApp"
            type="tel"
            inputMode="tel"
            value={contact.whatsapp || ''}
            onChange={(e) => setContact('whatsapp', e.target.value)}
            error={errors['contact.whatsapp']}
            placeholder="+92 300 1234567"
            hint="Most students message before they call."
          />
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 cursor-pointer accent-brand-700"
              checked={Boolean(sameAsPhone)}
              onChange={(e) => setContact('whatsapp', e.target.checked ? contact.phone || '' : '')}
            />
            Same as phone number
          </label>
        </div>
      </div>

      <Input
        label="Email"
        type="email"
        value={contact.email || ''}
        onChange={(e) => setContact('email', e.target.value)}
        error={errors['contact.email']}
        placeholder="bookings@alnoorhostel.pk"
        hint="Optional. Booking notifications always go to your account email."
      />
    </FormSection>
  );
}

// ─── 7. Review ──────────────────────────────────────────────────────────

function ReviewRow({ label, children, missing }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-2.5 last:border-b-0 sm:flex-row sm:gap-4">
      <dt className="w-full shrink-0 text-sm text-muted-foreground sm:w-44">{label}</dt>
      <dd
        className={cn(
          'min-w-0 flex-1 text-sm text-pretty',
          missing ? 'text-warning dark:text-amber-300' : 'text-foreground'
        )}
      >
        {children}
      </dd>
    </div>
  );
}

export function ReviewSummary({ values, listing }) {
  const missing = (v) => !v || (Array.isArray(v) && v.length === 0);

  return (
    <FormSection
      id="review"
      title="Review and submit"
      description="Check it reads the way you want a student to see it. You can still edit everything afterwards."
    >
      {listing?.images?.[0] && (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.images[0]}
            alt="Cover photo preview"
            className="h-48 w-full object-cover"
          />
        </div>
      )}

      <dl className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <ReviewRow label="Name" missing={missing(values.name)}>
          {values.name || 'Not set'}
        </ReviewRow>
        <ReviewRow label="Location" missing={missing(values.city)}>
          {[values.address, values.area, values.city].filter(Boolean).join(', ') || 'Not set'}
        </ReviewRow>
        <ReviewRow label="Universities" missing={missing(values.universities)}>
          {values.universities?.length ? (
            <span className="flex flex-wrap gap-1.5">
              {values.universities.map((u) => (
                <Badge key={u} tone="brand" size="sm">
                  {u}
                </Badge>
              ))}
            </span>
          ) : (
            'None selected'
          )}
        </ReviewRow>
        <ReviewRow label="Who can stay">{values.gender}</ReviewRow>
        <ReviewRow label="Rent" missing={!values.price}>
          <span className="tabular">
            {values.price ? formatPKR(values.price) : 'Not set'} / month
            {values.securityDeposit ? ` · ${formatPKR(values.securityDeposit)} deposit` : ''}
          </span>
        </ReviewRow>
        <ReviewRow label="Room types">
          {values.rooms?.length ? (
            <span className="tabular">
              {values.rooms.map((r) => `${r.type} (${formatPKR(r.price)})`).join(' · ')}
            </span>
          ) : (
            'None listed'
          )}
        </ReviewRow>
        <ReviewRow label="Facilities" missing={missing(values.facilities)}>
          {values.facilities?.length ? values.facilities.join(', ') : 'None selected'}
        </ReviewRow>
        <ReviewRow label="House rules">
          {values.rules?.length ? values.rules.join(' · ') : 'None listed'}
        </ReviewRow>
        <ReviewRow label="Photos" missing={missing(values.images)}>
          <span className="tabular">
            {values.images?.length ? `${values.images.length} uploaded` : 'None uploaded'}
          </span>
        </ReviewRow>
        <ReviewRow label="Map pin" missing={!values.lat || !values.lng}>
          <span className="tabular">
            {values.lat && values.lng ? `${values.lat}, ${values.lng}` : 'Not set'}
          </span>
        </ReviewRow>
        <ReviewRow label="Contact" missing={!values.contact?.phone}>
          <span className="tabular">
            {[values.contact?.name, values.contact?.phone, values.contact?.email]
              .filter(Boolean)
              .join(' · ') || 'Not set'}
          </span>
        </ReviewRow>
        <ReviewRow label="Description" missing={(values.description || '').length < 60}>
          {values.description ? (
            <span className="line-clamp-4">{values.description}</span>
          ) : (
            'Not written yet'
          )}
        </ReviewRow>
      </dl>

      {listing?.reviewCount > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="size-4" aria-hidden="true" />
          This listing already has{' '}
          <Rating value={listing.rating} count={listing.reviewCount} size="sm" />
        </p>
      )}
    </FormSection>
  );
}

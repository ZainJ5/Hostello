'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';
import FilterChip from '@/components/ds/FilterChip';
import { Alert } from '@/components/ds/Feedback';
import { CheckGroup, CheckRow, Field, Select, TextInput } from './Field';
import { NOTICE_TYPE_LIST } from './notice-types';
import { postJson } from './client';

/**
 * The notice board composer.
 *
 * THERE IS NO BLANK BOX. A student picks one of five types and fills that
 * type's fields; the headline and the sentence under it are composed on the
 * server from those fields. Everything rendered below comes from the field
 * declarations in `notice-types.js`, so a sixth type could not ship a textarea
 * even by accident: it would have to declare fields like the other five.
 *
 * The expiry is never a field. The type decides it, the server sets it, and
 * the composer only tells the student what it will be before they post.
 *
 * The form stays closed until asked for. A board is somewhere you read first
 * and write second, and an open form at the bottom of every visit makes an
 * empty board look like a form nobody has filled in.
 */

function emptyValues(def) {
  const out = {};
  for (const f of def.fields) {
    if (f.kind === 'multiselect') out[f.name] = [];
    else if (f.kind === 'checkbox') out[f.name] = false;
    else if (f.kind === 'select') out[f.name] = f.options[0];
    else out[f.name] = '';
  }
  return out;
}

export default function NoticeComposer({ hostelSlug }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(NOTICE_TYPE_LIST[0].value);
  const [values, setValues] = useState(() => emptyValues(NOTICE_TYPE_LIST[0]));
  const [room, setRoom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState(null);

  const def = NOTICE_TYPE_LIST.find((t) => t.value === type) || NOTICE_TYPE_LIST[0];

  function pickType(next) {
    const nextDef = NOTICE_TYPE_LIST.find((t) => t.value === next);
    if (!nextDef) return;
    setType(next);
    setValues(emptyValues(nextDef));
    setError('');
    setFieldErrors(null);
  }

  function set(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function toggleIn(name, option) {
    setValues((v) => {
      const list = v[name] || [];
      return {
        ...v,
        [name]: list.includes(option) ? list.filter((o) => o !== option) : [...list, option],
      };
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFieldErrors(null);
    try {
      await postJson('/api/community/notices', {
        hostelSlug,
        type,
        room,
        details: values,
      });
      setValues(emptyValues(def));
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fieldErrors);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        className="w-full"
        aria-expanded="false"
        aria-controls="notice-composer"
        onClick={() => setOpen(true)}
      >
        Put something on the board
      </Button>
    );
  }

  return (
    <form
      id="notice-composer"
      onSubmit={onSubmit}
      className="ds-elevated flex flex-col gap-5 rounded-ds-inner p-4 sm:p-5"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="ds-label text-ds-ink">What is it</legend>
        <div className="flex flex-wrap gap-1">
          {NOTICE_TYPE_LIST.map((t) => (
            <FilterChip
              key={t.value}
              selected={t.value === type}
              onClick={() => pickType(t.value)}
            >
              {t.picker}
            </FilterChip>
          ))}
        </div>
        <p className="ds-body-s text-ds-ink-muted">
          {def.pickerHint} {def.lifetime}
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {def.fields.map((f) => {
          const id = `notice-${type}-${f.name}`;
          const err = fieldErrors?.[f.name]?.[0];

          if (f.kind === 'multiselect') {
            return (
              <CheckGroup key={f.name} legend={f.label} error={err}>
                {f.options.map((o) => (
                  <CheckRow
                    key={o}
                    id={`${id}-${o}`}
                    label={o}
                    checked={(values[f.name] || []).includes(o)}
                    onChange={() => toggleIn(f.name, o)}
                  />
                ))}
              </CheckGroup>
            );
          }

          if (f.kind === 'checkbox') {
            return (
              <div key={f.name} className="flex items-end sm:col-span-2">
                <CheckRow
                  id={id}
                  label={f.label}
                  checked={Boolean(values[f.name])}
                  onChange={(e) => set(f.name, e.target.checked)}
                />
              </div>
            );
          }

          return (
            <Field
              key={f.name}
              id={id}
              label={f.label}
              required={Boolean(f.required)}
              error={err}
              className={f.kind === 'select' || f.name === 'note' ? 'sm:col-span-2' : undefined}
            >
              {f.kind === 'select' ? (
                <Select
                  id={id}
                  value={values[f.name]}
                  onChange={(e) => set(f.name, e.target.value)}
                  options={f.options}
                />
              ) : (
                <TextInput
                  id={id}
                  type={
                    f.kind === 'number'
                      ? 'number'
                      : f.kind === 'date'
                        ? 'date'
                        : f.kind === 'datetime'
                          ? 'datetime-local'
                          : 'text'
                  }
                  inputMode={f.kind === 'number' ? 'numeric' : undefined}
                  value={values[f.name]}
                  onChange={(e) => set(f.name, e.target.value)}
                  required={Boolean(f.required)}
                  maxLength={f.maxLength}
                  min={f.min}
                  max={f.max}
                  placeholder={f.placeholder}
                  suffix={f.suffix}
                />
              )}
            </Field>
          );
        })}

        <Field id="notice-room" label="Your room">
          <TextInput
            id="notice-room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            maxLength={24}
            placeholder="2A"
          />
        </Field>
      </div>

      {error ? <Alert tone="error" title="That did not post">{error}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          Put it on the board
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

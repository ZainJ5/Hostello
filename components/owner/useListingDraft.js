'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiSend } from './api-client';
import { validateWith } from './schemas';

/**
 * Shared form state for both the create wizard and the single-page editor.
 *
 * Autosave is the whole point: a draft exists on the server from the end of
 * step 1, and every later change is PATCHed 1.2s after the owner stops typing.
 * If they close the tab, walk away, or their phone dies mid-form, the draft is
 * already on the server and `/owner/listings` links them straight back into it.
 */

const NUMERIC_FIELDS = ['price', 'priceMin', 'priceMax', 'securityDeposit', 'lat', 'lng'];

export const EMPTY_LISTING = {
  name: '',
  city: '',
  area: '',
  address: '',
  universities: [],
  gender: 'Male',
  price: '',
  priceMin: '',
  priceMax: '',
  securityDeposit: '',
  rooms: [],
  description: '',
  facilities: [],
  rules: [],
  images: [],
  lat: '',
  lng: '',
  contact: { name: '', phone: '', whatsapp: '', email: '' },
};

/** Mongo document → controlled form values (numbers become strings). */
export function toFormValues(listing) {
  if (!listing) return { ...EMPTY_LISTING, contact: { ...EMPTY_LISTING.contact } };
  return {
    name: listing.name || '',
    city: listing.city || '',
    area: listing.area || '',
    address: listing.address || '',
    universities: listing.universities || [],
    gender: listing.gender || 'Male',
    price: listing.price ? String(listing.price) : '',
    priceMin: listing.priceMin ? String(listing.priceMin) : '',
    priceMax: listing.priceMax ? String(listing.priceMax) : '',
    securityDeposit: listing.securityDeposit ? String(listing.securityDeposit) : '',
    rooms: (listing.rooms || []).map((room) => ({
      type: room.type,
      price: String(room.price ?? ''),
      capacity: String(room.capacity ?? 1),
      available: String(room.available ?? 0),
    })),
    description: listing.description || '',
    facilities: listing.facilities || [],
    rules: listing.rules || [],
    images: listing.images || [],
    lat: listing.lat ? String(listing.lat) : '',
    lng: listing.lng ? String(listing.lng) : '',
    contact: {
      name: listing.contact?.name || '',
      phone: listing.contact?.phone || '',
      whatsapp: listing.contact?.whatsapp || '',
      email: listing.contact?.email || '',
    },
  };
}

/** Form values → the JSON body the API expects. Blank numbers are omitted. */
export function toPatchPayload(values) {
  const payload = {
    name: (values.name || '').trim(),
    city: (values.city || '').trim(),
    area: (values.area || '').trim(),
    address: (values.address || '').trim(),
    universities: values.universities || [],
    description: values.description || '',
    facilities: values.facilities || [],
    rules: values.rules || [],
    images: values.images || [],
    contact: {
      name: (values.contact?.name || '').trim(),
      phone: (values.contact?.phone || '').trim(),
      whatsapp: (values.contact?.whatsapp || '').trim(),
      email: (values.contact?.email || '').trim(),
    },
    rooms: (values.rooms || [])
      .filter((room) => room.type)
      .map((room) => ({
        type: room.type,
        price: Number(room.price) || 0,
        capacity: Number(room.capacity) || 1,
        available: Number(room.available) || 0,
      })),
  };

  if (values.gender) payload.gender = values.gender;

  // An empty box means "not answered yet", not zero. Sending 0 would silently
  // wipe a price the owner has already saved.
  for (const key of NUMERIC_FIELDS) {
    const raw = values[key];
    if (raw === '' || raw === null || raw === undefined) continue;
    const num = Number(raw);
    if (Number.isFinite(num)) payload[key] = num;
  }

  return payload;
}

/** `rooms.2.price` style issues are folded onto the field group that shows them. */
function collapseArrayErrors(errors, prefix) {
  const out = {};
  let collapsed = null;
  for (const [key, message] of Object.entries(errors)) {
    if (key === prefix || key.startsWith(`${prefix}.`)) {
      if (!collapsed) collapsed = message;
    } else {
      out[key] = message;
    }
  }
  if (collapsed) out[prefix] = collapsed;
  return out;
}

export function useListingDraft({ listing }) {
  const [listingId, setListingId] = useState(listing?._id || null);
  const [values, setValues] = useState(() => toFormValues(listing));
  const [errors, setErrors] = useState({});
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [saveError, setSaveError] = useState('');

  // The last payload the server acknowledged. Held in state, not a ref, so
  // `dirty` can be derived during render without reading a ref.
  const [savedPayload, setSavedPayload] = useState(() =>
    JSON.stringify(toPatchPayload(toFormValues(listing)))
  );

  const payload = useMemo(() => JSON.stringify(toPatchPayload(values)), [values]);
  const dirty = payload !== savedPayload;

  const setField = useCallback((key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    // Clear the field's own error the moment the owner starts fixing it,
    // including nested `contact.phone` style keys.
    setErrors((current) => {
      const keys = Object.keys(current).filter((k) => k === key || k.startsWith(`${key}.`));
      if (!keys.length) return current;
      const next = { ...current };
      for (const k of keys) delete next[k];
      return next;
    });
  }, []);

  /** Creates the server-side draft. Returns its id. */
  const createDraft = useCallback(async () => {
    const body = toPatchPayload(values);
    setSaveState('saving');
    try {
      const data = await apiSend('/api/owner/listings', { body });
      setSavedPayload(JSON.stringify(body));
      setListingId(data.listing._id);
      setSaveState('saved');
      setSaveError('');
      return data.listing._id;
    } catch (err) {
      setSaveState('error');
      setSaveError(err.message);
      if (err.fieldErrors) setErrors(err.fieldErrors);
      throw err;
    }
  }, [values]);

  /** Pushes the current values to the server. No-op when there is no draft. */
  const save = useCallback(async () => {
    if (!listingId) return null;
    const body = toPatchPayload(values);
    const snapshot = JSON.stringify(body);
    if (snapshot === savedPayload) return null;

    setSaveState('saving');
    try {
      const data = await apiSend(`/api/owner/listings/${listingId}`, { method: 'PATCH', body });
      setSavedPayload(snapshot);
      setSaveState('saved');
      setSaveError('');
      return data;
    } catch (err) {
      setSaveState('error');
      setSaveError(err.message);
      if (err.fieldErrors) setErrors(err.fieldErrors);
      throw err;
    }
  }, [listingId, values, savedPayload]);

  // Debounced autosave. The timeout callback is async, so no state is set
  // synchronously inside the effect body.
  useEffect(() => {
    if (!listingId || !dirty) return undefined;
    const timer = setTimeout(() => {
      save().catch(() => {
        /* surfaced through saveState/saveError */
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [payload, listingId, dirty, save]);

  // Last line of defence for a tab closed mid-edit.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /** Runs one step's schema and publishes the errors. Returns true when valid. */
  const validateStep = useCallback(
    (schema) => {
      if (!schema) return true;
      const result = validateWith(schema, values);
      setErrors(result.ok ? {} : collapseArrayErrors(result.errors, 'rooms'));
      return result.ok;
    },
    [values]
  );

  return {
    listingId,
    values,
    setField,
    setValues,
    errors,
    setErrors,
    saveState,
    saveError,
    dirty,
    save,
    createDraft,
    validateStep,
  };
}

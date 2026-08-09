import mongoose from 'mongoose';

/**
 * Listing-fee configuration and the out-of-band payment instructions shown on
 * the payment screen.
 *
 * There is no `Settings` model in `@/models`: the collection is optional and
 * may be created later by the admin stream. So we read it defensively straight
 * off the driver (`settings` collection, `{ key: 'payment' }`) and fall back to
 * these constants when it is absent or malformed. The fallback numbers are the
 * standard listing fee of PKR 5,000 for a 6-month listing period.
 */
export const LISTING_FEE_FALLBACK = {
  amount: 5000,
  currency: 'PKR',
  planMonths: 6,
  accounts: [
    {
      method: 'Bank Transfer',
      label: 'Meezan Bank',
      accountTitle: 'Hostello Technologies (Pvt) Ltd',
      accountNumber: 'PK36 MEZN 0001 2345 6789 0123',
      note: 'IBAN. Use the listing name as the transfer remark.',
    },
    {
      method: 'JazzCash',
      label: 'JazzCash',
      accountTitle: 'Hostello Technologies',
      accountNumber: '0300 1234567',
      note: 'Send to this mobile account, then screenshot the confirmation.',
    },
    {
      method: 'Easypaisa',
      label: 'Easypaisa',
      accountTitle: 'Hostello Technologies',
      accountNumber: '0345 7654321',
      note: 'Send to this mobile account, then screenshot the confirmation.',
    },
  ],
};

/**
 * Returns the live billing configuration. Never throws: a missing collection,
 * a driver hiccup, or a half-written document all degrade to the constants
 * above so the owner can still pay.
 */
export async function getBillingConfig() {
  try {
    const db = mongoose.connection?.db;
    if (!db) return LISTING_FEE_FALLBACK;

    const names = await db.listCollections({ name: 'settings' }).toArray();
    if (!names.length) return LISTING_FEE_FALLBACK;

    const doc = await db.collection('settings').findOne({ key: 'payment' });
    const value = doc?.value || doc;
    if (!value || typeof value !== 'object') return LISTING_FEE_FALLBACK;

    const accounts = Array.isArray(value.accounts) && value.accounts.length
      ? value.accounts
      : LISTING_FEE_FALLBACK.accounts;

    return {
      amount: Number(value.amount) > 0 ? Number(value.amount) : LISTING_FEE_FALLBACK.amount,
      currency: value.currency || LISTING_FEE_FALLBACK.currency,
      planMonths:
        Number(value.planMonths) > 0
          ? Number(value.planMonths)
          : LISTING_FEE_FALLBACK.planMonths,
      accounts,
    };
  } catch {
    return LISTING_FEE_FALLBACK;
  }
}

import Settings, { SETTINGS_KEY } from '@/models/Settings';

/**
 * Reads the singleton settings document, creating it with model defaults the
 * first time an admin opens the console. Upsert keeps this idempotent under
 * concurrent requests.
 */
export async function getSettings() {
  const doc = await Settings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return doc;
}

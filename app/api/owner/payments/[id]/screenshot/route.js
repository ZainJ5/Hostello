import fs from 'node:fs/promises';
import { handler, fail } from '@/lib/api';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import Payment from '@/models/Payment';
import { assertOwned, objectIdOr404 } from '@/app/(owner)/_lib/owner-data';
import { resolvePaymentScreenshot } from '@/app/(owner)/_lib/uploads';

/**
 * Authenticated read of a payment screenshot.
 *
 * A receipt shows a bank account, a mobile wallet number and a transaction ID,
 * so it must only ever reach the owner who uploaded it and the admins who
 * review it. The UI points at this route, never at the raw `/uploads/...` path.
 *
 * ── Residual risk ──────────────────────────────────────────────────────
 * The file still physically lives under `public/`, which Next serves without
 * any auth check, so this route raises the bar rather than closing the hole:
 *   • Filenames are 16 bytes of CSPRNG hex (`pay-<32 hex>.<ext>`) and are never
 *     rendered in owner-facing HTML, so they cannot be enumerated or scraped.
 *   • Anyone who does learn an exact filename (from a server backup, a log, or
 *     a leaked database row) can still fetch it directly.
 * The real fix is to move the payments directory outside the web root (or deny
 * `location /uploads/payments/` at the NGINX layer that already fronts
 * `public/uploads` in production). That change belongs to the deployment
 * configuration rather than this route, and is recorded here so the gap is not
 * mistaken for a solved problem.
 * ───────────────────────────────────────────────────────────────────────
 */
export const GET = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { id } = await ctx.params;

  const payment = await Payment.findById(objectIdOr404(id, 'receipt'))
    .select('ownerId screenshot')
    .lean();
  // 404 for both "missing" and "someone else's". See `assertOwned`.
  assertOwned(payment, session, 'receipt');

  const resolved = resolvePaymentScreenshot(payment.screenshot);
  if (!resolved) return fail('That receipt is not available', 404);

  let bytes;
  try {
    bytes = await fs.readFile(resolved.abs);
  } catch {
    // A record can still point at a path with no file behind it, so the UI
    // shows a "receipt unavailable" state rather than a broken image.
    return fail('That receipt file is missing from storage', 404);
  }

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': resolved.mime,
      'Content-Length': String(bytes.length),
      'Content-Disposition': `inline; filename="receipt-${id}"`,
      // Never let a shared cache or a CDN hold a private receipt.
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      // Belt and braces: an image route should never be interpreted as markup.
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; sandbox",
    },
  });
});

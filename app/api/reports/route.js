import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { clientIp, created, fail, handler, readJson } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { sendNotification } from '@/lib/mail';
import Hostel from '@/models/Hostel';
import Report from '@/models/Report';
import {
  MIN_REPORT_DETAILS,
  REPORT_REASON_VALUES,
  URGENT_REPORT_REASONS,
  reportReason,
} from '@/components/content/report-reasons';

/** Where a report reaches a person. There is no admin queue: see models/Report.js. */
const REPORT_INBOX = 'team@xaviot.com';

const schema = z
  .object({
    // Optional: the page can be reached with no listing in context.
    hostelSlug: z.string().trim().max(200).default(''),
    hostelName: z.string().trim().max(200).default(''),
    reason: z.enum(REPORT_REASON_VALUES, {
      message: 'Pick the thing that is wrong',
    }),
    details: z
      .string()
      .trim()
      .min(
        MIN_REPORT_DETAILS,
        `Tell us what happened: at least ${MIN_REPORT_DETAILS} characters`
      )
      .max(2000, 'Keep the report under 2000 characters'),
    reporterEmail: z
      .string()
      .trim()
      .max(200)
      .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
        message: 'That does not look like an email address',
      })
      .default(''),
  })
  .refine((v) => Boolean(v.hostelSlug) || Boolean(v.hostelName), {
    message: 'Name the listing you are reporting',
    path: ['hostelName'],
  });

/**
 * POST /api/reports: report a listing.
 *
 * ANYBODY CAN SEND ONE, signed in or not. The safety page says so in writing,
 * and requiring an account would lose exactly the reports that matter most:
 * the student who was asked for money before a visit has usually not signed up
 * yet. So this is the one public write on the site that does not call
 * `requireRole`, and the rate limit is keyed on the client IP rather than on a
 * user id, the same way the other unauthenticated writes are.
 *
 * Five an hour is generous for a real reporter and cheap to survive: the
 * report is never rendered anywhere, so flooding this endpoint defaces nothing
 * and only fills a collection a person reads.
 */
export const POST = handler(async (req) => {
  await connectDB();

  enforceRateLimit(`report:create:${clientIp(req)}`, {
    max: 5,
    windowMs: 60 * 60 * 1000,
  });

  const body = schema.parse(await readJson(req));

  // The slug is the trustworthy half. When it resolves we take the name from
  // the record rather than from the form, so a report cannot be filed against
  // a listing under a name that listing never had.
  let hostel = null;
  if (body.hostelSlug) {
    hostel = await Hostel.findOne({ slug: body.hostelSlug }).select('_id name city area').lean();
    if (!hostel) return fail('That listing could not be found', 404);
  }

  const hostelName = hostel?.name || body.hostelName;
  if (!hostelName) return fail('Name the listing you are reporting', 422);

  // A report never carries a session requirement, but when there is one we
  // keep the id so we can come back without asking for an address again.
  const session = await getSession().catch(() => null);

  const urgent = URGENT_REPORT_REASONS.includes(body.reason);

  const report = await Report.create({
    hostelId: hostel?._id || null,
    hostelName,
    reason: body.reason,
    details: body.details,
    urgent,
    reporterId: session?.userId || null,
    reporterEmail: body.reporterEmail || session?.email || '',
  });

  // Best effort. A report that reached the database has been received, so a
  // mail failure must not tell the reporter their report was lost.
  try {
    const label = reportReason(body.reason)?.label || body.reason;
    await sendNotification({
      to: REPORT_INBOX,
      subject: `${urgent ? 'Urgent listing report' : 'Listing report'}: ${hostelName}`,
      heading: urgent ? 'Urgent report, same day' : 'Listing report',
      body:
        `${hostelName}${hostel?.city ? `, ${hostel.city}` : ''}\n\n` +
        `Reason: ${label}\n\n` +
        `${body.details}\n\n` +
        `Reporter: ${body.reporterEmail || session?.email || 'not given'}\n` +
        `Report id: ${report._id}`,
    });
  } catch (err) {
    console.error('[reports] could not notify:', err?.message || err);
  }

  return created({ ok: true, urgent });
});

import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Returns a configured SMTP transport, or null when SMTP_HOST is unset.
 * A null transport means SMTP is not available and delivery falls through
 * to the next option in `deliver`.
 */
function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

/** The address every message is sent from. Must be a domain verified in Resend. */
function fromAddress() {
  return (
    process.env.MAIL_FROM ||
    process.env.SMTP_FROM ||
    'Hostello <no-reply@hostello.tech>'
  );
}

/**
 * Sends through Resend's HTTP API. Preferred over SMTP in production: it needs
 * no outbound mail ports, and a failure comes back as a readable JSON error
 * rather than an SMTP timeout.
 */
async function sendViaResend({ to, subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromAddress(), to: [to], subject, text, html }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend refused the message (${res.status}): ${detail}`);
  }
  return res.json().catch(() => ({}));
}

/**
 * One delivery path for every message. Resend is used when its key is
 * present, SMTP is the fallback for self-hosting, and when neither is
 * configured the message is written to the server log instead.
 *
 * Returns `{ delivered }`, where false means nothing left the process.
 */
async function deliver({ to, subject, text, html, devLine }) {
  if (process.env.RESEND_API_KEY) {
    await sendViaResend({ to, subject, text, html });
    return { delivered: true };
  }

  const transport = getTransporter();
  if (transport) {
    await transport.sendMail({ from: fromAddress(), to, subject, text, html });
    return { delivered: true };
  }

  console.info(devLine);
  return { delivered: false };
}

const brand = {
  teal: '#0f766e',
  ink: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
};

function layout({ title, intro, code, footer }) {
  // Table-based markup with inline styles: the only combination Outlook and
  // Gmail both render predictably.
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${brand.bg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.bg};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${brand.border};border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;">
          <div style="font-size:20px;font-weight:800;color:${brand.teal};letter-spacing:-0.02em;">Hostello</div>
        </td></tr>
        <tr><td style="padding:20px 32px 0;">
          <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;color:${brand.ink};font-weight:700;">${title}</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:${brand.muted};">${intro}</p>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <div style="background:${brand.bg};border:1px solid ${brand.border};border-radius:12px;padding:20px;text-align:center;">
            <div style="font-size:34px;font-weight:700;letter-spacing:10px;color:${brand.ink};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${code}</div>
          </div>
          <p style="margin:14px 0 0;font-size:13px;color:${brand.muted};text-align:center;">This code expires in 10 minutes.</p>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:${brand.muted};border-top:1px solid ${brand.border};padding-top:16px;">${footer}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:${brand.muted};">Hostello, Pakistan's student hostel finder</p>
    </td></tr>
  </table>
</body></html>`;
}

const TEMPLATES = {
  signup: {
    subject: 'Verify your Hostello account',
    title: 'Confirm your email',
    intro: 'Enter this code to finish creating your Hostello account.',
    footer: "If you didn't sign up for Hostello, you can safely ignore this email.",
  },
  login: {
    subject: 'Your Hostello sign-in code',
    title: 'Sign in to Hostello',
    intro: 'Enter this code to sign in.',
    footer: "If you didn't try to sign in, change your password.",
  },
  reset: {
    subject: 'Reset your Hostello password',
    title: 'Reset your password',
    intro: 'Enter this code to choose a new password.',
    footer: "If you didn't request a reset, your password is unchanged.",
  },
  'delete-account': {
    subject: 'Confirm Hostello account deletion',
    title: 'Confirm account deletion',
    intro:
      'Enter this code to permanently delete your Hostello account. This cannot be undone.',
    footer:
      "If you didn't request deletion, ignore this email and change your password immediately.",
  },
};

/**
 * Sends a verification code. When no mail transport is configured the code is
 * written to the server log and the call still resolves, so the caller is not
 * blocked. Returns { delivered } so callers can tell whether the message
 * actually went out.
 */
export async function sendVerificationCode({ to, code, purpose = 'signup' }) {
  const t = TEMPLATES[purpose] || TEMPLATES.signup;

  const { delivered } = await deliver({
    to,
    subject: t.subject,
    text: `${t.intro}\n\nCode: ${code}\n\nThis code expires in 10 minutes.\n\n${t.footer}`,
    html: layout({ title: t.title, intro: t.intro, code, footer: t.footer }),
    devLine:
      `[mail] no transport configured, verification code not sent ` +
      `(to=${to} purpose=${purpose} code=${code})`,
  });

  return delivered ? { delivered: true } : { delivered: false, devCode: code };
}

/** Plain notification email (booking updates, listing approvals). */
export async function sendNotification({ to, subject, heading, body, cta }) {
  const button = cta
    ? `<a href="${cta.href}" style="display:inline-block;background:${brand.teal};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;">${cta.label}</a>`
    : '';

  return deliver({
    to,
    subject,
    text: `${heading}\n\n${body}${cta ? `\n\n${cta.href}` : ''}`,
    html: `<!doctype html><html><body style="margin:0;background:${brand.bg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" style="padding:32px 12px;"><tr><td align="center">
        <table role="presentation" style="max-width:520px;background:#fff;border:1px solid ${brand.border};border-radius:16px;">
          <tr><td style="padding:28px 32px;">
            <div style="font-size:20px;font-weight:800;color:${brand.teal};margin-bottom:18px;">Hostello</div>
            <h1 style="margin:0 0 10px;font-size:20px;color:${brand.ink};">${heading}</h1>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${brand.muted};">${body}</p>
            ${button}
          </td></tr>
        </table>
      </td></tr></table>
    </body></html>`,
    devLine: `[mail] no transport configured, notification not sent ("${subject}" to ${to})`,
  });
}

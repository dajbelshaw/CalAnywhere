/**
 * Email sending service.
 *
 * Uses Mailgun when configured (MAILGUN_API_KEY, MAILGUN_DOMAIN,
 * MAILGUN_FROM_EMAIL). Falls back to a console stub in development
 * when env vars are absent — no noisy warnings, just a one-time log.
 */

import axios from "axios";

interface AppointmentEmailPayload {
  ownerName: string;
  ownerEmail: string;
  requesterName: string;
  requesterEmail: string;
  reason: string;
  notes?: string;
  startIso: string;
  endIso: string;
  timezone?: string;
}

interface VerificationEmailPayload {
  requesterEmail: string;
  requesterName: string;
  ownerName: string;
  startIso: string;
  endIso: string;
  confirmUrl: string;
  timezone?: string;
}

// ── Mailgun config (optional) ─────────────────────────────────────

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL;
const MAILGUN_API_BASE =
  process.env.MAILGUN_API_BASE || "https://api.eu.mailgun.net";

const isMailgunConfigured = !!(
  MAILGUN_API_KEY &&
  MAILGUN_DOMAIN &&
  MAILGUN_FROM_EMAIL
);

if (!isMailgunConfigured) {
  // eslint-disable-next-line no-console
  console.log(
    "[email] Mailgun not configured. Emails will be logged to console. " +
      "Set MAILGUN_API_KEY, MAILGUN_DOMAIN, and MAILGUN_FROM_EMAIL to enable."
  );
}

// ── Low-level send ────────────────────────────────────────────────

async function sendViaMailgun(
  to: string,
  subject: string,
  text: string
): Promise<void> {
  const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64");
  const form = new URLSearchParams();
  form.append("from", MAILGUN_FROM_EMAIL!);
  form.append("to", to);
  form.append("subject", subject);
  form.append("text", text);

  const url = `${MAILGUN_API_BASE}/v3/${MAILGUN_DOMAIN}/messages`;

  try {
    await axios.post(url, form, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    });
  } catch (err: unknown) {
    const message =
      axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : String(err);
    // eslint-disable-next-line no-console
    console.error(`[email] Mailgun error: ${message}`);
    throw new Error(`Email send failed: ${message}`);
  }
}

// ── Public API ────────────────────────────────────────────────────

export async function sendVerificationEmail(
  payload: VerificationEmailPayload
): Promise<void> {
  const start = new Date(payload.startIso);
  const end = new Date(payload.endIso);
  const tzLabel = payload.timezone ? ` (${payload.timezone})` : "";

  const subject = `Confirm your appointment request with ${payload.ownerName}`;
  const text = [
    `Hi ${payload.requesterName},\n`,
    `Please confirm your appointment request by clicking the link below:\n`,
    payload.confirmUrl,
    `\nREQUEST DETAILS`,
    `- With: ${payload.ownerName}`,
    `- From: ${start.toISOString()}${tzLabel}`,
    `- To:   ${end.toISOString()}${tzLabel}\n`,
    `This link expires in 1 hour. If you did not make this request, you can safely ignore this email.\n`,
    `-- CalAnywhere`,
  ].join("\n");

  if (isMailgunConfigured) {
    await sendViaMailgun(payload.requesterEmail, subject, text);
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `[email stub] Verification for ${payload.requesterEmail}:`,
      payload.confirmUrl
    );
  }
}

export async function sendAppointmentRequestEmail(
  payload: AppointmentEmailPayload
): Promise<void> {
  const start = new Date(payload.startIso);
  const end = new Date(payload.endIso);
  const tzLabel = payload.timezone ? ` (${payload.timezone})` : "";

  const subject = `Appointment request: ${payload.requesterName} - ${start.toISOString()}${tzLabel}`;
  const text = [
    `You have received a new appointment request via CalAnywhere.\n`,
    `REQUESTER`,
    `- Name: ${payload.requesterName}`,
    `- Email: ${payload.requesterEmail}\n`,
    `REQUESTED TIME`,
    `- From: ${start.toISOString()}${tzLabel}`,
    `- To:   ${end.toISOString()}${tzLabel}\n`,
    `REASON FOR MEETING`,
    payload.reason,
    "",
    payload.notes ? `ADDITIONAL NOTES\n${payload.notes}\n` : "",
    `NEXT STEPS`,
    `- Check the time is still available in your calendar.`,
    `- Create an event for the agreed slot.`,
    `- Reply to ${payload.requesterEmail} to confirm or propose alternatives.\n`,
    `This request was sent via CalAnywhere. No event has been created automatically.\n`,
    `-- CalAnywhere`,
  ].join("\n");

  if (isMailgunConfigured) {
    await sendViaMailgun(payload.ownerEmail, subject, text);
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `[email stub] Notification to ${payload.ownerEmail}:`,
      `${payload.requesterName} requested ${payload.startIso}`
    );
  }
}

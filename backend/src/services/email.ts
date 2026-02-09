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

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL;
const MAILGUN_API_BASE = process.env.MAILGUN_API_BASE || "https://api.eu.mailgun.net";


if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN || !MAILGUN_FROM_EMAIL) {
  // eslint-disable-next-line no-console
  console.warn(
    "Mailgun environment variables are not fully configured. Email sending will fail."
  );
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

export async function sendVerificationEmail(
  payload: VerificationEmailPayload
): Promise<void> {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN || !MAILGUN_FROM_EMAIL) {
    throw new Error("Mailgun not configured");
  }

  const start = new Date(payload.startIso);
  const end = new Date(payload.endIso);
  const tzLabel = payload.timezone ? ` (${payload.timezone})` : "";

  const subject = `Confirm your appointment request with ${payload.ownerName}`;

  const bodyLines = [
    `Hi ${payload.requesterName},\n`,
    `Please confirm your appointment request by clicking the link below:\n`,
    payload.confirmUrl,
    `\nREQUEST DETAILS`,
    `- With: ${payload.ownerName}`,
    `- From: ${start.toISOString()}${tzLabel}`,
    `- To:   ${end.toISOString()}${tzLabel}\n`,
    `This link expires in 1 hour. If you did not make this request, you can safely ignore this email.\n`,
    `— CalAnywhere`
  ];

  const text = bodyLines.join("\n");

  const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64");

  const form = new URLSearchParams();
  form.append("from", MAILGUN_FROM_EMAIL);
  form.append("to", payload.requesterEmail);
  form.append("subject", subject);
  form.append("text", text);

  const url = `${MAILGUN_API_BASE}/v3/${MAILGUN_DOMAIN}/messages`;

  try {
    await axios.post(url, form, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 10000
    });
  } catch (err: any) {
    const message = err.response?.data?.message || err.message;
    // eslint-disable-next-line no-console
    console.error(`Mailgun API error (verification): ${message}`);
    throw new Error(`Verification email send failed: ${message}`);
  }
}

export async function sendAppointmentRequestEmail(
  payload: AppointmentEmailPayload
): Promise<void> {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN || !MAILGUN_FROM_EMAIL) {
    throw new Error("Mailgun not configured");
  }

  const { ownerName, ownerEmail } = payload;

  const start = new Date(payload.startIso);
  const end = new Date(payload.endIso);

  const tzLabel = payload.timezone ? ` (${payload.timezone})` : "";

  const subject = `Appointment Request: ${payload.requesterName} - ${start.toISOString()}${tzLabel}`;

  const bodyLines = [
    `You have received a new appointment request via CalAnywhere.\n`,
    `CALENDAR OWNER`,
    `- Name: ${ownerName}`,
    `- Email: ${ownerEmail}\n`,
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
    `- Confirm the time is still available in your calendar.`,
    `- Create an event in your calendar for the agreed slot.`,
    `- Reply directly to the requester at ${payload.requesterEmail} to confirm or propose alternatives.\n`,
    `ABOUT THIS EMAIL`,
    `This request was sent via CalAnywhere. No event has been created automatically; you remain in full control of your calendar.\n`,
    `If you no longer wish to receive requests via this link, simply stop sharing it or generate a new link.`
  ];

  const text = bodyLines.join("\n");

  const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64");

  const form = new URLSearchParams();
  form.append("from", MAILGUN_FROM_EMAIL);
  form.append("to", ownerEmail);
  form.append("subject", subject);
  form.append("text", text);

  const url = `${MAILGUN_API_BASE}/v3/${MAILGUN_DOMAIN}/messages`;

  try {
    await axios.post(url, form, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 10000
    });
  } catch (err: any) {
    const message = err.response?.data?.message || err.message;
    // eslint-disable-next-line no-console
    console.error(`Mailgun API error: ${message}`);
    throw new Error(`Email send failed: ${message}`);
  }
}

import "server-only";
import nodemailer from "nodemailer";

/**
 * Outgoing email. Locally this points at Mailpit (http://127.0.0.1:54324), so nothing leaves your computer.
 * Decision 7: the production provider (Resend or Postmark) plugs in here later through SMTP settings.
 */
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "127.0.0.1",
  port: Number(process.env.SMTP_PORT || 54325),
  secure: false,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

const FROM = process.env.EMAIL_FROM || "Amherst Woods Board <board@amherstwoods.local>";
export const SITE = process.env.SITE_URL || "http://localhost:3000";

export function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function layout(bodyHtml: string, link?: { href: string; label: string }) {
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#1C2826">
  <div style="font-weight:700;font-size:15px;color:#2E6A4F;margin-bottom:16px">Amherst Woods Neighborhood Association</div>
  ${bodyHtml}
  ${link ? `<p style="margin:24px 0"><a href="${SITE}${link.href}" style="background:#2E6A4F;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">${esc(link.label)}</a></p>` : ""}
  <p style="font-size:12px;color:#5B6A66;margin-top:32px">You get this because you're a member of the Amherst Woods portal.
  <a href="${SITE}/settings" style="color:#5B6A66">Change email settings</a>.</p></div>`;
}

type Mail = { subject: string; html: string; link?: { href: string; label: string } };

export async function sendEmail(to: string, mail: Mail) {
  try {
    await transport.sendMail({ from: FROM, to, subject: mail.subject, html: layout(mail.html, mail.link) });
    return true;
  } catch (err) {
    console.error("Email failed:", err);
    return false;
  }
}

/** One email per recipient so addresses stay private. Returns how many went out. */
export async function sendToMany(recipients: string[], mail: Mail) {
  let sent = 0;
  for (const to of recipients) if (await sendEmail(to, mail)) sent++;
  return sent;
}

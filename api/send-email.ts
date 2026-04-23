import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMailer } from "./_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    const { to, subject, html, text } = req.body;
    if (!to || !subject) { res.status(400).json({ error: "Missing to or subject" }); return; }
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      res.json({ success: true, message: "Email skipped (SMTP not configured)" }); return;
    }
    const mailer = getMailer();
    const info = await mailer.sendMail({
      from: `"Devaragudi Ethnic Threads" <${process.env.SMTP_USER}>`,
      to, subject, text, html,
    });
    res.json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    console.error("Email error:", err);
    res.status(500).json({ error: err.message });
  }
}

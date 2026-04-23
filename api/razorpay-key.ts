import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") { res.status(405).end(); return; }
  res.json({ key: process.env.RAZORPAY_KEY_ID });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRazorpay } from "./_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    const { amount, currency, receipt } = req.body;
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      res.status(500).json({ error: "Razorpay not configured" }); return;
    }
    if (!amount || amount <= 0) { res.status(400).json({ error: "Invalid amount" }); return; }
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: currency || "INR",
      receipt: String(receipt || "order").slice(0, 40),
    });
    res.json(order);
  } catch (err: any) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ error: err.message });
  }
}

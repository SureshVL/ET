import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getShiprocketToken } from "../_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    const { shiprocketOrderId } = req.body;
    if (!shiprocketOrderId) { res.status(400).json({ error: "Missing shiprocketOrderId" }); return; }
    if (!process.env.SHIPROCKET_EMAIL) { res.json({ success: true, mock: true }); return; }
    const token = await getShiprocketToken();
    const cancelRes = await fetch("https://apiv2.shiprocket.in/v1/external/orders/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: [shiprocketOrderId] }),
    });
    res.json({ success: cancelRes.ok, data: await cancelRes.json() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

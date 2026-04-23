import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZONES } from "../_lib";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    const { city, state, country, totalWeight } = req.body;
    let zone = "NATIONAL";
    if (country && country.toLowerCase() !== "india") zone = "INTERNATIONAL";
    else if (state && ["telangana", "ts"].includes(state.toLowerCase()))
      zone = city && city.toLowerCase() === "hyderabad" ? "LOCAL" : "REGIONAL";

    const info = ZONES[zone];
    const wt = Math.max(1, Math.ceil((totalWeight || 500) / 500));
    const rate = zone === "LOCAL" ? 0 : Math.round(info.rate * (1 + (wt - 1) * 0.15));

    res.json({
      rate,
      estimatedDelivery: info.days,
      zone,
      courierPartner: zone === "INTERNATIONAL" ? "DHL Express" : "Delhivery / Shiprocket",
      freeShipping: rate === 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

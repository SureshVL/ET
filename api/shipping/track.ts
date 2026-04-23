import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getShiprocketToken, SHIPROCKET_STATUS_MAP } from "../_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") { res.status(405).end(); return; }
  try {
    const awb = req.query.awb as string;
    if (!awb) { res.status(400).json({ error: "AWB required" }); return; }

    if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
      res.json({ status: "unknown", events: [], courierName: "", etd: "" }); return;
    }

    const token = await getShiprocketToken();
    const trackRes = await fetch(
      `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const trackData = await trackRes.json();
    const shipmentTrack = trackData?.tracking_data?.shipment_track?.[0] || {};
    const activities = trackData?.tracking_data?.shipment_track_activities || [];
    const rawStatus = (shipmentTrack?.current_status || "").toUpperCase();

    res.json({
      status: SHIPROCKET_STATUS_MAP[rawStatus] || "in_transit",
      rawStatus: shipmentTrack?.current_status || "",
      courierName: shipmentTrack?.courier_name || "",
      etd: shipmentTrack?.etd || "",
      events: activities.slice(0, 10).map((a: any) => ({
        date: a.date,
        activity: a.activity,
        location: a.location,
        status: SHIPROCKET_STATUS_MAP[(a["sr-status-label"] || "").toUpperCase()] || "in_transit",
      })),
    });
  } catch (err: any) {
    console.error("Track error:", err);
    res.status(500).json({ error: err.message });
  }
}

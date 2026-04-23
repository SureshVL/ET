import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb, SHIPROCKET_STATUS_MAP } from "../_lib";
import { FieldValue } from "firebase-admin/firestore";

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    // Read raw body manually (bodyParser disabled for webhook)
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const payload = JSON.parse(Buffer.concat(chunks).toString());

    const awb = payload?.awb || payload?.awb_code;
    const srStatus = (payload?.current_status || payload?.status || "").toUpperCase();
    const internalStatus = SHIPROCKET_STATUS_MAP[srStatus] || null;

    const adminDb = getAdminDb();
    if (awb && internalStatus && adminDb) {
      const snapshot = await adminDb.collection("orders")
        .where("trackingId", "==", awb).limit(1).get();
      if (!snapshot.empty) {
        const updateData: any = {
          shippingStatus: internalStatus,
          lastTrackingUpdate: FieldValue.serverTimestamp(),
        };
        if (internalStatus === "delivered") updateData.status = "delivered";
        else if (["in_transit", "picked_up", "out_for_delivery", "pickup_scheduled"].includes(internalStatus))
          updateData.status = "shipped";
        else if (["cancelled", "rto", "failed"].includes(internalStatus))
          updateData.status = "cancelled";
        await snapshot.docs[0].ref.update(updateData);
      }
    }
    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    res.status(200).json({ received: true }); // Always 200
  }
}

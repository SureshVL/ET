import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { getAdminDb } from "./_lib";
import { FieldValue } from "firebase-admin/firestore";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expected) {
      res.status(400).json({ status: "failure", message: "Invalid signature" }); return;
    }

    // Stock decrement + mark paid
    const adminDb = getAdminDb();
    if (adminDb && order_id) {
      try {
        const orderSnap = await adminDb.collection("orders").doc(order_id).get();
        if (orderSnap.exists) {
          const orderData = orderSnap.data()!;
          const batch = adminDb.batch();
          for (const item of (orderData.items || [])) {
            const productRef = adminDb.collection("products").doc(item.productId);
            batch.update(productRef, {
              [`stock.${String(item.size)}`]: FieldValue.increment(-item.quantity),
            });
          }
          batch.update(adminDb.collection("orders").doc(order_id), {
            paymentStatus: "paid",
            razorpayPaymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            updatedAt: FieldValue.serverTimestamp(),
          });
          await batch.commit();
        }
      } catch (e) {
        console.error("Stock decrement error (non-fatal):", e);
      }
    }

    res.json({ status: "success", message: "Payment verified" });
  } catch (err: any) {
    console.error("Verification error:", err);
    res.status(500).json({ error: err.message });
  }
}

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

dotenv.config();

// ── Firebase Admin ────────────────────────────────────────────────────────
let adminDb: ReturnType<typeof getFirestore> | null = null;
try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    }
    adminDb = getFirestore();
    console.log("✅ Firebase Admin SDK initialised");
  } else {
    console.warn("⚠️  Firebase Admin env vars missing — stock decrement disabled");
  }
} catch (e) {
  console.error("Firebase Admin init failed:", e);
}

// ── Razorpay ──────────────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// ── Nodemailer ────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// ── Shiprocket token cache ────────────────────────────────────────────────
let shiprocketToken: string | null = null;
let shiprocketTokenExpiry = 0;

async function getShiprocketToken(): Promise<string> {
  if (shiprocketToken && Date.now() < shiprocketTokenExpiry) return shiprocketToken;

  const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`Shiprocket login failed: ${res.status}`);
  const data = await res.json();
  shiprocketToken = data.token;
  shiprocketTokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23h (token valid 24h)
  return shiprocketToken as string;
}

// Shiprocket status → our internal status mapping
const SHIPROCKET_STATUS_MAP: Record<string, string> = {
  "NEW":                    "pending",
  "PICKUP SCHEDULED":       "pickup_scheduled",
  "PICKUP GENERATED":       "pickup_scheduled",
  "PICKED UP":              "picked_up",
  "IN TRANSIT":             "in_transit",
  "OUT FOR DELIVERY":       "out_for_delivery",
  "DELIVERED":              "delivered",
  "CANCELLED":              "cancelled",
  "RTO INITIATED":          "rto",
  "RTO DELIVERED":          "rto",
  "UNDELIVERED":            "failed",
};

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  // ── Webhook needs raw body ────────────────────────────────────────────
  app.use("/api/shipping/webhook", express.raw({ type: "application/json" }));
  app.use(express.json({ limit: "2mb" }));
  app.set("trust proxy", 1);

  // Simple rate limiter
  const rateMap = new Map<string, { count: number; reset: number }>();
  app.use((req, res, next) => {
    const ip = req.ip || "x";
    const now = Date.now();
    const e = rateMap.get(ip);
    if (!e || now > e.reset) { rateMap.set(ip, { count: 1, reset: now + 60000 }); }
    else { e.count++; if (e.count > 120) { res.status(429).json({ error: "Too many requests" }); return; } }
    next();
  });

  // ── Razorpay: public key ──────────────────────────────────────────────
  app.get("/api/razorpay-key", (_req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
  });

  // ── Razorpay: create order ────────────────────────────────────────────
  app.post("/api/create-razorpay-order", async (req, res) => {
    try {
      const { amount, currency, receipt } = req.body;
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        res.status(500).json({ error: "Razorpay not configured" }); return;
      }
      if (!amount || amount <= 0) { res.status(400).json({ error: "Invalid amount" }); return; }
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
  });

  // ── Razorpay: verify + stock decrement ────────────────────────────────
  app.post("/api/verify-razorpay-payment", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;
      const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(sign).digest("hex");
      if (razorpay_signature !== expected) {
        res.status(400).json({ status: "failure", message: "Invalid signature" }); return;
      }

      if (adminDb && order_id) {
        try {
          const orderSnap = await adminDb.collection("orders").doc(order_id).get();
          if (orderSnap.exists) {
            const orderData = orderSnap.data()!;
            const batch = adminDb.batch();
            for (const item of (orderData.items || [])) {
              const productRef = adminDb.collection("products").doc(item.productId);
              batch.update(productRef, { [`stock.${String(item.size)}`]: FieldValue.increment(-item.quantity) });
            }
            batch.update(adminDb.collection("orders").doc(order_id), {
              paymentStatus: "paid",
              razorpayPaymentId: razorpay_payment_id,
              razorpayOrderId: razorpay_order_id,
              updatedAt: FieldValue.serverTimestamp(),
            });
            await batch.commit();
          }
        } catch (e) { console.error("Stock decrement error (non-fatal):", e); }
      }
      res.json({ status: "success", message: "Payment verified" });
    } catch (err: any) {
      console.error("Verification error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Shipping: calculate rate ──────────────────────────────────────────
  const ZONES: Record<string, { rate: number; days: string }> = {
    LOCAL:         { rate: 0,    days: "1–2 days"   },
    REGIONAL:      { rate: 80,   days: "2–4 days"   },
    NATIONAL:      { rate: 150,  days: "4–7 days"   },
    INTERNATIONAL: { rate: 1200, days: "10–15 days" },
  };

  app.post("/api/shipping/calculate", (req, res) => {
    try {
      const { city, state, country, totalWeight } = req.body;
      let zone = "NATIONAL";
      if (country && country.toLowerCase() !== "india") zone = "INTERNATIONAL";
      else if (state && ["telangana", "ts"].includes(state.toLowerCase()))
        zone = city && city.toLowerCase() === "hyderabad" ? "LOCAL" : "REGIONAL";
      const info = ZONES[zone];
      const wt = Math.max(1, Math.ceil((totalWeight || 500) / 500));
      const rate = zone === "LOCAL" ? 0 : Math.round(info.rate * (1 + (wt - 1) * 0.15));
      res.json({ rate, estimatedDelivery: info.days, zone, courierPartner: zone === "INTERNATIONAL" ? "DHL Express" : "Delhivery / Shiprocket", freeShipping: rate === 0 });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Shiprocket: create shipment ───────────────────────────────────────
  app.post("/api/shipping/create", async (req, res) => {
    try {
      const { orderId, shippingAddress, items, customerName, phone, addressLine, city, state, pincode, totalAmount } = req.body;

      if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
        // Graceful fallback when Shiprocket not configured
        console.warn("Shiprocket not configured — returning mock response");
        res.json({
          success: true,
          trackingId: "SR" + Math.random().toString(36).slice(2, 10).toUpperCase(),
          labelUrl: "",
          courierPartner: "Delhivery",
          shiprocketOrderId: null,
          shiprocketShipmentId: null,
          mock: true,
        });
        return;
      }

      const token = await getShiprocketToken();
      const orderIdShort = orderId.slice(-8).toUpperCase();

      // 1. Create Shiprocket order
      const orderPayload = {
        order_id: `DEV-${orderIdShort}`,
        order_date: new Date().toISOString().split("T")[0],
        pickup_location: "Primary",
        channel_id: "",
        comment: "Devaragudi Ethnic Threads - Haridwar",
        billing_customer_name: customerName || "Customer",
        billing_last_name: "",
        billing_address: addressLine || shippingAddress?.split("\n")[1] || "",
        billing_address_2: "",
        billing_city: city || "Hyderabad",
        billing_pincode: pincode || "500001",
        billing_state: state || "Telangana",
        billing_country: "India",
        billing_email: "",
        billing_phone: phone || "9999999999",
        shipping_is_billing: true,
        order_items: items.map((item: any) => ({
          name: `${item.name} (Size: ${item.size})`,
          sku: `${item.productId}-${item.size}`,
          units: item.quantity,
          selling_price: item.price,
          discount: 0,
          tax: 0,
          hsn: 62069000, // HSN for men's ethnic garments
        })),
        payment_method: "Prepaid",
        shipping_charges: 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: 0,
        sub_total: totalAmount || items.reduce((a: number, i: any) => a + i.price * i.quantity, 0),
        length: 30,
        breadth: 25,
        height: 5,
        weight: Math.max(0.5, items.reduce((a: number, i: any) => a + i.quantity * 0.5, 0)),
      };

      const orderRes = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(orderPayload),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.shipment_id) {
        console.error("Shiprocket order creation failed:", orderData);
        res.status(500).json({ success: false, error: orderData.message || "Failed to create Shiprocket order" });
        return;
      }

      const shipmentId = orderData.shipment_id;
      const srOrderId = orderData.order_id;

      // 2. Generate AWB
      const awbRes = await fetch("https://apiv2.shiprocket.in/v1/external/courier/assign/awb", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shipment_id: shipmentId }),
      });
      const awbData = await awbRes.json();
      const awbCode = awbData?.response?.data?.awb_code || awbData?.awb_code || "";
      const courierName = awbData?.response?.data?.courier_name || "Delhivery";

      // 3. Schedule pickup
      const pickupDate = new Date();
      pickupDate.setDate(pickupDate.getDate() + 1);
      const pickupDateStr = pickupDate.toISOString().split("T")[0];

      await fetch("https://apiv2.shiprocket.in/v1/external/courier/generate/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shipment_id: [shipmentId], pickup_date: [pickupDateStr] }),
      });

      // 4. Generate label
      const labelRes = await fetch("https://apiv2.shiprocket.in/v1/external/courier/generate/label", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shipment_id: [shipmentId] }),
      });
      const labelData = await labelRes.json();
      const labelUrl = labelData?.label_url || "";

      res.json({
        success: true,
        trackingId: awbCode || `SR-${orderIdShort}`,
        labelUrl,
        courierPartner: courierName,
        shiprocketOrderId: srOrderId,
        shiprocketShipmentId: shipmentId,
        mock: false,
      });
    } catch (err: any) {
      console.error("Shipping create error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── Shiprocket: live tracking by AWB ─────────────────────────────────
  app.get("/api/shipping/track/:awb", async (req, res) => {
    try {
      const { awb } = req.params;
      if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
        res.json({ status: "unknown", events: [], courierName: "", etd: "" }); return;
      }
      const token = await getShiprocketToken();
      const trackRes = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const trackData = await trackRes.json();
      const shipmentTrack = trackData?.tracking_data?.shipment_track?.[0] || {};
      const activities = trackData?.tracking_data?.shipment_track_activities || [];

      const rawStatus = (shipmentTrack?.current_status || "").toUpperCase();
      const mappedStatus = SHIPROCKET_STATUS_MAP[rawStatus] || "in_transit";

      res.json({
        status: mappedStatus,
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
  });

  // ── Shiprocket: webhook (tracking updates pushed to us) ───────────────
  app.post("/api/shipping/webhook", async (req, res) => {
    try {
      // Shiprocket sends JSON — parse raw body
      const payload = JSON.parse(req.body.toString());
      const awb = payload?.awb || payload?.awb_code;
      const srStatus = (payload?.current_status || payload?.status || "").toUpperCase();
      const internalStatus = SHIPROCKET_STATUS_MAP[srStatus] || null;

      if (awb && internalStatus && adminDb) {
        // Find the order by trackingId (AWB) and update status
        const snapshot = await adminDb.collection("orders")
          .where("trackingId", "==", awb).limit(1).get();
        if (!snapshot.empty) {
          const orderRef = snapshot.docs[0].ref;
          const updateData: any = {
            shippingStatus: internalStatus,
            lastTrackingUpdate: FieldValue.serverTimestamp(),
          };
          // Map to our main status field
          if (internalStatus === "delivered") updateData.status = "delivered";
          else if (["in_transit", "picked_up", "out_for_delivery", "pickup_scheduled"].includes(internalStatus))
            updateData.status = "shipped";
          else if (["cancelled", "rto", "failed"].includes(internalStatus))
            updateData.status = "cancelled";

          await orderRef.update(updateData);
          console.log(`Webhook: Order updated — AWB ${awb} → ${internalStatus}`);
        }
      }
      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("Webhook error:", err);
      res.status(200).json({ received: true }); // Always 200 to Shiprocket
    }
  });

  // ── Shiprocket: cancel shipment ───────────────────────────────────────
  app.post("/api/shipping/cancel", async (req, res) => {
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
      const data = await cancelRes.json();
      res.json({ success: cancelRes.ok, data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Email ─────────────────────────────────────────────────────────────
  app.post("/api/send-email", async (req, res) => {
    try {
      const { to, subject, html, text } = req.body;
      if (!to || !subject) { res.status(400).json({ error: "Missing to or subject" }); return; }
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP not configured — skipping email"); res.json({ success: true }); return;
      }
      const info = await transporter.sendMail({
        from: `"Devaragudi Ethnic Threads" <${process.env.SMTP_USER}>`,
        to, subject, text, html,
      });
      res.json({ success: true, messageId: info.messageId });
    } catch (err: any) {
      console.error("Email error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Product feed ──────────────────────────────────────────────────────
  app.get("/api/products/feed", (_req, res) => {
    const base = process.env.APP_URL || "http://localhost:3000";
    res.set("Content-Type", "text/xml");
    res.send(`<?xml version="1.0"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>Devaragudi Ethnic Threads</title><link>${base}</link><description>Premium Ethnic Threads from Haridwar</description></channel></rss>`);
  });

  // ── Vite / static ─────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`✅  Server running on http://localhost:${PORT}`));
}

startServer();

// Shared utilities for all Vercel serverless functions
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Razorpay from "razorpay";
import nodemailer from "nodemailer";

// ── Firebase Admin (singleton) ───────────────────────────────────────────
export function getAdminDb() {
  try {
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      if (!getApps().length) {
        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          }),
        });
      }
      return getFirestore();
    }
  } catch (e) {
    console.error("Firebase Admin init failed:", e);
  }
  return null;
}

// ── Razorpay ─────────────────────────────────────────────────────────────
export function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
  });
}

// ── Nodemailer ────────────────────────────────────────────────────────────
export function getMailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// ── Shiprocket token (per-invocation — no in-memory cache in serverless) ──
export async function getShiprocketToken(): Promise<string> {
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
  return data.token;
}

// ── Shiprocket status map ─────────────────────────────────────────────────
export const SHIPROCKET_STATUS_MAP: Record<string, string> = {
  "NEW": "pending",
  "PICKUP SCHEDULED": "pickup_scheduled",
  "PICKUP GENERATED": "pickup_scheduled",
  "PICKED UP": "picked_up",
  "IN TRANSIT": "in_transit",
  "OUT FOR DELIVERY": "out_for_delivery",
  "DELIVERED": "delivered",
  "CANCELLED": "cancelled",
  "RTO INITIATED": "rto",
  "RTO DELIVERED": "rto",
  "UNDELIVERED": "failed",
};

// ── Shipping zones ────────────────────────────────────────────────────────
export const ZONES: Record<string, { rate: number; days: string }> = {
  LOCAL:         { rate: 0,    days: "1–2 days" },
  REGIONAL:      { rate: 80,   days: "2–4 days" },
  NATIONAL:      { rate: 150,  days: "4–7 days" },
  INTERNATIONAL: { rate: 1200, days: "10–15 days" },
};

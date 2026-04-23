# Devaragudi Ethnic Threads — Vercel Deployment Guide

## Architecture on Vercel

```
Vercel
├── dist/          ← Vite SPA (React frontend, served as static)
└── api/           ← Serverless Functions (Node.js 20)
    ├── razorpay-key.ts
    ├── create-razorpay-order.ts
    ├── verify-razorpay-payment.ts
    ├── send-email.ts
    ├── _lib.ts                    (shared utilities)
    ├── shipping/
    │   ├── calculate.ts
    │   ├── create.ts
    │   ├── track.ts
    │   ├── webhook.ts
    │   └── cancel.ts
    └── products/
        └── feed.ts
```

Firebase (Firestore + Auth + Storage) remains separate — Vercel only hosts your app code.

---

## Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — Devaragudi Ethnic Threads"
git remote add origin https://github.com/YOUR_USERNAME/devaragudi-ethnic-threads.git
git push -u origin main
```

---

## Step 2 — Deploy to Vercel

1. Go to vercel.com → New Project → Import from GitHub
2. Select your repository
3. Framework: **Other** (NOT Vite — we have custom vercel.json)
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Click **Deploy**

Vercel auto-detects `vercel.json` and `api/` folder.

---

## Step 3 — Add Environment Variables

Go to your Vercel project → **Settings → Environment Variables**
Add every variable from `.env.example`:

| Variable | Where to get it |
|---|---|
| `RAZORPAY_KEY_ID` | dashboard.razorpay.com → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Same as above |
| `GEMINI_API_KEY` | aistudio.google.com → Get API Key |
| `VITE_GEMINI_API_KEY` | Same key — needed for browser-side AI features |
| `SHIPROCKET_EMAIL` | Your Shiprocket login email |
| `SHIPROCKET_PASSWORD` | Your Shiprocket login password |
| `SMTP_HOST` | smtp.gmail.com |
| `SMTP_PORT` | 587 |
| `SMTP_SECURE` | false |
| `SMTP_USER` | yourstore@gmail.com |
| `SMTP_PASS` | Gmail App Password (16 chars) |
| `APP_URL` | https://shubhvastram.in (your domain) |
| `FIREBASE_PROJECT_ID` | Firebase Console → Project Settings |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → Service Accounts → Generate Key |
| `FIREBASE_PRIVATE_KEY` | Paste full key WITH quotes including \n characters |

⚠️ For `FIREBASE_PRIVATE_KEY`: paste the value exactly as it appears in the downloaded JSON file,
including the `-----BEGIN PRIVATE KEY-----` header and `\n` characters.

After adding variables → **Redeploy** from the Deployments tab.

---

## Step 4 — Custom Domain

1. Vercel → Settings → Domains → Add `shubhvastram.in`
2. At your domain registrar (GoDaddy/Namecheap), add:
   - **CNAME**: `www` → `cname.vercel-dns.com`
   - **A record**: `@` → `76.76.21.21`
3. SSL is automatic — takes ~2 minutes

---

## Step 5 — Firebase Setup

1. console.firebase.google.com → New project
2. **Authentication** → Google Sign-In
3. **Firestore** → Create database → paste `firestore.rules`
4. **Storage** → Enable → paste `storage.rules`
5. **Authorised domains**: Add your Vercel URL + custom domain
   - Firebase Console → Authentication → Settings → Authorised domains
   - Add: `your-app.vercel.app` and `shubhvastram.in`

---

## Step 6 — Razorpay Webhook

1. Razorpay Dashboard → Settings → Webhooks → Add:
   `https://shubhvastram.in/api/verify-razorpay-payment`
2. Events: `payment.captured`, `payment.failed`

---

## Step 7 — Shiprocket Setup

1. Sign up at app.shiprocket.in
2. Settings → Manage Pickup Addresses → Add "Primary" (your Haridwar address)
3. Webhook URL: `https://shubhvastram.in/api/shipping/webhook`

---

## Monthly Cost (10–100 orders/month)

| Service | Cost |
|---|---|
| Vercel Hobby | **₹0** (free forever for this scale) |
| Firebase Spark | **₹0** |
| Razorpay | 2% per transaction |
| Shiprocket | ₹26–45/shipment |
| Gmail SMTP | **₹0** |
| Domain | ~₹700/year |
| **Total fixed** | **₹0/month** |

Vercel Hobby supports:
- 100GB bandwidth/month
- Unlimited serverless function invocations
- Custom domain + SSL
- Automatic HTTPS

Well within limits for 10–100 orders/month.

---

## Vercel vs Render — Why Vercel wins for this app

| | Vercel | Render |
|---|---|---|
| Monthly cost | ₹0 | $7 (~₹580) |
| Cold starts | Yes (~200ms) — fine for this scale | No (always-on) |
| Deploy | Git push | Git push |
| Custom domain | ✓ Free | ✓ Free |
| SSL | ✓ Automatic | ✓ Automatic |
| Serverless functions | ✓ Built-in | ✗ (needs Express) |
| Express server | ✗ Not needed anymore | ✓ Required |

At 10–100 orders/month, cold starts on Vercel are imperceptible.
The ₹580/month saving is real money for a store at this scale.

---

## All Fixes in This Build

1. ✅ Express server → Vercel Serverless Functions (11 functions in api/)
2. ✅ Shiprocket full integration (create, AWB, pickup, label, track, webhook, cancel)
3. ✅ Firebase Storage for images (base64-in-Firestore eliminated)
4. ✅ Gemini model fixed (gemini-1.5-flash) + REST API in browser
5. ✅ Phone/pincode validation with +91 normalisation
6. ✅ Mobile filter drawer on Products page
7. ✅ Stock decrement after payment (Firebase Admin batch)
8. ✅ Razorpay payment verified server-side + clearCart only on success
9. ✅ TrackOrder: 6-stage live tracking + event timeline
10. ✅ onerror fallback on all product images
11. ✅ Checkout saves structured address fields for Shiprocket

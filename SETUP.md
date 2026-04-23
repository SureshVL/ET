# Devaragudi Ethnic Threads — Complete Setup Guide
# Follow these steps IN ORDER before deploying

---

## Step 1 — Create Your Firebase Project

1. Go to console.firebase.google.com → **Add project** → name it "devaragudi-ethnic-threads"
2. **Authentication** → Get started → Sign-in method → Enable **Google**
3. **Firestore Database** → Create database → Start in **production mode** → choose region: `asia-south1` (Mumbai)
4. Go to **Rules** tab → paste the entire contents of `firestore.rules` → Publish
5. **Storage** → Get started → **production mode** → same region
6. Go to **Rules** tab → paste the entire contents of `storage.rules` → Publish
7. **Project Settings** (gear icon) → **General** → scroll to "Your apps" → **Add app** → Web
8. Register app → copy the config object
9. Open `firebase-applet-config.json` and fill in your values:

```json
{
  "projectId": "devaragudi-ethnic-threads",
  "appId": "1:XXXXXXXXXX:web:XXXXXXXXXX",
  "apiKey": "AIzaSy...",
  "authDomain": "devaragudi-ethnic-threads.firebaseapp.com",
  "firestoreDatabaseId": "(default)",
  "storageBucket": "devaragudi-ethnic-threads.firebasestorage.app",
  "messagingSenderId": "XXXXXXXXXX",
  "measurementId": ""
}
```

10. **Service Account for Admin SDK**:
    - Project Settings → **Service accounts** → Generate new private key → Download JSON
    - Open the JSON file — you need: `project_id`, `client_email`, `private_key`

---

## Step 2 — Set Yourself as Admin

After your first login to the app:
1. Firebase Console → Firestore → `users` collection
2. Find your user document (it's your Firebase UID)
3. Edit the `role` field → change from `"customer"` to `"admin"`
4. Also set `VITE_ADMIN_EMAIL` env var to your login email so future first-logins get auto-promoted

---

## Step 3 — Create Razorpay Account

1. Sign up at dashboard.razorpay.com
2. Complete KYC (takes 2–3 business days for live payments)
3. Settings → API Keys → **Generate Test Key** (for testing now)
4. After KYC → Generate **Live Key** (for real payments)
5. Note down: `Key ID` (rzp_test_...) and `Key Secret`

---

## Step 4 — Create Shiprocket Account

1. Sign up free at app.shiprocket.in
2. Settings → Manage Pickup Addresses → **Add Pickup Address**:
   - Name: **Primary** (exact spelling — the API uses this)
   - Fill in your Haridwar warehouse address
3. Note down your Shiprocket **email** and **password** (used for API auth)

---

## Step 5 — Gmail App Password for Email

1. Gmail → Settings → Security → Turn on **2-Step Verification**
2. Settings → Security → **App passwords** → Select app: **Mail** → **Generate**
3. Copy the 16-character password (shown only once)

---

## Step 6 — Deploy to Vercel

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Devaragudi Ethnic Threads v1.0"
git remote add origin https://github.com/YOUR_USERNAME/devaragudi.git
git push -u origin main

# 2. Deploy
# Go to vercel.com → New Project → Import from GitHub → select your repo
# Framework Preset: Other
# Build Command: npm run build  
# Output Directory: dist
# → Deploy
```

---

## Step 7 — Add Environment Variables in Vercel

Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

Add each variable from `.env.example`. Key ones:

| Variable | Value |
|---|---|
| `VITE_ADMIN_EMAIL` | Your Google login email (for admin access) |
| `RAZORPAY_KEY_ID` | rzp_test_XXXX (switch to rzp_live_XXXX after KYC) |
| `RAZORPAY_KEY_SECRET` | Your Razorpay secret |
| `FIREBASE_PRIVATE_KEY` | Paste full key WITH quotes and literal `\n` characters |
| `VITE_GEMINI_API_KEY` | Your Gemini API key |
| `SHIPROCKET_EMAIL` | Your Shiprocket login email |
| `SHIPROCKET_PASSWORD` | Your Shiprocket password |

After adding all variables → **Redeploy** from the Deployments tab.

---

## Step 8 — Add Authorised Domains to Firebase

Firebase Console → Authentication → **Settings** → **Authorised domains** → Add:
- `your-project.vercel.app`
- `shubhvastram.in` (your custom domain)

Without this, Google Sign-In will fail with `auth/unauthorized-domain`.

---

## Step 9 — Custom Domain

1. Vercel → Settings → **Domains** → Add `shubhvastram.in`
2. At your registrar (GoDaddy/Namecheap), add DNS records:
   - **A record**: `@` → `76.76.21.21`
   - **CNAME**: `www` → `cname.vercel-dns.com`
3. SSL auto-provisions in 2–3 minutes

---

## Step 10 — Razorpay Webhook

1. Razorpay Dashboard → Settings → **Webhooks** → Add webhook:
   - URL: `https://shubhvastram.in/api/verify-razorpay-payment`
   - Events: `payment.captured`, `payment.failed`
2. Save webhook secret (if generated) — not required for basic signature verification

---

## Step 11 — Shiprocket Webhook

1. Shiprocket Dashboard → Settings → **Webhooks** (or API settings)
2. Add webhook URL: `https://shubhvastram.in/api/shipping/webhook`
3. This gives you automatic tracking updates without polling

---

## Step 12 — Add First Products (Admin)

1. Login to your site with your admin email
2. Go to `/admin` → **Add Product** tab
3. Fill in name, price, category, sizes, stock per size
4. Upload product images (they'll go to Firebase Storage automatically)
5. Use AI Description button to generate product copy
6. Save — product appears in the store immediately

---

## Verify Everything Works

Test in this order:
- [ ] Home page loads with products
- [ ] Google Sign-In works
- [ ] Add to cart works
- [ ] Checkout form validates
- [ ] Razorpay payment modal opens (use test card: 4111 1111 1111 1111)
- [ ] Order appears in Firestore after payment
- [ ] Admin dashboard shows the order
- [ ] "Ship Order" button creates Shiprocket shipment
- [ ] Track Order page shows live tracking
- [ ] Email confirmation received

---

## Monthly Costs

| Service | Cost |
|---|---|
| Vercel Hobby | ₹0 free forever |
| Firebase Spark (Firestore + Auth + Storage) | ₹0 free tier |
| Razorpay | 2% per transaction only |
| Shiprocket | ₹38–65 per shipment (incl. GST + fuel surcharge) |
| Gmail SMTP | ₹0 |
| Domain shubhvastram.in | ~₹60/month (₹700/year) |
| **Total fixed cost** | **₹60/month** |

At 50 orders × ₹2,000 avg = ₹1,00,000 revenue
Razorpay 2% = ₹2,000  
Shipping 50 × ₹50 avg = ₹2,500  
Platform = ₹60  
**Net = ₹95,440/month**

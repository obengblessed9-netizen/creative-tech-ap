# Vercel & Supabase Deployment Guide

This guide walks you through deploying your React-Vite application to **Vercel** and linking it with your hosted **Supabase** backend.

---

## 📋 Prerequisites
Before you start, make sure you have:
1. A **GitHub** account with this project pushed to a repository.
2. A **Vercel** account (connected to your GitHub account).
3. A **Supabase** account with your project already set up.

---

## 🛠️ Step 1: Push Code to GitHub

```bash
git init
git add .
git commit -m "feat: initial commit for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

---

## 🚀 Step 2: Deploy to Vercel

1. Log in to the [Vercel Dashboard](https://vercel.com/).
2. Click **Add New** > **Project**.
3. Import your repository from GitHub.
4. Vercel auto-detects **Vite** — no manual framework config needed (already set in `vercel.json`).
5. Expand the **Environment Variables** section and add **all** of these:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://wrqmeyjmlrnnxvrhlact.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | *(your anon key from Supabase dashboard)* |
| `VITE_SUPABASE_PROJECT_ID` | `wrqmeyjmlrnnxvrhlact` |
| `VITE_PAYSTACK_PUBLIC_KEY` | *(your Paystack public key)* |

> ⚠️ **Never** add `PAYSTACK_SECRET_KEY` or any secret key to Vercel environment variables for a frontend app. Those belong in Supabase Edge Function secrets only.

6. Click **Deploy**.

---

## ⚡ Step 3: Configure Supabase Redirect URLs

After Vercel gives you a production URL (e.g. `https://your-app.vercel.app`):

1. Open your [Supabase Dashboard](https://supabase.com/dashboard/project/wrqmeyjmlrnnxvrhlact).
2. Navigate to **Authentication** → **URL Configuration**.
3. Update:
   - **Site URL:** `https://your-app.vercel.app`
   - **Redirect URLs:** Add `https://your-app.vercel.app/**`
4. Click **Save**.

---

## 🔍 Step 4: Verify Deployment

1. Visit your Vercel deployment URL.
2. Navigate to `/gallery`, `/artists`, and other sub-routes — they should NOT return 404 errors (handled by `vercel.json` rewrites).
3. Sign up / sign in with a real email and password to verify Supabase connectivity.
4. Check the browser console for any missing `VITE_*` environment variables.

---

## 💳 Step 5: Configure Payment Gateways (Supabase Edge Functions)

Secret keys go into Supabase, NOT Vercel:

### Paystack
```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your_key
supabase functions deploy paystack-init
supabase functions deploy paystack-verify
supabase functions deploy paystack-webhook
```

### PaySwitch (TheTeller)
```bash
supabase secrets set PAYSWITCH_MERCHANT_ID=your_merchant_id
supabase secrets set PAYSWITCH_API_USER=your_api_user
supabase secrets set PAYSWITCH_API_KEY=your_api_key
supabase functions deploy payswitch-init
supabase functions deploy payswitch-verify
```

---

## 🔄 Step 6: Automatic Re-deploys

Every `git push` to your `main` branch will automatically trigger a new Vercel deployment. No manual steps needed after initial setup.

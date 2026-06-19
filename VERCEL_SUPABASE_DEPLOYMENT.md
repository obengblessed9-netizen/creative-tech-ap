# Vercel & Supabase Deployment Guide

This guide walks you through deploying your React-Vite application to **Vercel** and linking it with your hosted **Supabase** backend.

---

## 📋 Prerequisites
Before you start, make sure you have:
1. A **GitHub** account.
2. A **Vercel** account (connected to your GitHub account).
3. A **Supabase** account (already configured with your project database).

---

## 🛠️ Step 1: Initialize Git and Push to GitHub

If you haven't pushed your code to GitHub yet, run these commands in your project directory:

```bash
# 1. Initialize local repository
git init

# 2. Add all files to staging
git add .

# 3. Commit your changes
git commit -m "feat: initial commit for deployment"

# 4. Create a main branch
git branch -M main

# 5. Add your remote repository link (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 6. Push code to GitHub
git push -u origin main
```

---

## 🚀 Step 2: Deploy to Vercel

1. Log in to the [Vercel Dashboard](https://vercel.com/).
2. Click **Add New** > **Project**.
3. Import your project repository from GitHub.
4. Under **Framework Preset**, Vercel will automatically detect **Vite**.
5. Expand the **Environment Variables** section and add the following two key-value pairs (copied from your `.env` file):
   * **`VITE_SUPABASE_URL`**: `https://qihbotixvrmabjblxgvc.supabase.co`
   * **`VITE_SUPABASE_PUBLISHABLE_KEY`**: `your_publishable_key_here`
6. Click **Deploy**. Vercel will build the project and assign a production URL (e.g., `https://creative-tech-app.vercel.app`).

---

## ⚡ Step 3: Configure Supabase redirect URLs

Because you are using a custom domain (the `.vercel.app` URL), you must tell Supabase to allow redirects to this domain, otherwise OAuth and email verification redirects will fail.

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project: **`qihbotixvrmabjblxgvc`**.
3. Navigate to **Authentication** > **URL Configuration** (under Settings).
4. Update the fields:
   * **Site URL:** Change this to your new Vercel production URL (e.g., `https://creative-tech-app.vercel.app`).
   * **Redirect URLs:** Click **Add URL** and add your production URL as an allowed redirect:
     `https://creative-tech-app.vercel.app`
5. Click **Save**.

---

## 🌐 Step 4: Configure Google & Apple OAuth (Production)

If you configure production Google/Apple OAuth to replace the sandbox bypass:
1. Go to your **Google Cloud Console** / **Apple Developer Console**.
2. Update the **Authorized redirect URIs** or **Return URLs** to include your Supabase Callback URI:
   * `https://qihbotixvrmabjblxgvc.supabase.co/auth/v1/callback`
3. Enter your Production Client ID and Client Secret in the Supabase Dashboard under **Authentication** > **Providers** > **Google** / **Apple** and toggle **Enable Auth** to **ON**.

---

## 🔍 Step 5: Verify Deployment
1. Visit your Vercel deployment URL.
2. Verify that you can view the gallery collection, browse items, and navigate between sub-routes without 404 errors (handled by the newly created [vercel.json](file:///c:/Users/obeng/Desktop/creative-tech-app-2c0e0e8f-main/vercel.json)).
3. Test signing up/signing in using a real email and password to verify database read/write connectivity.

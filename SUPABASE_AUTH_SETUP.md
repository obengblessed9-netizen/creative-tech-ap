# Supabase OAuth Setup Guide

If you encountered the following error when trying to use Google or Apple Sign-In:
```json
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: missing OAuth secret"}
```
It means the OAuth provider has not been configured in your Supabase project dashboard. Because authentication settings are managed on the server side, you must add your credentials there.

Follow the steps below to configure the providers for the project: **`qihbotixvrmabjblxgvc`**.

---

## 🔑 Common Information Needed
* **Your Supabase Project URL:** `https://qihbotixvrmabjblxgvc.supabase.co`
* **OAuth Callback URL (Redirect URI):** `https://qihbotixvrmabjblxgvc.supabase.co/auth/v1/callback`

---

## 🌐 Google OAuth Setup

1. **Create/Select a Google Cloud Project:**
   * Go to the [Google Cloud Console](https://console.cloud.google.com/).
   * Create a new project or select an existing one.

2. **Configure the OAuth Consent Screen:**
   * Navigate to **APIs & Services** > **OAuth consent screen**.
   * Choose **External** (unless you only want users from your Google Workspace) and click **Create**.
   * Fill out the required App name, Support email, and Developer contact information.
   * Click **Save and Continue** until you reach the dashboard. Make sure to publish the app (change status from "Testing" to "In production" if you want anyone to log in, or keep it in testing and add your test email as a test user).

3. **Create OAuth 2.0 Credentials:**
   * Go to **APIs & Services** > **Credentials**.
   * Click **Create Credentials** > **OAuth client ID**.
   * Set **Application type** to **Web application**.
   * Under **Authorized redirect URIs**, click **Add URI** and enter:
     `https://qihbotixvrmabjblxgvc.supabase.co/auth/v1/callback`
   * Click **Create**.
   * Copy the generated **Client ID** and **Client Secret**.

4. **Enable Provider in Supabase:**
   * Go to your [Supabase Dashboard](https://supabase.com/dashboard).
   * Open the project **`qihbotixvrmabjblxgvc`**.
   * Navigate to **Authentication** > **Providers** (under Settings).
   * Find **Google** in the list and click to expand.
   * Toggle **Enable Google Auth** to **ON**.
   * Paste the **Client ID** and **Client Secret** you copied from the Google Cloud Console.
   * Click **Save**.

---

## 🍎 Apple OAuth Setup

1. **Register an App ID on Apple Developer Portal:**
   * Log in to the [Apple Developer Account](https://developer.apple.com/).
   * Go to **Certificates, Identifiers & Profiles** > **Identifiers**.
   * Click the **+** (plus) icon to register a new Identifier.
   * Select **App IDs**, choose **App**, and enter a description and Bundle ID (e.g. `com.creative.tech.app`).
   * Under **Capabilities**, check **Sign In with Apple**. Click **Continue** and then **Register**.

2. **Create a Service ID (for Web Authentication):**
   * Go back to **Identifiers**.
   * Click **+** (plus) and select **Services IDs**.
   * Enter a Description and an Identifier (e.g., `com.creative.tech.app.signin`).
   * Click **Continue** and **Register**.
   * Select the newly created Service ID, check the **Sign In with Apple** box, and click **Configure**.
   * Set the **Primary App ID** to the App ID you created in step 1.
   * Under **Domains and Subdomains**, enter:
     `qihbotixvrmabjblxgvc.supabase.co`
   * Under **Return URLs**, enter:
     `https://qihbotixvrmabjblxgvc.supabase.co/auth/v1/callback`
   * Click **Next**, **Done**, **Continue**, and **Save**.

3. **Generate a Sign in with Apple Key (Private Key):**
   * Go to **Keys** in the sidebar.
   * Click **+** (plus) to register a new Key.
   * Enter a Key Name, check the **Sign In with Apple** box, and click **Configure**.
   * Select the Primary App ID you created in step 1 and click **Save**.
   * Click **Continue** and then **Register**.
   * Download the key (`.p8` file) and write down your **Key ID**. *(Note: You can only download this key once, so keep it secure).*

4. **Enable Provider in Supabase:**
   * Go to your [Supabase Dashboard](https://supabase.com/dashboard).
   * Open the project **`qihbotixvrmabjblxgvc`**.
   * Navigate to **Authentication** > **Providers**.
   * Find **Apple** in the list and expand it.
   * Toggle **Enable Apple Auth** to **ON**.
   * Enter your:
     * **Services ID (Client ID):** The Service ID Identifier (e.g. `com.creative.tech.app.signin`).
     * **Team ID:** Found in the top-right corner of your Apple Developer console.
     * **Key ID:** The 10-character Key ID from step 3.
     * **Secret Key (Private Key):** Open the `.p8` file you downloaded in a text editor and paste the entire contents here.
   * Click **Save**.

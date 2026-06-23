// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";

// Declare Deno to prevent TS errors in non-Deno IDE environments
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pad amount to 12 digits (e.g., 100 GHS -> 000000010000)
const padAmount = (amount: number) => {
  const amountInPesewas = Math.round(amount * 100);
  return amountInPesewas.toString().padStart(12, "0");
};

// Generate a random 12 character transaction ID
const generateTransactionId = () => {
  return Math.random().toString(36).substring(2, 14).toUpperCase();
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const email = claims.claims.email as string;
    const userId = claims.claims.sub as string;

    const { amount, currency = "GHS", callback_url, metadata } = await req.json();
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const merchantId = Deno.env.get("PAYSWITCH_MERCHANT_ID");
    const apiUser = Deno.env.get("PAYSWITCH_API_USER");
    const apiKey = Deno.env.get("PAYSWITCH_API_KEY");
    
    if (!merchantId || !apiUser || !apiKey) {
      return new Response(JSON.stringify({ error: "PaySwitch not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const transactionId = generateTransactionId();
    const authString = btoa(`${apiUser}:${apiKey}`);

    const res = await fetch("https://prod.theteller.net/checkout/initiate", {
      method: "POST",
      headers: { 
        "Authorization": `Basic ${authString}`, 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify({
        merchant_id: merchantId,
        transaction_id: transactionId,
        desc: "Artwork Purchase",
        amount: padAmount(amount),
        return_url: callback_url,
        redirect_url: callback_url,
        email: email,
      }),
    });
    const data = await res.json();
    if (!res.ok || data?.status !== "success" && data?.code !== "200") {
      return new Response(JSON.stringify({ error: data?.reason || "Init failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Record pending transaction (service role bypasses RLS)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin.from("payswitch_transactions").upsert(
      {
        reference: transactionId,
        user_id: userId,
        email,
        amount,
        currency,
        status: "pending",
        metadata,
      },
      { onConflict: "reference" },
    );

    return new Response(JSON.stringify({ authorization_url: data.checkout_url, reference: transactionId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

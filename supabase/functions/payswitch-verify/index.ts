// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";

// Declare Deno to prevent TS errors in non-Deno IDE environments
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { reference } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const merchantId = Deno.env.get("PAYSWITCH_MERCHANT_ID");
    const apiUser = Deno.env.get("PAYSWITCH_API_USER");
    const apiKey = Deno.env.get("PAYSWITCH_API_KEY");

    if (!merchantId || !apiUser || !apiKey) {
      return new Response(JSON.stringify({ error: "PaySwitch not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authString = btoa(`${apiUser}:${apiKey}`);

    const res = await fetch(`https://prod.theteller.net/v1.1/users/transactions/${reference}/status`, {
      method: "GET",
      headers: {
        "Merchant-Id": merchantId,
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/json",
      },
    });
    
    const tx = await res.json();

    const isSuccess = tx?.status === "approved" || tx?.code === "000";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin.from("payswitch_transactions").upsert(
      {
        reference,
        status: isSuccess ? "success" : "failed",
        payswitch_response: tx,
      },
      { onConflict: "reference" },
    );

    return new Response(JSON.stringify({ success: isSuccess, reference, amount: tx?.amount ? parseFloat(tx.amount) / 100 : null, currency: "GHS", data: tx }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

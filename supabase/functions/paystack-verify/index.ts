import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { reference } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) {
      return new Response(JSON.stringify({ error: "Paystack not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const data = await res.json();
    const tx = data?.data;
    const status = tx?.status;

    // Update DB so order status is reflected even if webhook hasn't arrived yet
    if (tx?.reference) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await admin.from("paystack_transactions").upsert(
        {
          reference: tx.reference,
          email: tx.customer?.email ?? null,
          amount: tx.amount ? tx.amount / 100 : 0,
          currency: tx.currency ?? "GHS",
          status: status === "success" ? "success" : status || "pending",
          paystack_response: tx,
          metadata: tx.metadata ?? null,
        },
        { onConflict: "reference" },
      );
    }

    return new Response(JSON.stringify({
      success: status === "success",
      status,
      amount: tx?.amount ? tx.amount / 100 : null,
      currency: tx?.currency,
      reference: tx?.reference,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

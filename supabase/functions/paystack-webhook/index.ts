import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) return new Response("Not configured", { status: 500 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");

  if (!signature || signature !== expected) {
    console.warn("Invalid Paystack signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const data = event?.data || {};
  const reference: string | undefined = data.reference;
  if (!reference) return new Response("ok", { status: 200 });

  let status = "pending";
  switch (event.event) {
    case "charge.success":
      status = "success";
      break;
    case "charge.failed":
      status = "failed";
      break;
    case "transfer.success":
    case "transfer.failed":
    case "transfer.reversed":
      status = event.event.replace("transfer.", "");
      break;
    default:
      status = data.status || "pending";
  }

  const { error } = await admin
    .from("paystack_transactions")
    .upsert(
      {
        reference,
        email: data.customer?.email ?? null,
        amount: data.amount ? Number(data.amount) / 100 : 0,
        currency: data.currency ?? "GHS",
        status,
        paystack_response: data,
        metadata: data.metadata ?? null,
      },
      { onConflict: "reference" },
    );

  if (error) {
    console.error("Webhook upsert error", error);
    return new Response("DB error", { status: 500 });
  }

  console.log(`Paystack webhook processed: ${event.event} ${reference} -> ${status}`);
  return new Response("ok", { status: 200 });
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { selfie_base64, id_card_base64 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!selfie_base64 || !id_card_base64) {
      return new Response(JSON.stringify({ error: "Both selfie and ID card images are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `You are an identity verification assistant. You will receive two images:
1. A selfie/video frame of a person
2. A national ID card or government-issued identification

Your task is to:
- Check if the ID card appears to be a valid government-issued document
- Compare the face in the selfie with the photo on the ID card
- Determine if they appear to be the same person

Respond ONLY with a JSON object (no markdown):
{
  "is_valid_id": boolean,
  "faces_match": boolean,
  "confidence": "high" | "medium" | "low",
  "id_type": string,
  "name_on_id": string or null,
  "reason": string
}`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Please verify this identity. Compare the selfie with the ID card photo." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${selfie_base64}` } },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${id_card_base64}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Verification service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";
    
    // Parse AI response
    let result;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      result = { is_valid_id: false, faces_match: false, confidence: "low", reason: "Could not process verification" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-identity error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

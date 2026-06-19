// Suggests a tasteful canvas background for a drawing based on category/description/style.
// Uses Lovable AI Gateway. Returns { color, name, reason }.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACK = { color: "#ffffff", name: "Clean white", reason: "Neutral default that works for any subject." };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { category, description, style } = await req.json().catch(() => ({}));
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify(FALLBACK), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt =
      `You're an art director. Suggest ONE canvas background color for an artwork.\n` +
      `Category: ${category || "unspecified"}\n` +
      `Style/medium notes: ${style || "unspecified"}\n` +
      `Subject/description: ${description || "unspecified"}\n` +
      `Return strict JSON: {"color":"#rrggbb","name":"short name","reason":"<=80 chars"}.\n` +
      `Choose something tasteful that helps the subject pop — not pure white unless truly best.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You output only minified JSON. No prose." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (r.status === 429 || r.status === 402) {
      return new Response(JSON.stringify({ ...FALLBACK, error: r.status === 429 ? "rate_limited" : "no_credits" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) return new Response(JSON.stringify(FALLBACK), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await r.json();
    const txt: string = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(txt); } catch { parsed = {}; }
    const color = typeof parsed.color === "string" && /^#[0-9a-f]{6}$/i.test(parsed.color) ? parsed.color : FALLBACK.color;
    const name = typeof parsed.name === "string" ? parsed.name.slice(0, 40) : FALLBACK.name;
    const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 120) : FALLBACK.reason;

    return new Response(JSON.stringify({ color, name, reason }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify(FALLBACK), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

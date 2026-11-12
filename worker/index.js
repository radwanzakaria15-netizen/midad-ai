/**
 * MIDAD AI LAB — Cloudflare Worker API scaffold
 * No generation provider is configured yet. Never return fabricated outputs.
 */
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" }
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "Content-Type,Authorization"
      }});
    }
    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "MIDAD AI LAB API", version: "0.1.0", generationReady: false });
    }
    if (url.pathname === "/api/generate" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
      const allowed = ["text", "image", "audio", "video"];
      if (!allowed.includes(body.type)) return json({ error: "Unsupported generation type" }, 400);
      if (typeof body.prompt !== "string" || !body.prompt.trim()) return json({ error: "Prompt is required" }, 400);
      // Provider integration will be added after choosing a compatible model and runtime.
      return json({
        error: "GENERATION_NOT_CONFIGURED",
        message: "لم يتم إعداد مزود نموذج لهذه المهمة بعد.",
        requestedType: body.type
      }, 503);
    }
    return json({ error: "Not found" }, 404);
  }
};

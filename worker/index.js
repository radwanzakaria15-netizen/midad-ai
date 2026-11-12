/**
 * MIDAD AI LAB — Cloudflare Worker API
 * Text generation is powered by Cloudflare Workers AI.
 */
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "Content-Type,Authorization"
  }
});

function extractText(result) {
  if (typeof result === "string") return result;
  if (typeof result?.response === "string") return result.response;
  const choice = result?.choices?.[0];
  if (typeof choice?.message?.content === "string") return choice.message.content;
  if (typeof choice?.text === "string") return choice.text;
  return "";
}

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
      return json({
        ok: true,
        service: "MIDAD AI LAB API",
        version: "0.3.0",
        textGenerationReady: Boolean(env.AI),
        imageGenerationReady: Boolean(env.AI)
      });
    }

    if (url.pathname === "/api/generate" && request.method === "POST") {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: "Invalid JSON body" }, 400); }

      const allowed = ["text", "image", "audio", "video"];
      if (!allowed.includes(body.type)) return json({ error: "Unsupported generation type" }, 400);
      if (typeof body.prompt !== "string" || !body.prompt.trim()) {
        return json({ error: "Prompt is required" }, 400);
      }

      if (body.type === "image") {
        if (!env.AI) {
          return json({ error: "AI_BINDING_MISSING", message: "لم يتم تفعيل ربط Workers AI في إعدادات Cloudflare." }, 503);
        }
        if (body.prompt.trim().length > 1800) {
          return json({ error: "PROMPT_TOO_LONG", message: "اختصر وصف الصورة إلى 1800 حرف." }, 400);
        }
        try {
          const languageNames = { ar: "العربية", en: "الإنجليزية", fr: "الفرنسية" };
          const language = languageNames[body.language] || "العربية";
          const translated = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
            messages: [
              { role: "system", content: "Convert the user's request into one detailed, visual English prompt for a text-to-image model. Preserve the exact subject and educational meaning. Do not add text, labels, letters, logos, watermarks, or unrelated objects. Return only the image prompt." },
              { role: "user", content: "User description (" + language + "): " + body.prompt.trim() }
            ],
            max_completion_tokens: 350,
            chat_template_kwargs: { enable_thinking: false }
          });
          const imagePrompt = extractText(translated) || body.prompt.trim();
          const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
            prompt: imagePrompt.slice(0, 2048),
            steps: 8
          });
          if (!result?.image) {
            return json({ error: "EMPTY_IMAGE_RESPONSE", message: "لم يُرجع محرك الصور صورة. حاول بوصف أبسط." }, 502);
          }
          return json({
            ok: true,
            type: "image",
            model: "@cf/black-forest-labs/flux-1-schnell",
            output: "تم إنشاء الصورة بنجاح.",
            image: "data:image/jpeg;base64," + result.image
          });
        } catch (error) {
          return json({
            error: "IMAGE_GENERATION_FAILED",
            message: "تعذر إنشاء الصورة حالياً. قد تكون هناك حدود استخدام أو مشكلة مؤقتة.",
            detail: String(error?.message || error).slice(0, 300)
          }, 502);
        }
      }

      if (body.type !== "text") {
        return json({
          error: "MODEL_NOT_CONNECTED",
          message: "محرك هذه الوحدة لم يُربط بعد.",
          requestedType: body.type
        }, 501);
      }

      if (!env.AI) {
        return json({
          error: "AI_BINDING_MISSING",
          message: "لم يتم تفعيل ربط Workers AI في إعدادات Cloudflare."
        }, 503);
      }

      try {
        const languageNames = { ar: "العربية", en: "الإنجليزية", fr: "الفرنسية" };
        const language = languageNames[body.language] || "العربية";
        const result = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
          messages: [
            {
              role: "system",
              content: "أنت مساعد ذكي متقن للغة العربية. أجب بوضوح ودقة، ونظم الإجابة بعناوين ونقاط عند الحاجة. أخرج المحتوى باللغة المطلوبة في طلب المستخدم."
            },
            {
              role: "user",
              content: "اكتب الإجابة باللغة " + language + ".\n\n" + body.prompt.trim()
            }
          ],
          max_completion_tokens: 1800,
          chat_template_kwargs: { enable_thinking: false }
        });

        const output = extractText(result);
        if (!output) {
          return json({ error: "EMPTY_MODEL_RESPONSE", message: "لم يُرجع النموذج نصاً. حاول مرة أخرى." }, 502);
        }
        return json({ ok: true, type: "text", model: "@cf/zai-org/glm-4.7-flash", output });
      } catch (error) {
        return json({
          error: "MODEL_REQUEST_FAILED",
          message: "تعذر تنفيذ الطلب حالياً. تحقق من تفعيل Workers AI وحدود الاستخدام.",
          detail: String(error?.message || error).slice(0, 300)
        }, 502);
      }
    }

    return json({ error: "Not found" }, 404);
  }
};

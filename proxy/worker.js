// Stella AI — Safe OpenRouter Proxy (Cloudflare Worker)
// Хранит OPENROUTER_API_KEY безопасно на сервере (env.OPENROUTER_API_KEY),
// не раскрывая ключ в коде расширения. Готов для подключения оплаты и лимитов.

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Stella-License",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    const body = await request.text();
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://stella-ai.app",
        "X-Title": "Stella AI Proxy",
      },
      body,
    });

    const respText = await upstream.text();
    return new Response(respText, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};

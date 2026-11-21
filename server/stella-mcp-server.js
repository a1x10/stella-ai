// Stella AI — Official MCP HTTP Server (JSON-RPC 2.0) for your VPS
// Запускайте за Cloudflare Tunnel (cloudflared), чтобы полностью скрыть реальный IP сервера!
// Авторизованный доступ по Bearer-токену (STELLA_MCP_SECRET).

const http = require("http");

const PORT = Number(process.env.PORT || 8790);
const SECRET = process.env.STELLA_MCP_SECRET || "";

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, protocol: "MCP-HTTP-JSONRPC-2.0", service: "Stella VPS MCP Server" }));
    return;
  }

  if (SECRET) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${SECRET}`) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
  }

  let raw = "";
  for await (const chunk of req) raw += chunk;
  const rpc = JSON.parse(raw || "{}");

  if (rpc.method === "tools/list") {
    res.writeHead(200);
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      id: rpc.id,
      result: {
        tools: [
          { name: "stella_dispatch", description: "Принимает результат облачной задачи Стеллы и выполняет серверный сценарий" }
        ]
      }
    }));
    return;
  }

  if (rpc.method === "tools/call") {
    console.log(`[Stella MCP] Tool call: ${rpc.params?.name}`, rpc.params?.arguments);
    res.writeHead(200);
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      id: rpc.id,
      result: {
        content: [{ type: "text", text: "Принято сервером Stella MCP OK" }]
      }
    }));
    return;
  }

  res.writeHead(400);
  res.end(JSON.stringify({ jsonrpc: "2.0", id: rpc.id || null, error: { code: -32601, message: "Method not found" } }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Stella MCP Server listening on http://127.0.0.1:${PORT} (expose via cloudflared tunnel to hide IP)`);
});

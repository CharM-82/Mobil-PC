import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { decode, encode } from "./protocol.js";

const root = fileURLToPath(new URL("./public", import.meta.url));
const port = Number(process.env.PORT || 3000);
const token = process.env.POCKET_TOKEN || "dev";
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const file = pathname === "/" ? "index.html" : pathname.slice(1);
  try {
    const body = await readFile(join(root, file));
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});

const wss = new WebSocketServer({ server });
let agent = null;
const phones = new Set();
const send = (ws, type, payload) => ws?.readyState === WebSocket.OPEN && ws.send(encode(type, payload));
const broadcast = (type, payload) => phones.forEach((ws) => send(ws, type, payload));

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://localhost");
  if (url.searchParams.get("token") !== token) return ws.close(1008, "Bad token");
  const role = url.searchParams.get("role");
  if (role === "agent") {
    agent?.close(1012, "Replaced");
    agent = ws;
    broadcast("presence", { online: true });
  } else {
    phones.add(ws);
    send(ws, "presence", { online: agent?.readyState === WebSocket.OPEN });
  }

  ws.on("message", (raw) => {
    const message = decode(raw);
    if (!message) return;
    if (role === "agent") broadcast(message.type, message);
    else if (agent?.readyState === WebSocket.OPEN) agent.send(encode(message.type, message));
    else send(ws, "error", { message: "电脑未连接" });
  });
  ws.on("close", () => {
    phones.delete(ws);
    if (ws === agent) {
      agent = null;
      broadcast("presence", { online: false });
    }
  });
});

server.listen(port, "0.0.0.0", () => console.log(`Codex Pocket listening on :${port}`));

import { WebSocketServer } from "ws";
import { readFileSync } from "node:fs";

const speed = Number(process.argv[2] ?? 4);
const port = 8765;
const items = JSON.parse(readFileSync(new URL("../fixtures/mini-match.json", import.meta.url), "utf8"));
const t0 = Math.min(...items.map((i) => i.data.timestamp));
const wss = new WebSocketServer({ port });

// Every new client gets the same match replay, paced by the optional speed argument.
wss.on("connection", (ws) => {
  const timers = items.map((it) =>
    setTimeout(() => ws.readyState === 1 && ws.send(JSON.stringify(it)), ((it.data.timestamp - t0) * 1000) / speed));
  ws.on("close", () => timers.forEach(clearTimeout));
});
console.log(`fixture server on ws://localhost:${port} at ${speed}x`);

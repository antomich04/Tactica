import { Envelope, parseEnvelope } from "./envelope";

export type Status = "idle" | "connecting" | "live" | "reconnecting" | "ended" | "error";
export interface Handlers {
  onEnvelope: (e: Envelope) => void;
  onStatus: (s: Status, detail?: string) => void;
}
export interface Stream { start(h: Handlers): void; stop(): void }

export class WebSocketStream implements Stream {
  private ws?: WebSocket;
  private retry?: number;
  private stopped = true;
  constructor(private url: string) {}
  start(h: Handlers) { this.stopped = false; this.open(h); }
  private open(h: Handlers) {
    h.onStatus("connecting", this.url);
    let opened = false;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => { opened = true; h.onStatus("live", this.url); };
    ws.onmessage = (m) => { const env = parseEnvelope(String(m.data)); if (env) h.onEnvelope(env); };
    ws.onerror = () => { if (!opened) this.retryLater(h, "error", `Cannot reach ${this.url}. Retrying in 2 s.`); };
    ws.onclose = (ev) => {
      if (this.stopped) return;
      if (ev.code === 1000) {
        this.stopped = true;
        h.onStatus("ended", "Stream finished");
      } else if (opened) this.retryLater(h, "reconnecting", "Connection dropped");
      else this.retryLater(h, "error", `Cannot reach ${this.url}. Retrying in 2 s.`);
    };
  }
  // A failed socket can fire both error and close, so schedule only one retry.
  private retryLater(h: Handlers, st: Status, detail: string) {
    if (this.stopped || this.retry !== undefined) return;
    h.onStatus(st, detail);
    this.retry = window.setTimeout(() => { this.retry = undefined; if (!this.stopped) this.open(h); }, 2000);
  }
  stop() { this.stopped = true; window.clearTimeout(this.retry); this.retry = undefined; this.ws?.close(); }
}

// Local replay stream used when the backend is not running.
export class MockStream implements Stream {
  private timers: number[] = [];
  constructor(private items: Envelope[], private speed = 4) {}
  start(h: Handlers) {
    h.onStatus("live", `Fixture replay at ${this.speed}x`);
    const ts = this.items.map((i) => i.data.timestamp);
    const t0 = Math.min(...ts);
    for (const it of this.items)
      this.timers.push(window.setTimeout(() => h.onEnvelope(it), ((it.data.timestamp - t0) * 1000) / this.speed));
    this.timers.push(window.setTimeout(() => h.onStatus("ended", "Fixture finished"), ((Math.max(...ts) - t0) * 1000) / this.speed + 300));
  }
  stop() { this.timers.forEach((t) => window.clearTimeout(t)); this.timers = []; }
}

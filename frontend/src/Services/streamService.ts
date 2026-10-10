import fixture from "../../fixtures/mini-match.json";
import { Envelope, Status } from "../types";
import { parseMessage } from "../Utils/match-logic";
import { API_URL } from "./authService";

export type Handlers = {
  onMessage: (message: Envelope) => void;
  onStatus: (status: Status, detail?: string) => void;
};

export type Stop = () => void;

const REPLAY_SPEED = 4;
const RETRY_MS = 2000;
const WS_BASE = API_URL.replace(/^http/, "ws");
const EVENTS_URL = `${WS_BASE}/api/events-stream`;
const OVERLAYS_URL = `${WS_BASE}/api/overlays-stream`;

const fixtureItems = fixture as Envelope[];

export function replayFixture(handlers: Handlers): Stop {
  handlers.onStatus("live", `Fixture replay at ${REPLAY_SPEED}x`);

  const timestamps = fixtureItems.map((item) => item.data.timestamp);
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);

  const timers = fixtureItems.map((item) =>
    window.setTimeout(() => handlers.onMessage(item), ((item.data.timestamp - start) * 1000) / REPLAY_SPEED),
  );

  timers.push(
    window.setTimeout(
      () => handlers.onStatus("ended", "Fixture finished"),
      ((end - start) * 1000) / REPLAY_SPEED + 300,
    ),
  );

  return () => timers.forEach((timer) => window.clearTimeout(timer));
}

export function openLiveStream(getTicket: () => Promise<string>, handlers: Handlers): Stop {
  let eventsSocket: WebSocket | undefined;
  let overlaysSocket: WebSocket | undefined;
  let retry: number | undefined;
  let stopped = false;

  function retryLater(status: Status, detail: string) {
    if (stopped || retry !== undefined) return;
    handlers.onStatus(status, detail);
    
    // Close both sockets before retrying so failed connections do not accumulate.
    eventsSocket?.close();
    overlaysSocket?.close();
    
    retry = window.setTimeout(() => {
      retry = undefined;
      void connect();
    }, RETRY_MS);
  }

  async function connect() {
    handlers.onStatus("connecting");

    let ticket: string;
    try {
      ticket = encodeURIComponent(await getTicket());
    } catch (e) {
      retryLater("error", e instanceof Error ? e.message : "Could not prepare the connection");
      return;
    }

    if (stopped) return;

    let eventsOpened = false;
    let overlaysOpened = false;

    const checkLive = () => {
      if (eventsOpened && overlaysOpened) handlers.onStatus("live");
    };

    const setupSocket = (url: string, setOpened: () => void) => {
      const ws = new WebSocket(url);
      let localOpened = false;

      ws.onopen = () => {
        localOpened = true;
        setOpened();
        checkLive();
      };

      ws.onmessage = (event) => {
        let rawData = String(event.data);

        // The broadcaster wraps events with metrics; pass only the event to the parser.
        try {
          const parsed = JSON.parse(rawData);
          if (parsed.event && parsed.metrics) {
            rawData = JSON.stringify(parsed.event);
          }
        } catch {
          // Leave non-JSON messages unchanged so parseMessage can reject and report them.
        }

        const message = parseMessage(rawData);
        if (message) handlers.onMessage(message);
      };

      ws.onerror = () => {
        if (!localOpened) retryLater("error", "Can't reach the live stream. Retrying in 2 s.");
      };

      ws.onclose = (event) => {
        if (stopped) return;

        if (event.code === 1000) {
          stopped = true;
          handlers.onStatus("ended", "Stream finished");
        } else if (localOpened) {
          retryLater("reconnecting", "Connection dropped");
        } else {
          retryLater("error", "Can't reach the live stream. Retrying in 2 s.");
        }
      };

      return ws;
    };

    eventsSocket = setupSocket(`${EVENTS_URL}?ticket=${ticket}`, () => { eventsOpened = true; });
    overlaysSocket = setupSocket(`${OVERLAYS_URL}?ticket=${ticket}`, () => { overlaysOpened = true; });
  }

  void connect();

  return () => {
    stopped = true;
    window.clearTimeout(retry);
    retry = undefined;
    eventsSocket?.close();
    overlaysSocket?.close();
  };
}
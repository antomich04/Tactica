import type { Envelope, Status } from "../types";
import { parseMessage } from "../Utils/match-logic";
import { API_URL } from "./authService";

export type Handlers = {
  onMessage: (message: Envelope) => void;
  onStatus: (status: Status, detail?: string) => void;
};

export type Stop = () => void;

const RETRY_MS = 2000;
const WS_BASE = new URL(API_URL || window.location.origin);
WS_BASE.protocol = WS_BASE.protocol === "https:" ? "wss:" : "ws:";
const EVENTS_URL = new URL("/api/events-stream", WS_BASE).toString();
const OVERLAYS_URL = new URL("/api/overlays-stream", WS_BASE).toString();

export function openLiveStream(
  getTicket: () => Promise<string>,
  handlers: Handlers,
): Stop {
  let eventsSocket: WebSocket | undefined;
  let overlaysSocket: WebSocket | undefined;
  let retry: number | undefined;
  let stopped = false;

  function retryLater(status: Status, detail: string) {
    if (stopped || retry !== undefined) return;
    handlers.onStatus(status, detail);

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
      // Do not wrap in encodeURIComponent() here; URL.searchParams.set() encodes automatically.
      ticket = await getTicket();
    } catch (e) {
      retryLater(
        "error",
        e instanceof Error ? e.message : "Could not prepare the connection",
      );
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
        const message = parseMessage(String(event.data));
        if (message) {
          handlers.onMessage(message);
        }
      };

      ws.onerror = () => {
        if (!localOpened) retryLater("error", "Can't reach the live stream.");
      };

      ws.onclose = (event) => {
        if (stopped) return;

        if (event.code === 1000) {
          stopped = true;
          handlers.onStatus("ended", "Stream finished");
        } else if (localOpened) {
          retryLater("reconnecting", "Connection dropped");
        } else {
          retryLater("error", "Can't reach the live stream.");
        }
      };

      return ws;
    };

    const eventUrl = new URL(EVENTS_URL);
    eventUrl.searchParams.set("ticket", ticket);
    const overlayUrl = new URL(OVERLAYS_URL);
    overlayUrl.searchParams.set("ticket", ticket);
    eventsSocket = setupSocket(eventUrl.toString(), () => {
      eventsOpened = true;
    });
    overlaysSocket = setupSocket(overlayUrl.toString(), () => {
      overlaysOpened = true;
    });
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

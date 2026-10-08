import fixture from "../../fixtures/mini-match.json";
import { Envelope, Status } from "../types";
import { parseMessage } from "../utils";
import { API_URL } from "./authService";

export type Handlers = {
  onMessage: (message: Envelope) => void;
  onStatus: (status: Status, detail?: string) => void;
};

export type Stop = () => void;

const REPLAY_SPEED = 4;
const RETRY_MS = 2000;
const STREAM_URL = `${API_URL.replace(/^http/, "ws")}/api/stream`;

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
  let socket: WebSocket | undefined;
  let retry: number | undefined;
  let stopped = false;

  // error and close can both fire for one failure, so only one retry may be pending.
  function retryLater(status: Status, detail: string) {
    if (stopped || retry !== undefined) return;

    handlers.onStatus(status, detail);
    retry = window.setTimeout(() => {
      retry = undefined;
      void connect();
    }, RETRY_MS);
  }

  async function connect() {
    handlers.onStatus("connecting");

    let url: string;
    try {
      url = `${STREAM_URL}?ticket=${encodeURIComponent(await getTicket())}`;
    } catch (e) {
      retryLater("error", e instanceof Error ? e.message : "Could not prepare the connection");
      return;
    }

    if (stopped) return; // stopped while we were waiting for the ticket

    let opened = false;
    const ws = new WebSocket(url);
    socket = ws;

    ws.onopen = () => {
      opened = true;
      handlers.onStatus("live");
    };

    ws.onmessage = (event) => {
      const message = parseMessage(String(event.data));
      if (message) handlers.onMessage(message);
    };

    ws.onerror = () => {
      if (!opened) retryLater("error", "Can't reach the live stream. Retrying in 2 s.");
    };

    ws.onclose = (event) => {
      if (stopped) return;

      if (event.code === 1000) {
        // A clean close means the server finished the stream. That is not a failure.
        stopped = true;
        handlers.onStatus("ended", "Stream finished");
      } else if (opened) {
        retryLater("reconnecting", "Connection dropped");
      } else {
        retryLater("error", "Can't reach the live stream. Retrying in 2 s.");
      }
    };
  }

  void connect();

  return () => {
    stopped = true;
    window.clearTimeout(retry);
    retry = undefined;
    socket?.close();
  };
}

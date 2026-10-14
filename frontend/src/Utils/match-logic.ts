import type { Envelope, MatchEvent, MatchMetrics, Overlay } from "../types";

export const clock = (seconds: number) => {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(Math.floor(seconds % 60)).padStart(2, "0");

  return `${minutes}:${rest}`;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMetrics(value: unknown): MatchMetrics | undefined {
  if (!isRecord(value)) return undefined;

  const metrics: MatchMetrics = {};
  if (typeof value.chaos_index === "number" || typeof value.chaos_index === "string") {
    metrics.chaos_index = value.chaos_index;
  }
  if (typeof value.control_index === "number" || typeof value.control_index === "string") {
    metrics.control_index = value.control_index;
  }
  if (typeof value.controlling_team === "string") {
    metrics.controlling_team = value.controlling_team;
  }
  return metrics;
}

export function parseMessage(raw: string): Envelope | null {
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    console.warn("Ignored unreadable stream message:", raw.slice(0, 120));
    return null;
  }

  if (isRecord(message)) {
    const data = message.data;
    if (
      (message.kind === "event" || message.kind === "overlay") &&
      isRecord(data) &&
      typeof data.id === "string"
    ) {
      if (message.kind === "event") {
        return {
          kind: "event",
          data: data as unknown as MatchEvent,
          metrics: parseMetrics(message.metrics),
        };
      }
      return { kind: "overlay", data: data as unknown as Overlay };
    }

    if (isRecord(message.event) && typeof message.event.id === "string") {
      return {
        kind: "event",
        data: message.event as unknown as MatchEvent,
        metrics: parseMetrics(message.metrics),
      };
    }

    if (typeof message.id === "string") {
      if (typeof message.text === "string" && Array.isArray(message.evidence_event_ids)) {
        return { kind: "overlay", data: message as unknown as Overlay };
      }
      if (
        typeof message.team === "string" &&
        typeof message.x === "number" &&
        typeof message.y === "number"
      ) {
        return { kind: "event", data: message as unknown as MatchEvent };
      }
    }
  }

  console.warn("Ignored unreadable stream message:", raw.slice(0, 120));
  return null;
}
import type { Envelope, MatchEvent, MatchMetrics, Overlay } from "../types";

export const clock = (seconds: number) => {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(Math.floor(seconds % 60)).padStart(2, "0");

  return `${minutes}:${rest}`;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPitchCoordinate(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 100;
}

function isMatchEvent(value: unknown): value is MatchEvent {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.match_id !== "string" ||
    !isFiniteNumber(value.timestamp) ||
    value.timestamp < 0 ||
    typeof value.team !== "string" ||
    typeof value.player !== "string" ||
    !isPitchCoordinate(value.x) ||
    !isPitchCoordinate(value.y)
  ) {
    return false;
  }

  switch (value.type) {
    case "pass":
      return (
        isPitchCoordinate(value.end_x) &&
        isPitchCoordinate(value.end_y) &&
        isFiniteNumber(value.distance) &&
        value.distance >= 0 &&
        ["completed", "incomplete", "intercepted", "out_of_bounds"].includes(String(value.outcome))
      );
    case "shot":
      return (
        isFiniteNumber(value.xg) &&
        value.xg >= 0 &&
        value.xg <= 1 &&
        ["goal", "saved", "blocked", "off_target", "post"].includes(String(value.outcome))
      );
    case "tackle":
      return value.outcome === "won" || value.outcome === "lost";
    case "pressure":
      return isFiniteNumber(value.duration);
    case "card":
      return value.card_color === "yellow" || value.card_color === "red";
    case "goal":
      return typeof value.scorer === "string";
    case "possession_change":
      return typeof value.previous_team === "string" && typeof value.new_team === "string";
    case "save":
      return true;
    case "corner":
    case "goal_kick":
    case "penalty":
      return true;
    case "foul":
    case "substitution":
    case "injury":
      return value.details === undefined || typeof value.details === "string";
    default:
      return false;
  }
}

function isOverlay(value: unknown): value is Overlay {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.match_id === "string" &&
    isFiniteNumber(value.timestamp) &&
    isFiniteNumber(value.duration) &&
    typeof value.type === "string" &&
    isFiniteNumber(value.priority) &&
    typeof value.language === "string" &&
    typeof value.persona === "string" &&
    typeof value.text === "string" &&
    Array.isArray(value.evidence_event_ids) &&
    value.evidence_event_ids.every((id) => typeof id === "string") &&
    typeof value.verified === "boolean" &&
    isRecord(value.meta)
  );
}

function parseMetrics(value: unknown): MatchMetrics | undefined {
  if (!isRecord(value)) return undefined;

  const metrics: MatchMetrics = {};
  if (isFiniteNumber(value.chaos_index) && value.chaos_index >= 0 && value.chaos_index <= 100) {
    metrics.chaos_index = value.chaos_index;
  }
  if (isFiniteNumber(value.control_index) && value.control_index >= 0 && value.control_index <= 100) {
    metrics.control_index = value.control_index;
  }
  if (typeof value.controlling_team === "string") {
    metrics.controlling_team = value.controlling_team;
  }
  return Object.keys(metrics).length > 0 ? metrics : undefined;
}

export function parseMessage(raw: string): Envelope | null {
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    console.warn("Ignored malformed live-stream message.");
    return null;
  }

  if (isRecord(message)) {
    if (message.kind === "event" && isMatchEvent(message.data)) {
      return {
        kind: "event",
        data: message.data,
        metrics: parseMetrics(message.metrics),
      };
    }
    if (message.kind === "overlay" && isOverlay(message.data)) {
      return { kind: "overlay", data: message.data };
    }

    if (isMatchEvent(message.event)) {
      return {
        kind: "event",
        data: message.event,
        metrics: parseMetrics(message.metrics),
      };
    }

    if (isOverlay(message)) {
      return { kind: "overlay", data: message };
    }
    if (isMatchEvent(message)) {
      return { kind: "event", data: message };
    }
  }

  console.warn("Ignored malformed live-stream message.");
  return null;
}
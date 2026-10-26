import type {
  Envelope,
  MatchEvent,
  MatchMetrics,
  MatchRecap,
  MatchSummary,
  MomentumPoint,
  Overlay,
} from "../types";

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
      // Optional event details may arrive as null from the backend.
      return value.details === undefined || value.details === null || typeof value.details === "string";
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

function isMatchSummary(value: unknown): value is MatchSummary {
  if (!isRecord(value) || !isRecord(value.stats)) return false;
  const stats = value.stats;
  const validTeamStats = (teamStats: unknown) =>
    isRecord(teamStats) &&
    [
      "shots",
      "shots_on_target",
      "passes_attempted",
      "passes_completed",
      "corners",
      "yellow_cards",
      "red_cards",
    ].every((field) => isFiniteNumber(teamStats[field]));

  return (
    typeof value.match_id === "string" &&
    typeof value.home_team === "string" &&
    typeof value.away_team === "string" &&
    isFiniteNumber(value.home_score) &&
    isFiniteNumber(value.away_score) &&
    isFiniteNumber(value.match_time) &&
    validTeamStats(stats.home) &&
    validTeamStats(stats.away) &&
    Array.isArray(value.key_events) &&
    value.key_events.every(
      (event) =>
        isRecord(event) &&
        typeof event.type === "string" &&
        isFiniteNumber(event.timestamp) &&
        typeof event.team === "string" &&
        typeof event.player === "string" &&
        (event.details === undefined ||
          event.details === null ||
          typeof event.details === "string"),
    )
  );
}

function isMatchRecap(value: unknown): value is MatchRecap {
  return (
    isRecord(value) &&
    typeof value.match_id === "string" &&
    typeof value.language === "string" &&
    typeof value.persona === "string" &&
    typeof value.text === "string"
  );
}

function parseMomentum(value: unknown): MomentumPoint | undefined {
  if (!isRecord(value)) return undefined;
  if (isFiniteNumber(value.timestamp) && isFiniteNumber(value.score)) {
    return {
      timestamp: value.timestamp,
      score: value.score,
    };
  }
  return undefined;
}

function parseMetrics(value: unknown, momentumValue?: unknown): MatchMetrics | undefined {
  const metrics: MatchMetrics = {};

  if (isRecord(value)) {
    if (isFiniteNumber(value.chaos_index) && value.chaos_index >= 0 && value.chaos_index <= 100) {
      metrics.chaos_index = value.chaos_index;
    }
    if (isFiniteNumber(value.control_index) && value.control_index >= 0 && value.control_index <= 100) {
      metrics.control_index = value.control_index;
    }
    if (isFiniteNumber(value.home_control) && value.home_control >= 0 && value.home_control <= 100) {
      metrics.home_control = value.home_control;
    }
    if (isFiniteNumber(value.away_control) && value.away_control >= 0 && value.away_control <= 100) {
      metrics.away_control = value.away_control;
    }
    if (typeof value.controlling_team === "string" || value.controlling_team === null) {
      metrics.controlling_team = value.controlling_team;
    }
    if (isFiniteNumber(value.recent_events_count)) {
      metrics.recent_events_count = value.recent_events_count;
    }
    if (typeof value.paused === "boolean") {
      metrics.paused = value.paused;
    }
    if (typeof value.halftime_pause === "boolean") {
      metrics.halftime_pause = value.halftime_pause;
    }
  }

  const momentum = parseMomentum(momentumValue);
  if (momentum) {
    metrics.momentum = momentum;
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
    if (message.kind === "match_ended" && isMatchSummary(message.data)) {
      return { kind: "match_ended", data: message.data };
    }
    if (message.kind === "match_recap" && isMatchRecap(message.data)) {
      return { kind: "match_recap", data: message.data };
    }
    if (message.kind === "event" && isMatchEvent(message.data)) {
      const momentum = parseMomentum(message.momentum);
      return {
        kind: "event",
        data: message.data,
        metrics: parseMetrics(message.metrics, message.momentum),
        momentum,
      };
    }
    if (message.kind === "overlay" && isOverlay(message.data)) {
      return { kind: "overlay", data: message.data };
    }

    // Accept the broadcaster's flat event payload for compatibility.
    if (isMatchEvent(message.event)) {
      const momentum = parseMomentum(message.momentum);
      return {
        kind: "event",
        data: message.event,
        metrics: parseMetrics(message.metrics, message.momentum),
        momentum,
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
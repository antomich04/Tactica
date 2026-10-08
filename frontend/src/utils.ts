import { Envelope, MatchEvent } from "./types";

export function describe(e: MatchEvent): string {
  switch (e.type) {
    case "pass":
      return e.outcome === "completed"
        ? `${e.player} passes to ${e.receiver ?? "a teammate"}, ${Math.round(e.distance)} m`
        : `${e.player}'s pass ${e.outcome.replace("_", " ")}, ${Math.round(e.distance)} m`;

    case "shot":
      return `${e.player} shoots, ${e.outcome.replace("_", " ")}, xG ${e.xg.toFixed(2)}${
        e.speed_kmh ? `, ${Math.round(e.speed_kmh)} km/h` : ""
      }`;

    case "tackle":
      return `${e.player} tackle ${e.outcome}`;

    case "pressure":
      return `${e.player} presses for ${e.duration.toFixed(1)} s`;

    case "card":
      return `${e.card_color} card for ${e.player}`;

    case "goal":
      return `Goal, ${e.player}`;

    case "possession_change":
      return `${e.new_team} take possession from ${e.previous_team}`;

    case "foul":
    case "substitution":
      return `${e.type} by ${e.player}${e.details ? `: ${e.details}` : ""}`;

    default: {
      const unhandled: never = e;
      return String(unhandled);
    }
  }
}

export const clock = (seconds: number) => {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(Math.floor(seconds % 60)).padStart(2, "0");

  return `${minutes}:${rest}`;
};

export function parseMessage(raw: string): Envelope | null {
  try {
    const m = JSON.parse(raw);

    if (m && (m.kind === "event" || m.kind === "overlay") && m.data && typeof m.data.id === "string") return m;

    if (m && typeof m.id === "string") {
      if (typeof m.text === "string" && Array.isArray(m.evidence_event_ids)) return { kind: "overlay", data: m };
      if (typeof m.team === "string" && typeof m.x === "number" && typeof m.y === "number") return { kind: "event", data: m };
    }
  } catch {
    // not JSON: fall through
  }

  console.warn("Ignored unreadable stream message:", raw.slice(0, 120));
  return null;
}

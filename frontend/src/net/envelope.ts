import type { MatchEvent } from "../contracts/event.generated";
import type { Overlay } from "../contracts/overlay.generated";

export type Envelope =
  | { kind: "event"; data: MatchEvent }
  | { kind: "overlay"; data: Overlay };

// Accept both wrapped messages and bare payloads so the UI can work with either stream shape.
export function parseEnvelope(raw: string): Envelope | null {
  try {
    const m = JSON.parse(raw);
    if (m && (m.kind === "event" || m.kind === "overlay") && m.data && typeof m.data.id === "string") return m;
    if (m && typeof m.id === "string") {
      if (typeof m.text === "string" && Array.isArray(m.evidence_event_ids)) return { kind: "overlay", data: m };
      if (typeof m.team === "string" && typeof m.x === "number" && typeof m.y === "number") return { kind: "event", data: m };
    }
  } catch {
    // The warning below keeps bad messages visible without breaking the stream.
  }
  console.warn("Ignored unreadable stream message:", raw.slice(0, 120));
  return null;
}

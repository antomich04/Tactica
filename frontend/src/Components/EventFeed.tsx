import { MatchEvent, Overlay } from "../types";
import { clock, describe } from "../utils";

interface Props {
  overlays: Overlay[];
  events: MatchEvent[];
  activeId?: string;
  evidence: Set<string>;
  colorOf: (team: string) => string;
}

export function EventFeed({ overlays, events, activeId, evidence, colorOf }: Props) {
  return (
    <aside className="rail">
      {overlays.length > 0 && (
        <>
          <h2>Overlays</h2>
          <ol className="feed">
            {[...overlays].reverse().slice(0, 8).map((o) => (
              <li key={o.id} className={o.id === activeId ? "current" : ""}>
                <time>{clock(o.timestamp)}</time>
                <span>
                  <em className="tag">{o.type.replace("_", " ")}</em>
                  {o.text}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
      <h2>Events</h2>
      {events.length ? (
        <ol className="feed">
          {[...events].reverse().slice(0, 30).map((e) => (
            <li key={e.id} className={evidence.has(e.id) ? "evidence" : ""}>
              <time>{clock(e.timestamp)}</time>
              <span>
                <i style={{ background: colorOf(e.team) }} aria-hidden />
                {describe(e)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="none">No events yet.</p>
      )}
    </aside>
  );
}
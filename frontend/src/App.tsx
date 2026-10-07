import { useCallback, useEffect, useMemo, useState } from "react";
import fixture from "../fixtures/mini-match.json";
import type { MatchEvent } from "./contracts/event.generated";
import type { Overlay } from "./contracts/overlay.generated";
import type { Envelope } from "./net/envelope";
import { MockStream, WebSocketStream, Status, Stream } from "./net/stream";
import { Pitch } from "./Pitch";

// Turns each match event into the short text shown in the event feed.
function describe(e: MatchEvent): string {
  switch (e.type) {
    case "pass": return e.outcome === "completed"
      ? `${e.player} passes to ${e.receiver ?? "a teammate"}, ${Math.round(e.distance)} m`
      : `${e.player}'s pass ${e.outcome.replace("_", " ")}, ${Math.round(e.distance)} m`;
    case "shot": return `${e.player} shoots, ${e.outcome.replace("_", " ")}, xG ${e.xg.toFixed(2)}${e.speed_kmh ? `, ${Math.round(e.speed_kmh)} km/h` : ""}`;
    case "tackle": return `${e.player} tackle ${e.outcome}`;
    case "pressure": return `${e.player} presses for ${e.duration.toFixed(1)} s`;
    case "card": return `${e.card_color} card for ${e.player}`;
    case "goal": return `Goal, ${e.player}`;
    case "possession_change": return `${e.new_team} take possession from ${e.previous_team}`;
    case "foul": case "substitution": return `${e.type} by ${e.player}${e.details ? `: ${e.details}` : ""}`;
    default: { const unhandled: never = e; return String(unhandled); }
  }
}

const WS_URL = import.meta.env.VITE_WS_URL;
const DEV = import.meta.env.DEV;
// In development we start with the local fixture; production uses the backend URL when one is set.
const INITIAL_SOURCE: "mock" | "ws" = DEV || !WS_URL ? "mock" : "ws";

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const STATUS: Record<Status, string> = { idle: "Stopped", connecting: "Connecting", live: "Live", reconnecting: "Reconnecting", ended: "Finished", error: "Can\u2019t connect" };

export function App() {
  const [source, setSource] = useState<"mock" | "ws">(INITIAL_SOURCE);
  const [url, setUrl] = useState(WS_URL || "ws://localhost:8000/api/stream");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState("");
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [overlays, setOverlays] = useState<Overlay[]>([]);

  // Reconnects can replay old messages, so keep only the first item with each id.
  const add = useCallback((env: Envelope) => {
    if (env.kind === "event") setEvents((p) => (p.some((e) => e.id === env.data.id) ? p : [...p, env.data]));
    else setOverlays((p) => (p.some((o) => o.id === env.data.id) ? p : [...p, env.data]));
  }, []);

  useEffect(() => {
    if (!running) return;
    setEvents([]); setOverlays([]);
    const s: Stream = source === "mock" ? new MockStream(fixture as unknown as Envelope[], 4) : new WebSocketStream(url);
    s.start({
      onEnvelope: add,
      onStatus: (st, d) => { setStatus(st); setDetail(d ?? ""); if (st === "ended") setRunning(false); },
    });
    return () => s.stop();
  }, [running, source, url, add]);

  const now = useMemo(() => Math.max(0, ...events.map((e) => e.timestamp), ...overlays.map((o) => o.timestamp)), [events, overlays]);
  // Pick the overlay that should be on air at the current match time.
  const active = useMemo(
    () => overlays.filter((o) => o.timestamp <= now && now < o.timestamp + o.duration)
      .sort((a, b) => a.priority - b.priority || b.timestamp - a.timestamp)[0],
    [overlays, now]);
  const evidence = useMemo(() => new Set(active?.evidence_event_ids ?? []), [active]);
  // The contract does not name home and away yet, so the first two teams become the scoreboard sides.
  const teams = useMemo(() => [...new Set(events.map((e) => e.team))].slice(0, 2), [events]);
  const colorOf = (t: string) => (teams.indexOf(t) === 1 ? "var(--away)" : "var(--home)");
  const goals = (t?: string) => events.filter((e) => e.type === "goal" && e.team === t).length;
  const hasData = events.length > 0 || overlays.length > 0;
  const showDetail = detail && (status === "error" || status === "reconnecting");

  return (
    <div className="app">
      <header className="top">
        <h1>Tactica</h1>
        <div className="controls">
          {DEV && (
            <>
              <div className="seg" role="group" aria-label="Data source">
                {(["mock", "ws"] as const).map((k) => (
                  <button key={k} aria-pressed={source === k} disabled={running} onClick={() => setSource(k)}>
                    {k === "mock" ? "Fixture" : "WebSocket"}
                  </button>
                ))}
              </div>
              {source === "ws" && <input value={url} disabled={running} onChange={(e) => setUrl(e.target.value)} aria-label="WebSocket URL" />}
            </>
          )}
          <button className="go" onClick={() => { if (running) setStatus("idle"); setRunning(!running); }}>
            {running ? "Stop" : hasData ? "Replay" : "Start"}
          </button>
          <span className={`status ${status}`} role="status" title={detail}>
            <i aria-hidden />{STATUS[status]}{showDetail ? `: ${detail}` : ""}
          </span>
        </div>
      </header>

      <section className="scoreboard" aria-label="Scoreboard">
        <div className="side">
          <i style={{ background: "var(--home)" }} aria-hidden />
          <span className="name">{teams[0] ?? "Home"}</span>
          <b className="score">{goals(teams[0])}</b>
        </div>
        <div className="clock" aria-label="Match clock">{hasData ? clock(now) : "--:--"}</div>
        <div className="side away">
          <b className="score">{goals(teams[1])}</b>
          <span className="name">{teams[1] ?? "Away"}</span>
          <i style={{ background: "var(--away)" }} aria-hidden />
        </div>
      </section>

      <main>
        <section className="stage">
          <div className="pitch-wrap">
            <Pitch events={events} colorOf={colorOf} evidence={evidence} />
            {!events.length && (
              <p className="empty">
                {overlays.length ? "This stream sends overlays only, so there are no events to draw yet."
                  : source === "mock" ? "Press Start to replay the fixture match."
                  : DEV ? "Run the backend, then press Start." : "Press Start to connect."}
              </p>
            )}
          </div>
          <div className={`onair ${active ? "live" : ""}`} aria-live="polite">
            {active ? (
              <>
                <span className="tag">{active.type.replace("_", " ")}</span>
                <p>{active.text}</p>
                <small>{active.verified ? `Verified, cites ${active.evidence_event_ids.length} events` : "Not verified"}</small>
              </>
            ) : (
              <p className="idle">Nothing on air.</p>
            )}
          </div>
        </section>

        <aside className="rail">
          {overlays.length > 0 && (
            <>
              <h2>Overlays</h2>
              <ol className="feed">
                {[...overlays].reverse().slice(0, 8).map((o) => (
                  <li key={o.id} className={o.id === active?.id ? "current" : ""}>
                    <time>{clock(o.timestamp)}</time>
                    <span><em className="tag">{o.type.replace("_", " ")}</em> {o.text}</span>
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
                  <span><i style={{ background: colorOf(e.team) }} aria-hidden />{describe(e)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="none">No events yet.</p>
          )}
        </aside>
      </main>
    </div>
  );
}

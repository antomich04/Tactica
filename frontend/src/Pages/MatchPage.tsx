import { useCallback, useEffect, useMemo, useState } from "react";
import { Pitch } from "../Components/Pitch";
import { Scoreboard } from "../Components/Scoreboard";
import { ActiveOverlay } from "../Components/ActiveOverlay";
import { EventFeed } from "../Components/EventFeed";
import { openLiveStream, replayFixture } from "../Services/streamService";
import { Envelope, MatchEvent, Overlay, Status, User } from "../types";

const STATUS: Record<Status, string> = {
  idle: "Stopped",
  connecting: "Connecting",
  live: "Live",
  reconnecting: "Reconnecting",
  ended: "Finished",
  error: "Can\u2019t connect",
};

type Props = {
  user?: User;
  onLogout?: () => void;
  getWsTicket?: () => Promise<string>;
};

export function MatchPage({ user, onLogout, getWsTicket }: Props) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState("");
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [overlays, setOverlays] = useState<Overlay[]>([]);

  // 1. Data Ingestion
  const add = useCallback((env: Envelope) => {
    if (env.kind === "event") {
      setEvents((previous) =>
        previous.some((event) => event.id === env.data.id) ? previous : [...previous, env.data]
      );
    } else {
      setOverlays((previous) =>
        previous.some((overlay) => overlay.id === env.data.id) ? previous : [...previous, env.data]
      );
    }
  }, []);

  //Stream Connection Lifecycle
  useEffect(() => {
    if (!running) return;
    setEvents([]);
    setOverlays([]);

    const handlers = {
      onMessage: add,
      onStatus: (next: Status, text?: string) => {
        setStatus(next);
        setDetail(text ?? "");
        if (next === "ended") setRunning(false);
      },
    };

    return getWsTicket ? openLiveStream(getWsTicket, handlers) : replayFixture(handlers);
  }, [running, add, getWsTicket]);

  // Derived Match State
  const now = useMemo(
    () => Math.max(0, ...events.map((e) => e.timestamp), ...overlays.map((o) => o.timestamp)),
    [events, overlays]
  );

  const active = useMemo(() => {
    return overlays
      .filter((o) => o.timestamp <= now && now < o.timestamp + o.duration)
      .sort((a, b) => a.priority - b.priority || b.timestamp - a.timestamp)[0];
  }, [overlays, now]);

  const evidence = useMemo(() => new Set(active?.evidence_event_ids ?? []), [active]);

  const teams = useMemo(
    () => [...new Set(events.map((e) => e.team))].slice(0, 2),
    [events]
  );

  const colorOf = useCallback((team: string) => (
    teams.indexOf(team) === 1 ? "var(--away)" : "var(--home)"
  ), [teams]);

  const hasData = events.length > 0 || overlays.length > 0;

  return (
    <div className="app">
      <header className="top">
        <h1>Tactica</h1>
        <div className="controls">
          <button
            className="go"
            onClick={() => {
              if (running) setStatus("idle");
              setRunning(!running);
            }}
          >
            {running ? "Stop" : hasData ? "Replay" : "Start"}
          </button>

          <span className={`status ${status}`} role="status" title={detail}>
            <i aria-hidden />
            {STATUS[status]}
            {detail && (status === "error" || status === "reconnecting") ? `: ${detail}` : ""}
          </span>

          {user && onLogout && (
            <span className="who">
              {user.username} <em className="tag">{user.role}</em>
              <button className="ghost" onClick={onLogout}>Sign out</button>
            </span>
          )}
        </div>
      </header>

      <Scoreboard teams={teams} events={events} matchTime={now} />

      <main>
        <section className="stage">
          <div className="pitch-wrap">
            <Pitch events={events} colorOf={colorOf} evidence={evidence} />
            {!events.length && (
              <p className="empty">
                {overlays.length
                  ? "This stream sends overlays only, so there are no events to draw yet."
                  : getWsTicket
                    ? "Press Start to connect to the live stream."
                    : "Press Start to replay the fixture match."}
              </p>
            )}
          </div>

          <ActiveOverlay active={active} />
        </section>

        <EventFeed overlays={overlays} events={events} activeId={active?.id} evidence={evidence} colorOf={colorOf} />
      </main>
    </div>
  );
}
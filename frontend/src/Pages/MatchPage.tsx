import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_URL } from "../Services/authService";
import { Scoreboard } from "../Components/Scoreboard";
import { ActiveOverlay } from "../Components/ActiveOverlay";
import { EventFeed } from "../Components/EventFeed";
import { LivePitch } from "../Components/LivePitch";
import { MomentumGraph } from "../Components/MomentumGraph"; 
import { openLiveStream } from "../Services/streamService";
import type { Envelope, MatchEvent, MatchMetrics, Overlay, Status } from "../types";

type Props = {
  getWsTicket: () => Promise<string>;
};

export function MatchPage({ getWsTicket }: Props) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState("");
  
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<MatchMetrics | null>(null);

  const add = useCallback((env: Envelope) => {
    if (env.kind === "event") {
      const matchEvent = env.data;

      setEvents((prev) => {
        if (prev.some((e) => e.id === matchEvent.id)) return prev;
        return [...prev, matchEvent];
      });
      
      if (env.metrics) {
        setLatestMetrics(env.metrics);
      }
    } 
    else if (env.kind === "overlay") {
      const overlayData = env.data;
      
      setOverlays((prev) => {
        if (prev.some((o) => o.id === overlayData.id)) return prev;
        return [...prev, overlayData];
      });
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    setEvents([]);
    setOverlays([]);
    setLatestMetrics(null);

    const handlers = {
      onMessage: add,
      onStatus: (next: Status, text?: string) => {
        setStatus(next);
        setDetail(text ?? "");
        if (next === "ended") setRunning(false);
      },
    };

    return openLiveStream(getWsTicket, handlers);
  }, [running, add, getWsTicket]);

  const toggleMatch = async () => {
    if (running) {
      setStatus("idle");
      setRunning(false);
    } else {
      try {
        await axios.post(`${API_URL}/api/match/start`, undefined, { withCredentials: true });
        setDetail("");
        setRunning(true);
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? error.response?.data?.detail ?? error.message
          : error instanceof Error
            ? error.message
            : "Failed to start match.";
        setStatus("error");
        setDetail(typeof message === "string" ? message : "Failed to start match.");
      }
    }
  };

  const now = useMemo(
    () => Math.max(0, ...events.map((e) => e.timestamp), ...overlays.map((o) => o.timestamp)),
    [events, overlays]
  );

  const active = useMemo(() => {
    return overlays
      .filter((o) => o.timestamp <= now && now < o.timestamp + o.duration)
      .sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5) || b.timestamp - a.timestamp)[0];
  }, [overlays, now]);

  const evidence = useMemo(() => new Set(active?.evidence_event_ids ?? []), [active]);
  const teams = useMemo(() => [...new Set(events.map((e) => e.team))].slice(0, 2), [events]);
  const colorOf = useCallback((team: string) => (teams.indexOf(team) === 1 ? "#3b82f6" : "#ef4444"), [teams]);

  return (
    <div className="max-w-[1500px] w-full mx-auto p-3 flex flex-col gap-4 min-h-[calc(100vh-100px)] h-auto overflow-visible lg:h-[calc(100vh-100px)] lg:overflow-hidden">
      
      <div className="shrink-0">
        <Scoreboard 
          teams={teams} events={events} matchTime={now} 
          running={running} status={status} detail={detail} onToggleMatch={toggleMatch}
        />
      </div>

      <main className="flex flex-col gap-6 flex-1 min-h-0 lg:grid lg:grid-cols-[1fr_450px] xl:grid-cols-[1fr_500px] lg:items-start lg:gap-4">
        
        <section className="flex flex-col gap-4 h-full">
          <div className="relative w-full flex justify-center shrink-0">
            <LivePitch events={events} colorOf={colorOf} />
            {!events.length && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs z-20 rounded-xl border border-slate-600 max-w-[700px] mx-auto">
                <p className="text-slate-300 font-bold tracking-wide text-sm">
                  {status === "live" ? "AWAITING KICKOFF..." : "PRESS START TO CONNECT"}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 auto-rows-[180px] gap-4 shrink-0 md:grid-cols-2 md:auto-rows-[170px] md:h-[170px]">
            <MomentumGraph 
              metrics={latestMetrics} 
              teams={teams} 
              latestEvent={events[events.length - 1]} 
            />
            <ActiveOverlay active={active} teams={teams} />
          </div>
        </section>

        <div className="bg-slate-900 border border-slate-600 rounded-xl overflow-hidden shadow-lg h-[500px] lg:h-full flex flex-col">
          <EventFeed events={events} evidence={evidence} colorOf={colorOf} />
        </div>
        
      </main>
    </div>
  );
}
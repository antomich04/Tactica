import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { BookOpenText, LoaderCircle } from "lucide-react";
import { api, ApiError } from "../Services/authService";
import { fetchAllTeams, fetchNextMatch } from "../Services/teamsService";
import { readSavedMatchup } from "../Services/matchupStorage";
import { Scoreboard } from "../Components/Scoreboard";
import { ActiveOverlay } from "../Components/ActiveOverlay";
import { EventFeed } from "../Components/EventFeed";
import { LivePitch } from "../Components/LivePitch";
import { MomentumGraph } from "../Components/MomentumGraph";
import { MatchStats } from "../Components/MatchStats";
import { MatchLineups } from "../Components/MatchLineups";
import { MatchRecap as MatchRecapView } from "../Components/MatchRecap";
import { openLiveStream } from "../Services/streamService";
import { useTranslation } from "@/Utils/i18n";
import { parseMessage } from "../Utils/match-logic";
import type {
  ClubTeam,
  Envelope,
  MatchEvent,
  MatchMetrics,
  MatchRecap,
  MatchSummary,
  Overlay,
  Status,
} from "../types";


type Props = {
  getWsTicket: () => Promise<string>;
};

export function MatchPage({ getWsTicket }: Props) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as {
    homeTeam?: ClubTeam;
    awayTeam?: ClubTeam;
  } | null;
  const hasSelectedMatchup = Boolean(routeState?.homeTeam && routeState?.awayTeam);

  const [dbTeams, setDbTeams] = useState<[ClubTeam | null, ClubTeam | null]>([
    routeState?.homeTeam ?? null,
    routeState?.awayTeam ?? null,
  ]);
  const [streamActive, setStreamActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [matchStopped, setMatchStopped] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState("");
  const matchTriggeredRef = useRef(false);
  const userStartedMatchRef = useRef(false);
  const expectedMatchIdRef = useRef<string | null>(null);
  const [streamGeneration, setStreamGeneration] = useState(0);

  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<MatchMetrics | null>(null);
  const [matchSummary, setMatchSummary] = useState<MatchSummary | null>(null);
  const [matchRecap, setMatchRecap] = useState<MatchRecap | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [showMatchRecap, setShowMatchRecap] = useState(false);

  useEffect(() => {
    if (hasSelectedMatchup) return;

    let active = true;
    void api
      .get("/api/match/recap/latest")
      .then((response) => {
        if (!active || userStartedMatchRef.current) return;
        const saved = response.data?.match;
        if (!saved) return;

        const ended = parseMessage(
          JSON.stringify({ kind: "match_ended", data: saved.summary }),
        );
        const recap = parseMessage(
          JSON.stringify({ kind: "match_recap", data: saved.recap }),
        );
        if (ended?.kind === "match_ended" && recap?.kind === "match_recap") {
          setMatchSummary(ended.data);
          setMatchRecap(recap.data);
          setStatus("ended");
          setDetail("Full time");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          console.warn("Could not restore the previous match recap.", error);
        }
      });
    return () => {
      active = false;
    };
  }, [hasSelectedMatchup]);

  useEffect(() => {
    if (
      matchSummary &&
      matchRecap?.match_id === matchSummary.match_id &&
      recapLoading
    ) {
      setRecapLoading(false);
    }
  }, [matchSummary, matchRecap, recapLoading]);

  useEffect(() => {
    if (!matchSummary || !recapLoading) return;
    const timeout = window.setTimeout(() => setRecapLoading(false), 30_000);
    return () => window.clearTimeout(timeout);
  }, [matchSummary, recapLoading]);

  useEffect(() => {
    if (dbTeams[0] && dbTeams[1]) return;
    let active = true;
    const savedMatchup = readSavedMatchup();

    const loadMatchup = async () => {
      if (savedMatchup) {
        try {
          const teams = await fetchAllTeams();
          const homeTeam =
            teams.find((team) => team.id === savedMatchup.homeTeamId) ?? null;
          const awayTeam =
            teams.find((team) => team.id === savedMatchup.awayTeamId) ?? null;
          if (homeTeam && awayTeam) {
            if (active) setDbTeams([homeTeam, awayTeam]);
            return;
          }
        } catch {
          // Fall back to the featured matchup if the saved selection cannot load.
        }
      }

      try {
        const res = await fetchNextMatch();
        if (active) setDbTeams([res.home_team, res.away_team]);
      } catch {
        // Preserve the existing empty-state behavior if no matchup is available.
      }
    };

    void loadMatchup();
    return () => {
      active = false;
    };
  }, [dbTeams]);

  // Stop the backend simulation cleanly if the user leaves the /Match page
  useEffect(() => {
    return () => {
      void api.post("/api/match/stop").catch(() => {});
    };
  }, []);

  const add = useCallback((env: Envelope) => {
    if (env.kind === "event") {
      const matchEvent = env.data;

      setEvents((prev) => {
        if (prev.some((e) => e.id === matchEvent.id)) return prev;
        return [...prev, matchEvent];
      });

      if (env.metrics) {
        setLatestMetrics(env.metrics);
        if (env.metrics.halftime_pause || env.metrics.paused) {
          setPaused(true);
        }
      }
    } else if (env.kind === "overlay") {
      const overlayData = env.data;

      setOverlays((prev) => {
        if (prev.some((o) => o.id === overlayData.id)) return prev;
        return [...prev, overlayData];
      });
    } else if (env.kind === "match_ended") {
      if (
        userStartedMatchRef.current &&
        expectedMatchIdRef.current !== env.data.match_id
      ) {
        return;
      }
      setShowMatchRecap(false);
      setMatchSummary(env.data);
      setRecapLoading(true);
      setMatchRecap((current) =>
        current?.match_id === env.data.match_id ? current : null,
      );
      setPaused(false);
      setStatus("ended");
      setDetail("Full time");
    } else if (env.kind === "match_recap") {
      if (
        userStartedMatchRef.current &&
        expectedMatchIdRef.current !== env.data.match_id
      ) {
        return;
      }
      setMatchRecap(env.data);
    }
  }, []);

  useEffect(() => {
    if (!streamActive) {
      matchTriggeredRef.current = false;
      return;
    }

    let isMounted = true;

    const handlers = {
      onMessage: (env: Envelope) => {
        if (isMounted) add(env);
      },
      onStatus: async (next: Status, text?: string) => {
        if (!isMounted) return;
        setStatus(next);
        setDetail(text ?? "");

        if (next === "live" && !matchTriggeredRef.current) {
          matchTriggeredRef.current = true;
          try {
            const response = await api.post("/api/match/start", {
              home_team: dbTeams[0]?.name ?? null,
              away_team: dbTeams[1]?.name ?? null,
              restart: true,
            });
            const matchId = response.data?.match_id;
            if (typeof matchId !== "string") {
              throw new Error("Match start response did not include a match ID.");
            }
            expectedMatchIdRef.current = matchId;
          } catch (error) {
            const message =
              error instanceof ApiError
                ? error.message
                : axios.isAxiosError(error)
                  ? (error.response?.data?.detail ?? error.message)
                  : error instanceof Error
                    ? error.message
                    : "Failed to start match.";
            if (typeof message === "string" && isMounted) {
              setDetail(message);
            }
          }
        }

        if (next === "ended" && isMounted) {
          setStreamActive(false);
          setPaused(false);
          matchTriggeredRef.current = false;
        }
      },
    };

    const cleanupStream = openLiveStream(getWsTicket, handlers);

    return () => {
      isMounted = false;
      matchTriggeredRef.current = false;
      cleanupStream();
    };
  }, [streamActive, streamGeneration, add, getWsTicket, dbTeams]);

  const now = useMemo(
    () =>
      Math.max(
        0,
        ...events.map((e) => e.timestamp),
        ...overlays.map((o) => o.timestamp),
      ),
    [events, overlays],
  );

  const toggleMatch = async () => {
    userStartedMatchRef.current = true;
    if (matchSummary || now >= 5400 || matchStopped) {
      expectedMatchIdRef.current = null;
      setEvents([]);
      setOverlays([]);
      setLatestMetrics(null);
      setMatchSummary(null);
      setMatchRecap(null);
      setRecapLoading(false);
      setDetail("");
      setPaused(false);
      setMatchStopped(false);

      if (streamActive) {
        setStreamGeneration((generation) => generation + 1);
      } else {
        setStreamActive(true);
      }
      return;
    }

    // 1. Kick off a brand new match
    if (!streamActive) {
      expectedMatchIdRef.current = null;
      setEvents([]);
      setOverlays([]);
      setLatestMetrics(null);
      setMatchSummary(null);
      setMatchRecap(null);
      setRecapLoading(false);
      setDetail("");
      setPaused(false);
      setMatchStopped(false);
      setStreamActive(true);
      return;
    }

    // 2. Resume a paused match from the exact second it was paused
    if (paused) {
      try {
        await api.post("/api/match/resume");
        setPaused(false);
      } catch {
        setDetail("Could not resume match.");
      }
      return;
    }

    // 3. Pause the running match on the backend
    try {
      await api.post("/api/match/pause");
      setPaused(true);
    } catch {
      setDetail("Could not pause match.");
    }
  };

  const stopMatch = async () => {
    try {
      await api.post("/api/match/stop");
      setPaused(false);
      setMatchStopped(true);
      setStreamActive(false);
      setStatus("idle");
      setDetail("Match stopped");
    } catch {
      setDetail("Could not stop match.");
    }
  };

  const active =
    overlays.length > 0 ? overlays[overlays.length - 1] : undefined;
  const evidence = useMemo(
    () => new Set(active?.evidence_event_ids ?? []),
    [active],
  );

  const teams = useMemo(() => {
    if (dbTeams[0] && dbTeams[1]) return [dbTeams[0].name, dbTeams[1].name];
    return [...new Set(events.map((e) => e.team))].slice(0, 2);
  }, [events, dbTeams]);

  const colorOf = useCallback(
    (team: string) => {
      if (dbTeams[0] && team === dbTeams[0].name && dbTeams[0].primary_color) {
        return dbTeams[0].primary_color;
      }
      if (dbTeams[1] && team === dbTeams[1].name && dbTeams[1].secondary_color) {
        return dbTeams[1].secondary_color;
      }
      return "#94a3b8";
    },
    [dbTeams],
  );
  const homeColor = colorOf(teams[0] || "Home");
  const awayColor = colorOf(teams[1] || "Away");

  const isRunning = streamActive && !paused;

  if (matchSummary && showMatchRecap && !recapLoading) {
    return (
      <MatchRecapView
        summary={matchSummary}
        recap={matchRecap?.match_id === matchSummary.match_id ? matchRecap : null}
        recapLoading={recapLoading}
        onRestart={() => void toggleMatch()}
        onBackToSelection={() => navigate("/home")}
        onClose={() => setShowMatchRecap(false)}
      />
    );
  }

  return (
    <div className="max-w-[1500px] w-full mx-auto p-3 flex flex-col gap-4 min-h-[calc(100vh-100px)]">
      <div className="shrink-0">
        <Scoreboard
          teams={teams}
          events={events}
          matchTime={matchStopped ? 0 : now}
          homeColor={homeColor}
          awayColor={awayColor}
          running={isRunning}
          paused={paused}
          finished={Boolean(matchSummary) || now >= 5400 || matchStopped}
          status={paused ? "idle" : status}
          detail={paused ? "PAUSED" : detail}
          onToggleMatch={toggleMatch}
          onStopMatch={stopMatch}
          onChangeMatch={() => navigate("/home")}
        />
      </div>

      {matchSummary && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowMatchRecap(true)}
            disabled={recapLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-70"
          >
            {recapLoading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Preparing recap
              </>
            ) : (
              <>
                <BookOpenText className="h-4 w-4" />
                Watch recap
              </>
            )}
          </button>
        </div>
      )}

      <main className="flex flex-col gap-6 flex-1 min-h-0 lg:grid lg:grid-cols-[1fr_450px] xl:grid-cols-[1fr_500px] lg:items-stretch lg:gap-4">
        <section className="flex flex-col gap-4 min-w-0">
          <div className="relative w-full flex justify-center shrink-0">
            <LivePitch
              events={events}
              colorOf={colorOf}
              homeTeam={dbTeams[0]}
              awayTeam={dbTeams[1]}
            />
            {!events.length && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs z-20 rounded-xl border border-slate-600 max-w-[700px] mx-auto">
                <p className="text-slate-300 font-bold tracking-wide text-sm">
                  {status === "live"
                    ? t("awaitingKickoff")
                    : t("pressStartToConnect")}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 auto-rows-[180px] gap-4 shrink-0 md:grid-cols-2 md:auto-rows-[170px] md:h-[170px]">
            <MomentumGraph
              metrics={latestMetrics}
              teams={teams}
              colorOf={colorOf}
              latestEvent={events[events.length - 1]}
            />
            <ActiveOverlay active={active} teams={teams} />
          </div>

          <MatchStats events={events} teams={teams} colorOf={colorOf} />
          {dbTeams[0] && dbTeams[1] && (
            <MatchLineups
              homeTeam={dbTeams[0]}
              awayTeam={dbTeams[1]}
              events={events}
            />
          )}
        </section>

        <div className="bg-slate-900 border border-slate-600 rounded-xl overflow-hidden shadow-lg h-[500px] lg:h-auto lg:max-h-[1150px] flex flex-col">
          <EventFeed events={events} evidence={evidence} colorOf={colorOf} />
        </div>
      </main>
    </div>
  );
}

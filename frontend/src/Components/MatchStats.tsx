import { useEffect, useMemo, useState } from "react";
import { BarChart3, Crosshair, X } from "lucide-react";
import { useTranslation } from "../Utils/i18n";
import { clock } from "../Utils/match-logic";
import type { MatchEvent, TeamPlayer } from "../types";

interface Props {
  events: MatchEvent[];
  teams: string[];
  teamShortCodes: [string, string];
  colorOf: (team: string) => string;
  lockedPlayer?: TeamPlayer | null;
  lockedPlayerTeamName?: string | null;
  onUnlockPlayer?: () => void;
}

type TeamStats = {
  passes: number;
  passesCompleted: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  bigChances: number;
  corners: number;
  tacklesWon: number;
};

const emptyStats = (): TeamStats => ({
  passes: 0,
  passesCompleted: 0,
  shots: 0,
  shotsOnTarget: 0,
  xg: 0,
  bigChances: 0,
  corners: 0,
  tacklesWon: 0,
});

export function MatchStats({
  events,
  teams,
  teamShortCodes,
  colorOf,
  lockedPlayer,
  lockedPlayerTeamName,
  onUnlockPlayer,
}: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"match" | "player">("match");

  // Automatically switch to the player tab whenever a new player is locked
  useEffect(() => {
    if (lockedPlayer) {
      setActiveTab("player");
    } else {
      setActiveTab("match");
    }
  }, [lockedPlayer?.id]);

  const homeTeam = teams[0] || t("home");
  const awayTeam = teams[1] || t("away");
  const homeColor = colorOf(homeTeam);
  const awayColor = colorOf(awayTeam);

  const { home, away, possessionHome, possessionAway, topPlayers } =
    useMemo(() => {
      const h = emptyStats();
      const a = emptyStats();
      const playerScores: Record<
        string,
        { name: string; team: string; rating: number }
      > = {};

      const bumpPlayer = (
        name: string | undefined | null,
        team: string,
        delta: number,
      ) => {
        if (!name || name === "Player") return;
        if (!playerScores[name]) {
          playerScores[name] = { name, team, rating: 6.5 };
        }
        playerScores[name].rating = Math.min(
          9.9,
          Math.max(4.5, playerScores[name].rating + delta),
        );
      };

      for (const ev of events) {
        const target = ev.team === awayTeam ? a : h;

        switch (ev.type) {
          case "pass":
            target.passes += 1;
            if (ev.outcome === "completed") {
              target.passesCompleted += 1;
              bumpPlayer(ev.player, ev.team, 0.04);
            } else {
              bumpPlayer(ev.player, ev.team, -0.05);
            }
            break;

          case "shot":
            target.shots += 1;
            target.xg += ev.xg || 0;
            if (ev.outcome === "goal" || ev.outcome === "saved") {
              target.shotsOnTarget += 1;
              bumpPlayer(ev.player, ev.team, 0.18);
            } else {
              bumpPlayer(ev.player, ev.team, 0.05);
            }
            if ((ev.xg || 0) >= 0.25) {
              target.bigChances += 1;
            }
            break;

          case "goal":
            bumpPlayer(ev.scorer || ev.player, ev.team, 0.85);
            if (ev.assist_player) {
              bumpPlayer(ev.assist_player, ev.team, 0.45);
            }
            break;

          case "save":
            bumpPlayer(ev.player, ev.team, 0.35 + (ev.difficulty || 0) * 0.2);
            break;

          case "corner":
            target.corners += 1;
            break;

          case "tackle":
            if (ev.outcome === "won") {
              target.tacklesWon += 1;
              bumpPlayer(ev.player, ev.team, 0.22);
            }
            break;

          case "card":
            bumpPlayer(
              ev.player,
              ev.team,
              ev.card_color === "red" ? -1.2 : -0.4,
            );
            break;
        }
      }

      const totalPasses = h.passes + a.passes;
      const possHome =
        totalPasses > 0 ? Math.round((h.passes / totalPasses) * 100) : 50;
      const possAway = 100 - possHome;

      const sortedPlayers = Object.values(playerScores)
        .sort((p1, p2) => p2.rating - p1.rating)
        .slice(0, 3);

      return {
        home: h,
        away: a,
        possessionHome: possHome,
        possessionAway: possAway,
        topPlayers: sortedPlayers,
      };
    }, [events, awayTeam]);

  // Compute rich per-player telemetry from the live engine events
  const playerTelemetry = useMemo(() => {
    if (!lockedPlayer) return null;
    const pName = lockedPlayer.name;
    const isAwayPlayer = lockedPlayerTeamName === awayTeam;

    let rating = 6.5;
    let touches = 0;
    let attackingHalfTouches = 0;
    let passesAttempted = 0;
    let passesCompleted = 0;
    let passesReceived = 0;
    let passDistanceTotal = 0;
    let maxSpeedKmh = 0;
    let shots = 0;
    let shotsOnTarget = 0;
    let xg = 0;
    let goals = 0;
    let assists = 0;
    let tacklesWon = 0;
    let pressures = 0;
    let saves = 0;
    let fouls = 0;
    let yellowCards = 0;
    let redCards = 0;
    const recentActions: { id: string; timestamp: number; label: string }[] = [];

    const recordTouch = (x: number) => {
      touches += 1;
      const inAttackingHalf = isAwayPlayer ? x < 50 : x > 50;
      if (inAttackingHalf) attackingHalfTouches += 1;
    };

    for (const ev of events) {
      if (ev.type === "pass") {
        if (ev.player === pName) {
          recordTouch(ev.x);
          passesAttempted += 1;
          if (ev.speed_kmh && ev.speed_kmh > maxSpeedKmh) {
            maxSpeedKmh = ev.speed_kmh;
          }
          if (ev.outcome === "completed") {
            passesCompleted += 1;
            passDistanceTotal += ev.distance || 0;
            rating += 0.04;
            recentActions.push({
              id: ev.id,
              timestamp: ev.timestamp,
              label: `${t("passCompleted")} (${Math.round(ev.distance)}m)`,
            });
          } else {
            rating -= 0.05;
            recentActions.push({
              id: ev.id,
              timestamp: ev.timestamp,
              label: t("passIntercepted"),
            });
          }
        } else if (ev.receiver === pName && ev.outcome === "completed") {
          passesReceived += 1;
          recordTouch(ev.end_x);
        }
      } else if (ev.type === "shot" && ev.player === pName) {
        recordTouch(ev.x);
        shots += 1;
        xg += ev.xg || 0;
        if (ev.speed_kmh && ev.speed_kmh > maxSpeedKmh) {
          maxSpeedKmh = ev.speed_kmh;
        }
        if (ev.outcome === "goal" || ev.outcome === "saved") {
          shotsOnTarget += 1;
          rating += 0.18;
        } else {
          rating += 0.05;
        }
        recentActions.push({
          id: ev.id,
          timestamp: ev.timestamp,
          label:
            ev.outcome === "goal"
              ? t("scoredGoal")
              : `${t("shots")} (${(ev.xg || 0).toFixed(2)} xG)`,
        });
      } else if (ev.type === "goal") {
        if (ev.scorer === pName || ev.player === pName) {
          goals += 1;
          rating += 0.85;
        }
        if (ev.assist_player === pName) {
          assists += 1;
          rating += 0.45;
          recentActions.push({
            id: `${ev.id}_ast`,
            timestamp: ev.timestamp,
            label: `Assist → ${ev.scorer}`,
          });
        }
      } else if (ev.type === "tackle" && ev.player === pName) {
        recordTouch(ev.x);
        if (ev.outcome === "won") {
          tacklesWon += 1;
          rating += 0.22;
          recentActions.push({
            id: ev.id,
            timestamp: ev.timestamp,
            label: t("tackleWon"),
          });
        }
      } else if (ev.type === "pressure" && ev.player === pName) {
        pressures += 1;
        rating += 0.03;
      } else if (ev.type === "save" && ev.player === pName) {
        recordTouch(ev.x);
        saves += 1;
        rating += 0.35 + (ev.difficulty || 0) * 0.2;
        recentActions.push({
          id: ev.id,
          timestamp: ev.timestamp,
          label: t("saveMade"),
        });
      } else if (ev.type === "foul" && ev.player === pName) {
        fouls += 1;
        rating -= 0.1;
      } else if (ev.type === "card" && ev.player === pName) {
        if (ev.card_color === "red") {
          redCards += 1;
          rating -= 1.2;
        } else {
          yellowCards += 1;
          rating -= 0.4;
        }
        recentActions.push({
          id: ev.id,
          timestamp: ev.timestamp,
          label: ev.card_color === "red" ? t("redCard") : t("yellowCard"),
        });
      } else if (
        (ev.type === "corner" || ev.type === "penalty") &&
        (ev.player === pName || ev.taker === pName)
      ) {
        recordTouch(ev.x);
      }
    }

    const clampedRating = Math.min(9.9, Math.max(4.5, rating));
    const passAcc =
      passesAttempted > 0
        ? Math.round((passesCompleted / passesAttempted) * 100)
        : 0;
    const avgPassDist =
      passesCompleted > 0
        ? (passDistanceTotal / passesCompleted).toFixed(1)
        : "0.0";
    const attackingPct =
      touches > 0 ? Math.round((attackingHalfTouches / touches) * 100) : 0;

    return {
      rating: clampedRating,
      touches,
      passesAttempted,
      passesCompleted,
      passAcc,
      passesReceived,
      avgPassDist,
      maxSpeedKmh: maxSpeedKmh.toFixed(1),
      shots,
      shotsOnTarget,
      xg: xg.toFixed(2),
      goals,
      assists,
      tacklesWon,
      pressures,
      saves,
      fouls,
      yellowCards,
      redCards,
      attackingPct,
      recentActions: recentActions.slice(-5).reverse(),
    };
  }, [lockedPlayer, lockedPlayerTeamName, awayTeam, events, t]);

  const homePassAcc =
    home.passes > 0
      ? Math.round((home.passesCompleted / home.passes) * 100)
      : 0;
  const awayPassAcc =
    away.passes > 0
      ? Math.round((away.passesCompleted / away.passes) * 100)
      : 0;

  const showPlayerView = Boolean(
    lockedPlayer && playerTelemetry && activeTab === "player",
  );
  const lockedTeamColor = lockedPlayerTeamName
    ? colorOf(lockedPlayerTeamName)
    : "#f59e0b";

  return (
    <div className="w-full bg-slate-900 border border-slate-600 rounded-xl p-5 sm:p-6 shadow-lg flex flex-col gap-6">
      {/* Top Tab Bar when a Player is Locked */}
      {lockedPlayer && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div
            role="tablist"
            aria-label={t("matchStatistics")}
            className="inline-flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "match"}
              onClick={() => setActiveTab("match")}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "match"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <span>{t("matchStatistics")}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "player"}
              onClick={() => setActiveTab("player")}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "player"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-slate-400 hover:text-amber-300"
              }`}
            >
              <Crosshair className="h-4 w-4 text-amber-400" />
              <span className="truncate max-w-[150px] sm:max-w-[220px]">
                #{lockedPlayer.squad_number} {lockedPlayer.name}
              </span>
            </button>
          </div>

          {onUnlockPlayer && (
            <button
              type="button"
              onClick={onUnlockPlayer}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:border-red-500/50 hover:bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-red-300 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>{t("unlockPlayer")}</span>
            </button>
          )}
        </div>
      )}

      {showPlayerView && lockedPlayer && playerTelemetry ? (
        /* ================= PLAYER TELEMETRY TAB VIEW ================= */
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* Player Identity Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-950/70 border border-slate-800 p-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white text-lg font-black tabular-nums text-white shadow-md"
                style={{ backgroundColor: lockedTeamColor }}
              >
                {lockedPlayer.squad_number}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-white truncate">
                    {lockedPlayer.name}
                  </h3>
                  <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs font-extrabold uppercase text-amber-300">
                    {lockedPlayer.role}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-0.5">
                  {lockedPlayerTeamName} · {lockedPlayer.nationality}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  {t("matchRating")}
                </span>
                <span
                  className={`mt-0.5 rounded-lg px-3 py-1 text-lg font-black tabular-nums ${
                    playerTelemetry.rating >= 7.5
                      ? "bg-emerald-500 text-slate-950"
                      : playerTelemetry.rating >= 6.8
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-800 text-white"
                  }`}
                >
                  {playerTelemetry.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Primary KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <PlayerKpiCard
              label={t("totalTouches")}
              value={String(playerTelemetry.touches)}
              sub={`${playerTelemetry.attackingPct}% ${t("attackingZonePct")}`}
            />
            <PlayerKpiCard
              label={t("passAccuracy")}
              value={`${playerTelemetry.passAcc}%`}
              sub={`${playerTelemetry.passesCompleted}/${playerTelemetry.passesAttempted} (${playerTelemetry.avgPassDist}m)`}
            />
            <PlayerKpiCard
              label={t("shotsOnTarget")}
              value={`${playerTelemetry.shotsOnTarget}/${playerTelemetry.shots}`}
              sub={`${playerTelemetry.xg} xG`}
            />
            <PlayerKpiCard
              label={
                lockedPlayer.position === "GK"
                  ? t("saveMade")
                  : t("goalsAssists")
              }
              value={
                lockedPlayer.position === "GK"
                  ? String(playerTelemetry.saves)
                  : `${playerTelemetry.goals} / ${playerTelemetry.assists}`
              }
              sub={`${t("maxBallSpeed")}: ${playerTelemetry.maxSpeedKmh} km/h`}
            />
          </div>

          {/* Secondary Telemetry Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
            <PlayerMetricBar
              label={t("passAccuracy")}
              display={`${playerTelemetry.passesCompleted}/${playerTelemetry.passesAttempted} (${playerTelemetry.passAcc}%)`}
              pct={playerTelemetry.passAcc}
              color={lockedTeamColor}
            />
            <PlayerMetricBar
              label={t("attackingZonePct")}
              display={`${playerTelemetry.attackingPct}%`}
              pct={playerTelemetry.attackingPct}
              color="#10b981"
            />
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
              <span className="text-sm font-bold text-slate-300">
                {t("passesReceived")}
              </span>
              <span className="text-lg font-black tabular-nums text-white">
                {playerTelemetry.passesReceived}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
              <span className="text-sm font-bold text-slate-300">
                {t("tacklesWon")} / {t("pressureEvent")}
              </span>
              <span className="text-lg font-black tabular-nums text-white">
                {playerTelemetry.tacklesWon} / {playerTelemetry.pressures}
              </span>
            </div>
          </div>

          {/* Recent On-Ball Actions Timeline */}
          <div className="border-t border-slate-800 pt-4 flex flex-col gap-2.5">
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              {t("recentPlayerActions")}
            </span>
            {playerTelemetry.recentActions.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">
                {t("noPlayerEventsYet")}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {playerTelemetry.recentActions.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs sm:text-sm"
                  >
                    <span className="font-semibold text-slate-200 truncate">
                      {act.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-400 shrink-0 tabular-nums">
                      {clock(act.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= TOTAL MATCH STATISTICS TAB VIEW ================= */
        <>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
            <span
              className="text-base sm:text-lg font-black uppercase tracking-widest"
              style={{ color: homeColor }}
            >
              {homeTeam}
            </span>
            <span className="text-sm sm:text-base font-extrabold uppercase tracking-widest text-slate-300">
              {t("matchStatistics")}
            </span>
            <span
              className="text-base sm:text-lg font-black uppercase tracking-widest"
              style={{ color: awayColor }}
            >
              {awayTeam}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
            <StatRow
              label={t("possession")}
              leftDisplay={`${possessionHome}%`}
              rightDisplay={`${possessionAway}%`}
              leftVal={possessionHome}
              rightVal={possessionAway}
              leftColor={homeColor}
              rightColor={awayColor}
            />
            <StatRow
              label={t("expectedGoals")}
              leftDisplay={home.xg.toFixed(2)}
              rightDisplay={away.xg.toFixed(2)}
              leftVal={home.xg}
              rightVal={away.xg}
              leftColor={homeColor}
              rightColor={awayColor}
            />
            <StatRow
              label={t("totalShots")}
              leftDisplay={String(home.shots)}
              rightDisplay={String(away.shots)}
              leftVal={home.shots}
              rightVal={away.shots}
              leftColor={homeColor}
              rightColor={awayColor}
            />
            <StatRow
              label={t("shotsOnTarget")}
              leftDisplay={String(home.shotsOnTarget)}
              rightDisplay={String(away.shotsOnTarget)}
              leftVal={home.shotsOnTarget}
              rightVal={away.shotsOnTarget}
              leftColor={homeColor}
              rightColor={awayColor}
            />
            <StatRow
              label={t("bigChances")}
              leftDisplay={String(home.bigChances)}
              rightDisplay={String(away.bigChances)}
              leftVal={home.bigChances}
              rightVal={away.bigChances}
              leftColor={homeColor}
              rightColor={awayColor}
            />
            <StatRow
              label={t("passAccuracy")}
              leftDisplay={`${homePassAcc}%`}
              rightDisplay={`${awayPassAcc}%`}
              leftVal={homePassAcc}
              rightVal={awayPassAcc}
              leftColor={homeColor}
              rightColor={awayColor}
            />
            <StatRow
              label={t("corners")}
              leftDisplay={String(home.corners)}
              rightDisplay={String(away.corners)}
              leftVal={home.corners}
              rightVal={away.corners}
              leftColor={homeColor}
              rightColor={awayColor}
            />
            <StatRow
              label={t("tacklesWon")}
              leftDisplay={String(home.tacklesWon)}
              rightDisplay={String(away.tacklesWon)}
              leftVal={home.tacklesWon}
              rightVal={away.tacklesWon}
              leftColor={homeColor}
              rightColor={awayColor}
            />
          </div>

          {topPlayers.length > 0 && (
            <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
              <span className="text-sm font-extrabold uppercase tracking-widest text-slate-300">
                {t("topRatedPlayers")}
              </span>
              <div className="flex flex-col gap-2">
                {topPlayers.map((p) => {
                  const playerColor = colorOf(p.team);
                  const teamCode =
                    p.team === homeTeam
                      ? teamShortCodes[0]
                      : p.team === awayTeam
                        ? teamShortCodes[1]
                        : "";
                  const badgeColor =
                    p.rating >= 7.5
                      ? "bg-emerald-500 text-slate-950"
                      : p.rating >= 6.8
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-700 text-slate-200";

                  return (
                    <div
                      key={p.name}
                      className="flex min-w-0 items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5"
                    >
                      <span
                        className={`px-2 py-0.5 rounded-md text-sm sm:text-base font-black tabular-nums shrink-0 ${badgeColor}`}
                      >
                        {p.rating.toFixed(1)}
                      </span>
                      <span className="min-w-0 flex-1 text-base font-bold text-slate-100">
                        {p.name}
                      </span>
                      <span
                        className="text-xs sm:text-sm font-bold shrink-0"
                        style={{ color: playerColor }}
                        title={p.team}
                      >
                        {teamCode || p.team}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlayerKpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className="my-1 text-2xl sm:text-3xl font-black tabular-nums text-white">
        {value}
      </span>
      <span className="text-[11px] font-semibold text-slate-400 truncate">
        {sub}
      </span>
    </div>
  );
}

function PlayerMetricBar({
  label,
  display,
  pct,
  color,
}: {
  label: string;
  display: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-300">{label}</span>
        <span className="text-base font-black tabular-nums text-white">
          {display}
        </span>
      </div>
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function StatRow({
  label,
  leftDisplay,
  rightDisplay,
  leftVal,
  rightVal,
  leftColor,
  rightColor,
}: {
  label: string;
  leftDisplay: string;
  rightDisplay: string;
  leftVal: number;
  rightVal: number;
  leftColor: string;
  rightColor: string;
}) {
  const total = leftVal + rightVal;
  const leftPct = total > 0 ? (leftVal / total) * 100 : 50;
  const rightPct = total > 0 ? (rightVal / total) * 100 : 50;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-lg sm:text-xl font-black text-white tabular-nums w-16 text-left">
          {leftDisplay}
        </span>
        <span className="text-sm sm:text-base font-bold text-slate-300 tracking-wide text-center">
          {label}
        </span>
        <span className="text-lg sm:text-xl font-black text-white tabular-nums w-16 text-right">
          {rightDisplay}
        </span>
      </div>

      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
        {total === 0 ? (
          <div className="w-full h-full bg-slate-800" />
        ) : (
          <>
            <div
              className="h-full rounded-l-full transition-all duration-500"
              style={{ width: `${leftPct}%`, backgroundColor: leftColor }}
            />
            <div
              className="h-full rounded-r-full transition-all duration-500"
              style={{ width: `${rightPct}%`, backgroundColor: rightColor }}
            />
          </>
        )}
      </div>
    </div>
  );
}
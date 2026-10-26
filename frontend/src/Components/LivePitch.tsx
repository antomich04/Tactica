import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "../Utils/i18n";
import type { ClubTeam, MatchEvent, SetPieceEvent, TeamPlayer } from "../types";

interface LivePitchProps {
  events: MatchEvent[];
  colorOf: (team: string) => string;
  homeTeam: ClubTeam | null;
  awayTeam: ClubTeam | null;
}

interface PlayerCoord {
  x: number;
  y: number;
  color: string;
  isActive: boolean;
  transitionSec: number;
}

const MAX_SNAP_DISTANCE = 25;

// Attacking depth (0-100 pitch X from own goal) vs Defending depth
const ATTACKING_LINE: Record<string, number> = {
  GK: 8,
  RB: 34,
  RCB: 26,
  CB: 24,
  LCB: 26,
  LB: 34,
  RDM: 44,
  CDM: 42,
  LDM: 44,
  RM: 58,
  RCM: 52,
  CM: 50,
  LCM: 52,
  LM: 58,
  CAM: 66,
  RW: 74,
  LW: 74,
  RS: 78,
  ST: 80,
  LS: 78,
};

const DEFENDING_LINE: Record<string, number> = {
  GK: 5,
  RB: 19,
  RCB: 17,
  CB: 16,
  LCB: 17,
  LB: 19,
  RDM: 29,
  CDM: 27,
  LDM: 29,
  RM: 36,
  RCM: 34,
  CM: 33,
  LCM: 34,
  LM: 36,
  CAM: 43,
  RW: 48,
  LW: 48,
  RS: 52,
  ST: 54,
  LS: 52,
};

// Wide spread when attacking (SVG Y: 1 to 67, center is 34)
const ATTACKING_WIDTH_Y: Record<string, number> = {
  GK: 34,
  RB: 9,
  RCB: 23,
  CB: 34,
  LCB: 45,
  LB: 59,
  RDM: 22,
  CDM: 34,
  LDM: 46,
  RM: 8,
  RCM: 23,
  CM: 34,
  LCM: 45,
  LM: 60,
  CAM: 34,
  RW: 10,
  LW: 58,
  RS: 25,
  ST: 34,
  LS: 43,
};

// Compact width when defending
const DEFENDING_WIDTH_Y: Record<string, number> = {
  GK: 34,
  RB: 16,
  RCB: 26,
  CB: 34,
  LCB: 42,
  LB: 52,
  RDM: 25,
  CDM: 34,
  LDM: 43,
  RM: 15,
  RCM: 26,
  CM: 34,
  LCM: 42,
  LM: 53,
  CAM: 34,
  RW: 19,
  LW: 49,
  RS: 28,
  ST: 34,
  LS: 40,
};

function getTacticalSlot(
  player: TeamPlayer,
  isAway: boolean,
  isAttacking: boolean,
  playersAtPosition: TeamPlayer[],
  ballX: number,
  ballY: number,
  phaseTime: number,
): { x: number; y: number } {
  const fallbackAtk = { GK: 8, DEF: 28, MID: 52, FWD: 76 }[player.position];
  const fallbackDef = { GK: 5, DEF: 18, MID: 33, FWD: 50 }[player.position];

  const baseProgress = isAttacking
    ? (ATTACKING_LINE[player.role] ?? fallbackAtk)
    : (DEFENDING_LINE[player.role] ?? fallbackDef);

  // Team's ball progress from 0 (own goal) to 100 (opponent goal)
  const teamBallProgress = isAway ? 100 - ballX : ballX;

  let targetProgress = baseProgress;
  if (player.position === "GK") {
    targetProgress = baseProgress + Math.max(0, (teamBallProgress - 50) * 0.08);
  } else if (isAttacking) {
    // Push formation up with the ball and stagger lines
    const pushFactor =
      player.position === "FWD"
        ? 0.28
        : player.position === "MID"
          ? 0.34
          : 0.24;
    targetProgress = baseProgress + (teamBallProgress - 48) * pushFactor;
  } else {
    // Out of possession: drop into a compact block behind the ball
    const compressFactor =
      player.position === "DEF"
        ? 0.22
        : player.position === "MID"
          ? 0.28
          : 0.32;
    targetProgress = baseProgress + (teamBallProgress - 35) * compressFactor;

    // Defenders & DMs stay goal-side of the ball when defending deep
    if (player.position === "DEF" && teamBallProgress < 45) {
      targetProgress = Math.min(targetProgress, Math.max(9, teamBallProgress - 5));
    }
  }

  // Individual organic micro-drift (so lines never move like rigid bars)
  const seed = player.id * 1.73 + player.squad_number * 0.91;
  const microX =
    player.position === "GK"
      ? 0
      : Math.sin(phaseTime * 0.55 + seed) * 1.8 +
        Math.cos(phaseTime * 0.31 + seed * 2) * 1.1;
  const microY =
    player.position === "GK"
      ? 0
      : Math.cos(phaseTime * 0.48 + seed * 1.3) * 1.4;

  const clampedProgress = Math.max(3, Math.min(95, targetProgress + microX));
  const finalX = isAway ? 100 - clampedProgress : clampedProgress;

  // Width calculation (SVG Y is 1..67, center 34)
  const index = playersAtPosition.findIndex((c) => c.id === player.id);
  const fallbackY =
    playersAtPosition.length === 1
      ? 34
      : 12 + (index * 44) / (playersAtPosition.length - 1);

  const rawBaseY = isAttacking
    ? (ATTACKING_WIDTH_Y[player.role] ?? fallbackY)
    : (DEFENDING_WIDTH_Y[player.role] ?? fallbackY);

  const orientedBaseY = isAway ? 68 - rawBaseY : rawBaseY;
  const ballSvgY = 1 + (ballY / 100) * 66;

  // Defending block shifts strongly toward ball side; attacking team stays wider
  const lateralPull =
    player.position === "GK"
      ? (ballSvgY - 34) * 0.1
      : isAttacking
        ? (ballSvgY - 34) * 0.16
        : (ballSvgY - 34) * 0.34;

  const finalY = Math.max(
    4.5,
    Math.min(63.5, orientedBaseY + lateralPull + microY),
  );

  return { x: finalX, y: finalY };
}

function computeTeamCoordinates(
  team: ClubTeam,
  players: TeamPlayer[],
  isAway: boolean,
  isAttacking: boolean,
  ballX: number,
  ballY: number,
  phaseTime: number,
  latestEvent?: MatchEvent,
  penaltyEvent?: SetPieceEvent & { type: "penalty" },
  penaltyShot?: MatchEvent,
): Map<number, PlayerCoord> {
  const color = isAway ? team.secondary_color : team.primary_color;
  const result = new Map<number, PlayerCoord>();

  // 1. Handle Penalty Set-Piece Layout
  if (penaltyEvent) {
    const penaltyTeamIsAway =
      penaltyEvent.team === team.name ? isAway : !isAway;
    const attackingDirection = penaltyTeamIsAway ? -1 : 1;
    const penaltyX = penaltyEvent.x;
    const outfieldPlayers = players.filter(
      (c) =>
        c.position !== "GK" &&
        c.name !== penaltyEvent.player &&
        c.name !== penaltyEvent.taker,
    );

    for (const player of players) {
      const isKeeper = player.position === "GK";
      const isTaker =
        penaltyEvent.team === team.name &&
        (penaltyEvent.taker === player.name ||
          penaltyEvent.player === player.name);

      if (isKeeper) {
        result.set(player.id, {
          x: isAway ? 98 : 2,
          y: 34,
          color,
          isActive: false,
          transitionSec: 0.6,
        });
        continue;
      }
      if (isTaker) {
        result.set(player.id, {
          x: penaltyShot?.x ?? penaltyEvent.x,
          y: 34,
          color,
          isActive: true,
          transitionSec: 0.45,
        });
        continue;
      }

      const pIdx = outfieldPlayers.findIndex((c) => c.id === player.id);
      if (pIdx >= 0 && pIdx < 5) {
        result.set(player.id, {
          x: penaltyX - attackingDirection * 5,
          y: 13 + (pIdx * 42) / 4,
          color,
          isActive: false,
          transitionSec: 0.7,
        });
        continue;
      }

      const playersAtPos = players.filter(
        (c) => c.position === player.position,
      );
      const slot = getTacticalSlot(
        player,
        isAway,
        isAttacking,
        playersAtPos,
        ballX,
        ballY,
        phaseTime,
      );
      result.set(player.id, {
        ...slot,
        color,
        isActive: false,
        transitionSec: 0.75,
      });
    }
    return result;
  }

  // 2. Compute natural tactical slots for all 11 players first
  const baseSlots = new Map<number, { x: number; y: number }>();
  for (const player of players) {
    const playersAtPos = players.filter((c) => c.position === player.position);
    baseSlots.set(
      player.id,
      getTacticalSlot(
        player,
        isAway,
        isAttacking,
        playersAtPos,
        ballX,
        ballY,
        phaseTime,
      ),
    );
  }

  const distTo = (
    p: TeamPlayer,
    targetX: number,
    targetSvgY: number,
  ): number => {
    const slot = baseSlots.get(p.id)!;
    // Convert SVG Y difference to approximate pitch units for distance check
    const dyPitch = ((slot.y - targetSvgY) / 66) * 100;
    return Math.hypot(slot.x - targetX, dyPitch);
  };

  const findBestOutfieldActor = (
    namedPlayer: string | null | undefined,
    targetX: number,
    targetSvgY: number,
    excludeId?: number,
  ): TeamPlayer | undefined => {
    const outfield = players.filter(
      (p) => p.position !== "GK" && p.id !== excludeId,
    );
    if (!outfield.length) return undefined;

    const named = outfield.find((p) => p.name === namedPlayer);
    if (named && distTo(named, targetX, targetSvgY) <= MAX_SNAP_DISTANCE) {
      return named;
    }

    // If the named player is way across the pitch, pick the teammate already in that zone
    return [...outfield].sort(
      (a, b) => distTo(a, targetX, targetSvgY) - distTo(b, targetX, targetSvgY),
    )[0];
  };

  let activeCarrierId: number | undefined;
  let activeReceiverId: number | undefined;
  let activePresserId: number | undefined;

  const eventStartSvgY = latestEvent ? (latestEvent.y / 100) * 66 + 1 : 34;

  if (
    latestEvent &&
    latestEvent.type !== "substitution" &&
    latestEvent.type !== "card" &&
    latestEvent.type !== "injury"
  ) {
    if (latestEvent.team === team.name) {
      // Our team triggered the event
      if (latestEvent.type === "save") {
        const gk = players.find((p) => p.position === "GK");
        activeCarrierId = gk?.id;
      } else {
        const carrier = findBestOutfieldActor(
          latestEvent.player,
          latestEvent.x,
          eventStartSvgY,
        );
        activeCarrierId = carrier?.id;

        if (latestEvent.type === "pass" && latestEvent.receiver) {
          const endSvgY = (latestEvent.end_y / 100) * 66 + 1;
          const receiver = findBestOutfieldActor(
            latestEvent.receiver,
            latestEvent.end_x,
            endSvgY,
            activeCarrierId,
          );
          activeReceiverId = receiver?.id;
        }
      }
    } else {
      // Opponent has the ball: only 1 nearby defender steps out to press
      const pressTargetX =
        "end_x" in latestEvent && typeof latestEvent.end_x === "number"
          ? latestEvent.end_x
          : latestEvent.x;
      const pressTargetSvgY =
        "end_y" in latestEvent && typeof latestEvent.end_y === "number"
          ? (latestEvent.end_y / 100) * 66 + 1
          : eventStartSvgY;

      const presser = findBestOutfieldActor(
        "opponent_player" in latestEvent
          ? latestEvent.opponent_player
          : undefined,
        pressTargetX,
        pressTargetSvgY,
      );
      if (
        presser &&
        distTo(presser, pressTargetX, pressTargetSvgY) <= MAX_SNAP_DISTANCE + 6
      ) {
        activePresserId = presser.id;
      }
    }
  }

  // 3. Assign final coordinates and natural per-player transition speeds
  for (const player of players) {
    const slot = baseSlots.get(player.id)!;
    // Slight individual transition variation (0.58s - 0.88s) so players don't move in robotic sync
    const baseSpeed =
      player.position === "FWD"
        ? 0.62
        : player.position === "MID"
          ? 0.68
          : 0.75;
    const speedJitter = ((player.id % 5) - 2) * 0.04;
    const transitionSec = Number((baseSpeed + speedJitter).toFixed(2));

    if (latestEvent && player.id === activeCarrierId) {
      result.set(player.id, {
        x: latestEvent.x,
        y: eventStartSvgY,
        color,
        isActive: true,
        transitionSec: 0.48,
      });
      continue;
    }

    if (
      latestEvent &&
      latestEvent.type === "pass" &&
      player.id === activeReceiverId
    ) {
      result.set(player.id, {
        x: latestEvent.end_x,
        y: (latestEvent.end_y / 100) * 66 + 1,
        color,
        isActive: true,
        transitionSec: 0.52,
      });
      continue;
    }

    if (latestEvent && player.id === activePresserId) {
      const pressX =
        "end_x" in latestEvent && typeof latestEvent.end_x === "number"
          ? latestEvent.end_x
          : latestEvent.x;
      const pressY =
        "end_y" in latestEvent && typeof latestEvent.end_y === "number"
          ? (latestEvent.end_y / 100) * 66 + 1
          : eventStartSvgY;
      const goalSideOffset = isAway ? 2.4 : -2.4;

      result.set(player.id, {
        x: Math.min(96, Math.max(4, pressX + goalSideOffset)),
        y: Math.min(63, Math.max(5, pressY + (slot.y > pressY ? 1.2 : -1.2))),
        color,
        isActive:
          latestEvent.type === "tackle" || latestEvent.type === "pressure",
        transitionSec: 0.55,
      });
      continue;
    }

    result.set(player.id, {
      x: slot.x,
      y: slot.y,
      color,
      isActive: false,
      transitionSec,
    });
  }

  return result;
}

function activePlayers(
  team: ClubTeam,
  events: MatchEvent[],
  completedSubstitutions: Set<string>,
): TeamPlayer[] {
  const active = [...team.roster.starters];
  const substitutions = events
    .filter(
      (event) => event.type === "substitution" && event.team === team.name,
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  for (const event of substitutions) {
    if (event.type !== "substitution" || !event.details) continue;
    if (!completedSubstitutions.has(event.id)) continue;
    const detailsParts = event.details.split(" replaces ");
    const offName =
      event.player_off ?? detailsParts[detailsParts.length - 1]?.trim();
    const incoming = team.roster.substitutes.find(
      (player) => player.name === event.player,
    );
    const outgoingIndex = active.findIndex((player) => player.name === offName);
    if (incoming && outgoingIndex >= 0) {
      active.splice(outgoingIndex, 1, incoming);
    }
  }
  return active;
}

export function LivePitch({
  events,
  colorOf,
  homeTeam,
  awayTeam,
}: LivePitchProps) {
  const { t } = useTranslation();
  const [completedSubstitutions, setCompletedSubstitutions] = useState<
    Set<string>
  >(() => new Set());
  const substitutionTimers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    for (const event of events) {
      if (
        event.type !== "substitution" ||
        completedSubstitutions.has(event.id) ||
        substitutionTimers.current.has(event.id)
      )
        continue;
      const timer = window.setTimeout(() => {
        substitutionTimers.current.delete(event.id);
        setCompletedSubstitutions((completed) =>
          new Set(completed).add(event.id),
        );
      }, 950);
      substitutionTimers.current.set(event.id, timer);
    }
  }, [events, completedSubstitutions]);

  useEffect(
    () => () => {
      for (const timer of substitutionTimers.current.values()) {
        window.clearTimeout(timer);
      }
    },
    [],
  );

  const visibleEvents = useMemo(() => events.slice(-6), [events]);
  const latestBallEvent = [...events]
    .reverse()
    .find(
      (event) =>
        event.type !== "substitution" &&
        event.type !== "card" &&
        event.type !== "injury",
    );

  // Determine which team currently has attacking possession
  const possessionTeam = useMemo(() => {
    if (!latestBallEvent) return homeTeam?.name;
    if (latestBallEvent.type === "possession_change") {
      return latestBallEvent.new_team;
    }
    return latestBallEvent.team;
  }, [latestBallEvent, homeTeam?.name]);

  const penaltyEvent = [...events]
    .reverse()
    .find(
      (event): event is SetPieceEvent & { type: "penalty" } =>
        event.type === "penalty",
    );
  const penaltyShot =
    penaltyEvent &&
    events.find(
      (event) =>
        event.type === "shot" && event.id.startsWith(`${penaltyEvent.id}_shot`),
    );
  const latestPenalty =
    penaltyEvent &&
    !events
      .slice(events.indexOf(penaltyEvent) + 1)
      .some((event) => event.type === "goal" || event.type === "save")
      ? penaltyEvent
      : undefined;
  const activePenaltyShot = latestPenalty ? penaltyShot : undefined;

  const pendingSubstitution = [...events]
    .reverse()
    .find(
      (event) =>
        event.type === "substitution" && !completedSubstitutions.has(event.id),
    );
  const playerComingOff =
    pendingSubstitution?.type === "substitution"
      ? (pendingSubstitution.player_off ??
        pendingSubstitution.details?.split(" replaces ").slice(-1)[0]?.trim())
      : undefined;

  const ballTo =
    latestBallEvent &&
    "end_x" in latestBallEvent &&
    typeof latestBallEvent.end_x === "number" &&
    typeof latestBallEvent.end_y === "number"
      ? { x: latestBallEvent.end_x, y: latestBallEvent.end_y }
      : latestBallEvent
        ? { x: latestBallEvent.x, y: latestBallEvent.y }
        : { x: 50, y: 50 };

  const homePlayers = homeTeam
    ? activePlayers(homeTeam, events, completedSubstitutions)
    : [];
  const awayPlayers = awayTeam
    ? activePlayers(awayTeam, events, completedSubstitutions)
    : [];

  const phaseTime = latestBallEvent ? latestBallEvent.timestamp / 12 : 0;

  const homeCoordinates = useMemo(() => {
    if (!homeTeam) return new Map<number, PlayerCoord>();
    const isHomeAttacking = possessionTeam === homeTeam.name;
    return computeTeamCoordinates(
      homeTeam,
      homePlayers,
      false,
      isHomeAttacking,
      ballTo.x,
      ballTo.y,
      phaseTime,
      latestBallEvent,
      latestPenalty,
      activePenaltyShot,
    );
  }, [
    homeTeam,
    homePlayers,
    possessionTeam,
    ballTo.x,
    ballTo.y,
    phaseTime,
    latestBallEvent,
    latestPenalty,
    activePenaltyShot,
  ]);

  const awayCoordinates = useMemo(() => {
    if (!awayTeam) return new Map<number, PlayerCoord>();
    const isAwayAttacking = possessionTeam === awayTeam.name;
    return computeTeamCoordinates(
      awayTeam,
      awayPlayers,
      true,
      isAwayAttacking,
      ballTo.x,
      ballTo.y,
      phaseTime,
      latestBallEvent,
      latestPenalty,
      activePenaltyShot,
    );
  }, [
    awayTeam,
    awayPlayers,
    possessionTeam,
    ballTo.x,
    ballTo.y,
    phaseTime,
    latestBallEvent,
    latestPenalty,
    activePenaltyShot,
  ]);

  const sx = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return 1 + (clamped / 100) * 103;
  };

  const sy = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return 1 + (clamped / 100) * 66;
  };

  const ballSvgX = sx(ballTo.x);
  const ballSvgY = sy(ballTo.y);

  return (
    <div
      role="img"
      aria-label={t("livePitchLabel")}
      className="w-full max-w-[700px] mx-auto relative bg-emerald-900/40 border-2 border-slate-600 rounded-xl overflow-hidden aspect-[105/68] shadow-2xl"
    >
      {/* Pitch Markings */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 105 68"
      >
        <rect
          x="1"
          y="1"
          width="103"
          height="66"
          fill="none"
          stroke="rgba(148, 163, 184, 0.5)"
          strokeWidth="0.6"
        />
        <line
          x1="52.5"
          y1="1"
          x2="52.5"
          y2="67"
          stroke="rgba(148, 163, 184, 0.5)"
          strokeWidth="0.6"
        />
        <circle
          cx="52.5"
          cy="34"
          r="9.15"
          fill="none"
          stroke="rgba(148, 163, 184, 0.5)"
          strokeWidth="0.6"
        />
        <rect
          x="1"
          y="13.85"
          width="16.5"
          height="40.3"
          fill="none"
          stroke="rgba(148, 163, 184, 0.5)"
          strokeWidth="0.6"
        />
        <rect
          x="87.5"
          y="13.85"
          width="16.5"
          height="40.3"
          fill="none"
          stroke="rgba(148, 163, 184, 0.5)"
          strokeWidth="0.6"
        />
        <rect
          x="1"
          y="24.84"
          width="5.5"
          height="18.32"
          fill="none"
          stroke="rgba(148, 163, 184, 0.5)"
          strokeWidth="0.6"
        />
        <rect
          x="98.5"
          y="24.84"
          width="5.5"
          height="18.32"
          fill="none"
          stroke="rgba(148, 163, 184, 0.5)"
          strokeWidth="0.6"
        />
      </svg>

      {/* Dynamic Players, Event Trails & Ball */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox="0 0 105 68"
      >
        {visibleEvents.map((event, index) => {
          const color = colorOf(event.team);
          const opacity = 0.25 + (0.75 * (index + 1)) / visibleEvents.length;

          const x = sx(event.x ?? 50);
          const y = sy(event.y ?? 50);

          if (event.type === "pass") {
            const endX = sx(event.end_x);
            const endY = sy(event.end_y);
            const isIntercepted = event.outcome === "intercepted";
            return (
              <g key={event.id} opacity={opacity}>
                <line
                  x1={x}
                  y1={y}
                  x2={endX}
                  y2={endY}
                  stroke={color}
                  strokeWidth="0.6"
                  strokeDasharray={isIntercepted ? "1.5, 1.5" : "none"}
                />
                <circle cx={x} cy={y} r="0.6" fill={color} />
              </g>
            );
          }

          if ("xg" in event) {
            const radius = Math.max(1.2, event.xg * 5);
            const isGoal = event.outcome === "goal";
            return (
              <g key={event.id} opacity={opacity}>
                {typeof event.end_x === "number" &&
                  typeof event.end_y === "number" && (
                    <line
                      x1={x}
                      y1={y}
                      x2={sx(event.end_x)}
                      y2={sy(event.end_y)}
                      stroke={color}
                      strokeWidth="0.7"
                    />
                  )}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.45"
                />
                <circle cx={x} cy={y} r={radius * 0.4} fill={color} />

                {isGoal && (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 1.5}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="0.5"
                  >
                    <animate
                      attributeName="r"
                      values={`${radius};${radius + 6}`}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="1;0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          }

          if (event.type === "card") {
            const cardColor =
              event.card_color === "red" ? "#ef4444" : "#eab308";

            return (
              <g key={event.id} opacity={opacity}>
                <rect
                  x={x - 1.5}
                  y={y - 2}
                  width="3"
                  height="4"
                  fill={cardColor}
                  stroke="#ffffff"
                  strokeWidth="0.4"
                  rx="0.5"
                />
              </g>
            );
          }

          return null;
        })}

        {/* Home Players */}
        {homeTeam &&
          homePlayers.map((player) => {
            const position = homeCoordinates.get(player.id);
            if (!position) return null;
            const x = sx(position.x);
            const isComingOff =
              player.name === playerComingOff &&
              pendingSubstitution?.team === homeTeam.name;
            const y = isComingOff ? (position.y < 34 ? -3 : 71) : position.y;

            return (
              <g
                key={`home-${player.id}`}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  transition: `transform ${position.transitionSec}s cubic-bezier(0.25, 0.9, 0.35, 1)`,
                }}
              >
                <title>{`${homeTeam.name}: ${player.name} (#${player.squad_number})`}</title>
                {position.isActive && (
                  <circle
                    cx={0}
                    cy={0}
                    r="3.4"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="0.45"
                    opacity="0.85"
                  />
                )}
                <circle
                  cx={0}
                  cy={0}
                  r="2.25"
                  fill={position.color || "#ef4444"}
                  stroke="#fff"
                  strokeWidth="0.45"
                />
                <text
                  x={0}
                  y={0.85}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="2.5"
                  fontWeight="800"
                  paintOrder="stroke"
                  stroke="#0f172a"
                  strokeWidth="0.4"
                >
                  {player.squad_number}
                </text>
              </g>
            );
          })}

        {/* Away Players */}
        {awayTeam &&
          awayPlayers.map((player) => {
            const position = awayCoordinates.get(player.id);
            if (!position) return null;
            const x = sx(position.x);
            const isComingOff =
              player.name === playerComingOff &&
              pendingSubstitution?.team === awayTeam.name;
            const y = isComingOff ? (position.y < 34 ? -3 : 71) : position.y;

            return (
              <g
                key={`away-${player.id}`}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  transition: `transform ${position.transitionSec}s cubic-bezier(0.25, 0.9, 0.35, 1)`,
                }}
              >
                <title>{`${awayTeam.name}: ${player.name} (#${player.squad_number})`}</title>
                {position.isActive && (
                  <circle
                    cx={0}
                    cy={0}
                    r="3.4"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="0.45"
                    opacity="0.85"
                  />
                )}
                <circle
                  cx={0}
                  cy={0}
                  r="2.25"
                  fill={position.color || "#38bdf8"}
                  stroke="#fff"
                  strokeWidth="0.45"
                />
                <text
                  x={0}
                  y={0.85}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="2.5"
                  fontWeight="800"
                  paintOrder="stroke"
                  stroke="#0f172a"
                  strokeWidth="0.4"
                >
                  {player.squad_number}
                </text>
              </g>
            );
          })}

        {/* Smooth Gliding Realistic Football */}
        <g
          aria-label={t("ball")}
          style={{
            transform: `translate(${ballSvgX}px, ${ballSvgY}px)`,
            transition: "transform 0.48s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <circle cx={0} cy={0} r="2.2" fill="rgba(255,255,255,0.2)" />
          <circle
            cx={0}
            cy={0}
            r="1.45"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="0.35"
          />
          <polygon
            points="0,-0.75 0.7,-0.22 0.43,0.62 -0.43,0.62 -0.7,-0.22"
            fill="#0f172a"
          />
        </g>
      </svg>
    </div>
  );
}
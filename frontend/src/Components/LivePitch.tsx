import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "../Utils/i18n";
import type { ClubTeam, MatchEvent, SetPieceEvent, TeamPlayer } from "../types";

interface LivePitchProps {
  events: MatchEvent[];
  colorOf: (team: string) => string;
  homeTeam: ClubTeam | null;
  awayTeam: ClubTeam | null;
}

function getDynamicPlayerCoordinates(
  player: TeamPlayer,
  team: ClubTeam,
  isAway: boolean,
  playersAtPosition: TeamPlayer[],
  allPlayers: TeamPlayer[],
  ballX: number,
  ballY: number,
  latestEvent?: MatchEvent,
  penaltyEvent?: SetPieceEvent & { type: "penalty" },
  penaltyShot?: MatchEvent,
) {
  const color = isAway ? team.secondary_color : team.primary_color;

  if (penaltyEvent) {
    const penaltyTeamIsAway = penaltyEvent.team === team.name ? isAway : !isAway;
    const attackingDirection = penaltyTeamIsAway ? -1 : 1;
    const penaltyX = penaltyEvent.x;
    const keeper = player.position === "GK";
    const isPenaltyTaker =
      penaltyEvent.team === team.name &&
      (penaltyEvent.taker === player.name || penaltyEvent.player === player.name);

    if (keeper) {
      return {
        x: isAway ? 98 : 2,
        y: 34,
        color,
        isActive: false,
      };
    }
    if (isPenaltyTaker) {
      return {
        x: penaltyShot?.x ?? penaltyEvent.x,
        y: 34,
        color,
        isActive: true,
      };
    }

    const outfieldPlayers = allPlayers.filter(
      (candidate) => candidate.position !== "GK" &&
        candidate.name !== penaltyEvent.player &&
        candidate.name !== penaltyEvent.taker,
    );
    const playerIndex = outfieldPlayers.findIndex(
      (candidate) => candidate.id === player.id,
    );
    if (playerIndex >= 0 && playerIndex < 5) {
      const y = 13 + (playerIndex * 42) / 4;
      const edgeOfBoxX = penaltyX - attackingDirection * 5;
      return {
        x: edgeOfBoxX,
        y,
        color,
        isActive: false,
      };
    }

    const regularPosition = getFormationPosition(
      player,
      isAway,
      playersAtPosition,
      ballX,
      ballY,
    );
    return {
      ...regularPosition,
      color,
      isActive: false,
    };
  }

  if (latestEvent) {
    if (
      latestEvent.type !== "substitution" &&
      latestEvent.type !== "card" &&
      latestEvent.type !== "injury" &&
      latestEvent.team === team.name &&
      latestEvent.player === player.name
    ) {
      return {
        x: latestEvent.x,
        y: (latestEvent.y / 100) * 66 + 1,
        color,
        isActive: true,
      };
    }
    if (
      latestEvent.type === "pass" &&
      latestEvent.team === team.name &&
      latestEvent.receiver === player.name
    ) {
      return {
        x: latestEvent.end_x,
        y: (latestEvent.end_y / 100) * 66 + 1,
        color,
        isActive: true,
      };
    }
    if (
      (latestEvent.type === "tackle" || latestEvent.type === "pressure") &&
      latestEvent.opponent_player === player.name
    ) {
      return {
        x: Math.min(96, Math.max(4, latestEvent.x + (isAway ? 1.8 : -1.8))),
        y: (latestEvent.y / 100) * 66 + 1,
        color,
        isActive: true,
      };
    }
  }

  const position = getFormationPosition(
    player,
    isAway,
    playersAtPosition,
    ballX,
    ballY,
  );
  return { ...position, color, isActive: false };
}

function getFormationPosition(
  player: TeamPlayer,
  isAway: boolean,
  playersAtPosition: TeamPlayer[],
  ballX: number,
  ballY: number,
) {
  const roleLine: Record<string, number> = {
    GK: 6,
    RB: 24, RCB: 24, CB: 24, LCB: 24, LB: 24,
    RDM: 36, CDM: 36, LDM: 36,
    RM: 43, RCM: 43, CM: 43, LCM: 43, LM: 43,
    CAM: 56,
    RW: 64, LW: 64, RS: 67, ST: 67, LS: 67,
  };
  const baseLine = roleLine[player.role] ??
    ({ GK: 6, DEF: 24, MID: 44, FWD: 64 }[player.position]);
  const basePitchX = isAway ? 100 - baseLine : baseLine;
  const teamBallProgress = isAway ? 100 - ballX : ballX;
  const ballShiftFactor = player.position === "GK" ? 0.06 : 0.22;
  const shiftedX = Math.max(
    4,
    Math.min(96, basePitchX + (teamBallProgress - 50) * ballShiftFactor * (isAway ? -1 : 1)),
  );

  const roleY: Record<string, number> = {
    RB: 13, RCB: 25, CB: 34, LCB: 43, LB: 55,
    RDM: 21, CDM: 34, LDM: 47,
    RM: 13, RCM: 25, CM: 34, LCM: 43, LM: 55,
    CAM: 34, RW: 18, LW: 50, RS: 27, ST: 34, LS: 41,
  };
  const index = playersAtPosition.findIndex(
    (candidate) => candidate.id === player.id,
  );
  const baseY = roleY[player.role] ??
    (playersAtPosition.length === 1
      ? 34
      : 12 + (index * 44) / (playersAtPosition.length - 1));

  const targetBallSvgY = 1 + (ballY / 100) * 66;
  const lateralShift = player.position === "GK"
    ? (targetBallSvgY - 34) * 0.08
    : (targetBallSvgY - 34) * 0.3;
  const orientedBaseY = isAway ? 68 - baseY : baseY;
  const shiftedY = Math.max(6, Math.min(62, orientedBaseY + lateralShift));

  return { x: shiftedX, y: shiftedY };
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
    const offName = event.player_off ?? detailsParts[detailsParts.length - 1]?.trim();
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
  const [completedSubstitutions, setCompletedSubstitutions] = useState<Set<string>>(
    () => new Set(),
  );
  const substitutionTimers = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    for (const event of events) {
      if (
        event.type !== "substitution" ||
        completedSubstitutions.has(event.id) ||
        substitutionTimers.current.has(event.id)
      ) continue;
      const timer = window.setTimeout(() => {
        substitutionTimers.current.delete(event.id);
        setCompletedSubstitutions((completed) => new Set(completed).add(event.id));
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
  const latestBallEvent = [...events].reverse().find(
    (event) =>
      event.type !== "substitution" &&
      event.type !== "card" &&
      event.type !== "injury",
  );
  const latestMovementEvent = latestBallEvent;
  const penaltyEvent = [...events].reverse().find(
    (event): event is SetPieceEvent & { type: "penalty" } =>
      event.type === "penalty",
  );
  const penaltyShot = penaltyEvent && events.find(
    (event) =>
      event.type === "shot" &&
      event.id.startsWith(`${penaltyEvent.id}_shot`),
  );
  const latestPenalty = penaltyEvent &&
    !events.slice(events.indexOf(penaltyEvent) + 1).some(
      (event) => event.type === "goal" || event.type === "save",
    )
    ? penaltyEvent
    : undefined;
  const activePenaltyShot = latestPenalty ? penaltyShot : undefined;
  const pendingSubstitution = [...events].reverse().find(
    (event) =>
    event.type === "substitution" &&
    !completedSubstitutions.has(event.id),
  );
  const playerComingOff = pendingSubstitution?.type === "substitution"
    ? pendingSubstitution.player_off ??
    pendingSubstitution.details
      ?.split(" replaces ")
      .slice(-1)[0]
      ?.trim()
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

        {/* Home Players with Smooth Tactical Movement */}
        {homeTeam &&
          homePlayers.map((player) => {
            const playersAtPosition = homePlayers.filter(
              (candidate) => candidate.position === player.position,
            );
            const position = getDynamicPlayerCoordinates(
              player,
              homeTeam,
              false,
              playersAtPosition,
              homePlayers,
              ballTo.x,
              ballTo.y,
              latestMovementEvent,
              latestPenalty,
              activePenaltyShot,
            );
            const x = sx(position.x);
            const isComingOff =
              player.name === playerComingOff &&
              pendingSubstitution?.team === homeTeam.name;
            const y = isComingOff
              ? (position.y < 34 ? -3 : 71)
              : position.y;
            return (
              <g
                key={`home-${player.id}`}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  transition: "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
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

        {/* Away Players with Smooth Tactical Movement */}
        {awayTeam &&
          awayPlayers.map((player) => {
            const playersAtPosition = awayPlayers.filter(
              (candidate) => candidate.position === player.position,
            );
            const position = getDynamicPlayerCoordinates(
              player,
              awayTeam,
              true,
              playersAtPosition,
              awayPlayers,
              ballTo.x,
              ballTo.y,
              latestMovementEvent,
              latestPenalty,
              activePenaltyShot,
            );
            const x = sx(position.x);
            const isComingOff =
              player.name === playerComingOff &&
              pendingSubstitution?.team === awayTeam.name;
            const y = isComingOff
              ? (position.y < 34 ? -3 : 71)
              : position.y;
            return (
              <g
                key={`away-${player.id}`}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  transition: "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
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
            transition: "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <circle
            cx={0}
            cy={0}
            r="2.2"
            fill="rgba(255,255,255,0.2)"
          />
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
import { useMemo } from "react";
import type { ClubTeam, MatchEvent, TeamPlayer } from "../types";

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
  ballX: number,
  ballY: number,
  latestEvent?: MatchEvent,
) {
  const color = isAway ? team.secondary_color : team.primary_color;

  // 1. If this player is the active actor on the ball right now, move them to the ball!
  if (latestEvent) {
    if (latestEvent.team === team.name && latestEvent.player === player.name) {
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

  // 2. Otherwise, shift the team's tactical formation lines dynamically with the ball
  const baseLine = { GK: 6, DEF: 24, MID: 44, FWD: 64 }[player.position];
  const basePitchX = isAway ? 100 - baseLine : baseLine;

  // Outfield lines push up/drop back with the ball; GK shifts slightly
  const ballShiftFactor = player.position === "GK" ? 0.06 : 0.34;
  const shiftedX = Math.max(
    4,
    Math.min(96, basePitchX + (ballX - 50) * ballShiftFactor),
  );

  const index = playersAtPosition.findIndex(
    (candidate) => candidate.id === player.id,
  );
  const baseY =
    playersAtPosition.length === 1
      ? 34
      : 12 + (index * 44) / (playersAtPosition.length - 1);

  // Compress players slightly toward the ball's vertical channel
  const targetBallSvgY = 1 + (ballY / 100) * 66;
  const lateralShift =
    player.position === "GK"
      ? (targetBallSvgY - 34) * 0.12
      : (targetBallSvgY - 34) * 0.18;
  const shiftedY = Math.max(6, Math.min(62, baseY + lateralShift));

  return {
    x: shiftedX,
    y: shiftedY,
    color,
    isActive: false,
  };
}

function activePlayers(team: ClubTeam, events: MatchEvent[]): TeamPlayer[] {
  const active = [...team.roster.starters];
  const substitutions = events
    .filter(
      (event) => event.type === "substitution" && event.team === team.name,
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  for (const event of substitutions) {
    if (event.type !== "substitution" || !event.details) continue;
    const detailsParts = event.details.split(" replaces ");
    const offName = detailsParts[detailsParts.length - 1]?.trim();
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
  const visibleEvents = useMemo(() => events.slice(-6), [events]);
  const markerIdForColor = (color: string) => `arrow-${color.replace("#", "")}`;
  const markerColors = [
    ...new Set(visibleEvents.map((event) => colorOf(event.team))),
  ];
  const latestEvent = events[events.length - 1];
  const ballTo =
    latestEvent && "end_x" in latestEvent
      ? { x: latestEvent.end_x, y: latestEvent.end_y }
      : latestEvent
        ? { x: latestEvent.x, y: latestEvent.y }
        : { x: 50, y: 50 };

  const homePlayers = homeTeam ? activePlayers(homeTeam, events) : [];
  const awayPlayers = awayTeam ? activePlayers(awayTeam, events) : [];

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
      aria-label="Live pitch showing player positions, the ball, and recent match events"
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
        <defs>
          {markerColors.map((color) => (
            <marker
              key={color}
              id={markerIdForColor(color)}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
            </marker>
          ))}
        </defs>

        {visibleEvents.map((event, index) => {
          const color = colorOf(event.team);
          const opacity = 0.25 + (0.75 * (index + 1)) / visibleEvents.length;
          const markerId = `url(#${markerIdForColor(color)})`;

          const x = sx(event.x ?? 50);
          const y = sy(event.y ?? 50);

          if ("end_x" in event) {
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
                  markerEnd={markerId}
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
              ballTo.x,
              ballTo.y,
              latestEvent,
            );
            const x = sx(position.x);
            const y = position.y;
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
              ballTo.x,
              ballTo.y,
              latestEvent,
            );
            const x = sx(position.x);
            const y = position.y;
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
          aria-label="Ball"
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
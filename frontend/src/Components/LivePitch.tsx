import { useMemo } from "react";
import type { ClubTeam, MatchEvent, TeamPlayer } from "../types";

interface LivePitchProps {
  events: MatchEvent[];
  colorOf: (team: string) => string;
  homeTeam: ClubTeam | null;
  awayTeam: ClubTeam | null;
}

function playerCoordinates(
  player: TeamPlayer,
  team: ClubTeam,
  isAway: boolean,
  playersAtPosition: TeamPlayer[],
) {
  const positions = { GK: 5, DEF: 21, MID: 36, FWD: 48 };
  const x = positions[player.position];
  const index = playersAtPosition.findIndex((candidate) => candidate.id === player.id);
  const y =
    playersAtPosition.length === 1
      ? 34
      : 15 + (index * 38) / (playersAtPosition.length - 1);
  return {
    x: isAway ? 100 - x : x,
    y,
    color: isAway ? team.secondary_color : team.primary_color,
  };
}

function activePlayers(team: ClubTeam, events: MatchEvent[]): TeamPlayer[] {
  const active = [...team.roster.starters];
  const substitutions = events
    .filter((event) => event.type === "substitution" && event.team === team.name)
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
  const previousEvent = events[events.length - 2];
  const ballFrom = latestEvent
    ? previousEvent && !("end_x" in latestEvent)
      ? {
          x: "end_x" in previousEvent ? previousEvent.end_x : previousEvent.x,
          y: "end_y" in previousEvent ? previousEvent.end_y : previousEvent.y,
        }
      : { x: latestEvent.x, y: latestEvent.y }
    : { x: 50, y: 50 };
  const ballTo =
    latestEvent && "end_x" in latestEvent
      ? { x: latestEvent.end_x, y: latestEvent.end_y }
      : latestEvent
        ? { x: latestEvent.x, y: latestEvent.y }
        : { x: 50, y: 50 };
  const homePlayers = homeTeam ? activePlayers(homeTeam, events) : [];
  const awayPlayers = awayTeam ? activePlayers(awayTeam, events) : [];

  // Maps 0..100 absolute coordinates directly inside the white pitch boundary rect (x: 1..104, y: 1..67)
  const sx = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return 1 + (clamped / 100) * 103;
  };

  const sy = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return 1 + (clamped / 100) * 66;
  };

  return (
    <div
      role="img"
      aria-label="Live pitch showing player positions, the ball, and recent match events"
      className="w-full max-w-[700px] mx-auto relative bg-emerald-900/40 border-2 border-slate-600 rounded-xl overflow-hidden aspect-[105/68] shadow-2xl"
    >
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
          const opacity = 0.3 + (0.7 * (index + 1)) / visibleEvents.length;
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
            const radius = Math.max(1, event.xg * 5);
            const isGoal = event.outcome === "goal";
            return (
              <g key={event.id} opacity={opacity}>
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.4"
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
                {opacity > 0.8 && (
                  <circle
                    cx={x}
                    cy={y}
                    r="2"
                    fill="none"
                    stroke={cardColor}
                    strokeWidth="0.5"
                  >
                    <animate
                      attributeName="r"
                      values="2;10"
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.8;0"
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          }

          if (event.type === "corner" || event.type === "penalty") {
            return (
              <g key={event.id} opacity={opacity}>
                <circle
                  cx={x}
                  cy={y}
                  r="1.5"
                  fill="none"
                  stroke={color}
                  strokeWidth="0.8"
                  strokeDasharray="1,1"
                />
                <circle cx={x} cy={y} r="0.5" fill="#fff" />
              </g>
            );
          }

          return (
            <g key={event.id} opacity={opacity}>
              <rect
                x={x - 0.75}
                y={y - 0.75}
                width="1.5"
                height="1.5"
                fill={color}
                transform={`rotate(45 ${x} ${y})`}
              />
            </g>
          );
        })}

        {homeTeam && homePlayers.map((player) => {
          const playersAtPosition = homePlayers.filter(
            (candidate) => candidate.position === player.position,
          );
          const position = playerCoordinates(
            player,
            homeTeam,
            false,
            playersAtPosition,
          );
          const x = sx(position.x);
          const y = sy(position.y);
          return (
            <g key={`home-${player.id}`}>
              <title>{`${homeTeam.name}: ${player.name} (#${player.squad_number})`}</title>
              <circle
                cx={x}
                cy={y}
                r="2.2"
                fill={position.color || "#64748b"}
                stroke="#fff"
                strokeWidth="0.45"
              />
              <text
                x={x}
                y={y + 0.8}
                textAnchor="middle"
                fill="#fff"
                fontSize="2.6"
                fontWeight="700"
                paintOrder="stroke"
                stroke="#0f172a"
                strokeWidth="0.35"
              >
                {player.squad_number}
              </text>
            </g>
          );
        })}
        {awayTeam && awayPlayers.map((player) => {
          const playersAtPosition = awayPlayers.filter(
            (candidate) => candidate.position === player.position,
          );
          const position = playerCoordinates(
            player,
            awayTeam,
            true,
            playersAtPosition,
          );
          const x = sx(position.x);
          const y = sy(position.y);
          return (
            <g key={`away-${player.id}`}>
              <title>{`${awayTeam.name}: ${player.name} (#${player.squad_number})`}</title>
              <circle
                cx={x}
                cy={y}
                r="2.2"
                fill={position.color || "#64748b"}
                stroke="#fff"
                strokeWidth="0.45"
              />
              <text
                x={x}
                y={y + 0.8}
                textAnchor="middle"
                fill="#fff"
                fontSize="2.6"
                fontWeight="700"
                paintOrder="stroke"
                stroke="#0f172a"
                strokeWidth="0.35"
              >
                {player.squad_number}
              </text>
            </g>
          );
        })}

        <g key={latestEvent?.id ?? "kickoff-ball"} aria-label="Ball">
          <circle
            cx={sx(ballFrom.x)}
            cy={sy(ballFrom.y)}
            r="1.15"
            fill="#fff"
            stroke="#0f172a"
            strokeWidth="0.45"
          >
            <animate
              attributeName="cx"
              from={sx(ballFrom.x)}
              to={sx(ballTo.x)}
              dur="0.65s"
              fill="freeze"
            />
            <animate
              attributeName="cy"
              from={sy(ballFrom.y)}
              to={sy(ballTo.y)}
              dur="0.65s"
              fill="freeze"
            />
          </circle>
          <circle
            cx={sx(ballFrom.x)}
            cy={sy(ballFrom.y)}
            r="0.28"
            fill="#0f172a"
          >
            <animate
              attributeName="cx"
              from={sx(ballFrom.x)}
              to={sx(ballTo.x)}
              dur="0.65s"
              fill="freeze"
            />
            <animate
              attributeName="cy"
              from={sy(ballFrom.y)}
              to={sy(ballTo.y)}
              dur="0.65s"
              fill="freeze"
            />
          </circle>
        </g>
      </svg>
    </div>
  );
}

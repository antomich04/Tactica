import { useMemo } from "react";
import type { MatchEvent } from "../types";

interface LivePitchProps {
  events: MatchEvent[];
  colorOf: (team: string) => string;
}

export function LivePitch({ events, colorOf }: LivePitchProps) {
  const visibleEvents = useMemo(() => events.slice(-6), [events]);
  const markerIdForColor = (color: string) => `arrow-${color.replace("#", "")}`;
  const markerColors = [
    ...new Set(visibleEvents.map((event) => colorOf(event.team))),
  ];

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
      aria-label="Pitch showing the six most recent live match events"
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
      </svg>
    </div>
  );
}

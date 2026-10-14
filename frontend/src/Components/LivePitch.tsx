import { useMemo } from "react";
import { MatchEvent, PassEvent, ShotEvent } from "../types";

interface LivePitchProps {
  events: MatchEvent[];
}

export function LivePitch({ events }: LivePitchProps) {
  const visibleEvents = useMemo(() => events.slice(-6), [events]);

  const getTeamColor = (team: string) => {
    return team === "Arsenal" ? "#ef4444" : "#3b82f6";
  };

  // Event coordinates are percentages; convert them to the pitch's 105-by-68 SVG units.
  const sx = (val: number) => (val / 100) * 105;
  const sy = (val: number) => (val / 100) * 68;

  return (
    <div className="w-full max-w-[700px] mx-auto relative bg-emerald-900/40 border-2 border-slate-600 rounded-xl overflow-hidden aspect-[105/68] shadow-2xl">
      
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 105 68">
        <rect x="1" y="1" width="103" height="66" fill="none" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.6" />
        <line x1="52.5" y1="1" x2="52.5" y2="67" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.6" />
        <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.6" />
        <rect x="1" y="13.85" width="16.5" height="40.3" fill="none" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.6" />
        <rect x="87.5" y="13.85" width="16.5" height="40.3" fill="none" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.6" />
        <rect x="1" y="24.84" width="5.5" height="18.32" fill="none" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.6" />
        <rect x="98.5" y="24.84" width="5.5" height="18.32" fill="none" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="0.6" />
      </svg>

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 105 68">
        <defs>
          <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
          </marker>
          <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>
        </defs>

        {visibleEvents.map((event, index) => {
          const color = getTeamColor(event.team);
          const opacity = 0.3 + (0.7 * (index + 1)) / visibleEvents.length; 
          const markerId = event.team === "Arsenal" ? "url(#arrow-red)" : "url(#arrow-blue)";

          if ('end_x' in event) {
            const pass = event as PassEvent;
            const isIntercepted = pass.outcome === "intercepted";
            return (
              <g key={event.id} opacity={opacity}>
                <line
                  x1={sx(pass.x)} y1={sy(pass.y)}
                  x2={sx(pass.end_x)} y2={sy(pass.end_y)}
                  stroke={color}
                  strokeWidth="0.6"
                  strokeDasharray={isIntercepted ? "1.5, 1.5" : "none"}
                  markerEnd={markerId}
                />
                <circle cx={sx(pass.x)} cy={sy(pass.y)} r="0.6" fill={color} />
              </g>
            );
          }

          if ('xg' in event) {
            const shot = event as ShotEvent;
            const radius = Math.max(1, (shot.xg as number) * 5); 
            const isGoal = shot.outcome === "goal";
            return (
              <g key={event.id} opacity={opacity}>
                <circle cx={sx(shot.x)} cy={sy(shot.y)} r={radius} fill="none" stroke={color} strokeWidth="0.4" />
                <circle cx={sx(shot.x)} cy={sy(shot.y)} r={radius * 0.4} fill={color} />
                
                {isGoal && (
                  <circle cx={sx(shot.x)} cy={sy(shot.y)} r={radius + 1.5} fill="none" stroke="#fbbf24" strokeWidth="0.5">
                    <animate attributeName="r" values={`${radius};${radius + 6}`} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          }

          if (event.type === "card") {
            const cardColor = event.card_color === "red" ? "#ef4444" : "#eab308";
            const cx = sx(event.x);
            const cy = sy(event.y);
            
            return (
              <g key={event.id} opacity={opacity}>
                <rect x={cx - 1.5} y={cy - 2} width="3" height="4" fill={cardColor} stroke="#ffffff" strokeWidth="0.4" rx="0.5" />
                {opacity > 0.8 && (
                  <circle cx={cx} cy={cy} r="2" fill="none" stroke={cardColor} strokeWidth="0.5">
                    <animate attributeName="r" values="2;10" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          }

          if (event.type === "corner" || event.type === "penalty") {
            return (
              <g key={event.id} opacity={opacity}>
                <circle cx={sx(event.x)} cy={sy(event.y)} r="1.5" fill="none" stroke={color} strokeWidth="0.8" strokeDasharray="1,1" />
                <circle cx={sx(event.x)} cy={sy(event.y)} r="0.5" fill="#fff" />
              </g>
            );
          }

          const safeX = sx(event.x ?? 50);
          const safeY = sy(event.y ?? 50);
          
          return (
            <g key={event.id} opacity={opacity}>
              <rect 
                x={safeX - 0.75} y={safeY - 0.75} 
                width="1.5" height="1.5" 
                fill={color} 
                transform={`rotate(45 ${safeX} ${safeY})`} 
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
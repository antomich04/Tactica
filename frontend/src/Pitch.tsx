import type { MatchEvent } from "./contracts/event.generated";

// Convert the contract's 0-100 coordinates to the SVG pitch size.
const sx = (x: number) => x * 1.05;
const sy = (y: number) => y * 0.68;
const L = { stroke: "var(--line)", strokeWidth: 0.25, fill: "none" } as const;

interface Props {
  events: MatchEvent[];
  colorOf: (team: string) => string;
  evidence: Set<string>;
}

export function Pitch({ events, colorOf, evidence }: Props) {
  const recent = events.slice(-14);
  const newest = recent.at(-1);
  return (
    <svg className="pitch" viewBox="0 0 105 68" role="img" aria-label="Pitch with recent events">
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={i * 10.5} y={0} width={10.5} height={68} fill={i % 2 ? "var(--turf-b)" : "var(--turf-a)"} />
      ))}
      <rect x={0.2} y={0.2} width={104.6} height={67.6} {...L} />
      <line x1={52.5} y1={0} x2={52.5} y2={68} {...L} />
      <circle cx={52.5} cy={34} r={9.15} {...L} />
      <circle cx={52.5} cy={34} r={0.5} fill="var(--line)" />
      {[0, 1].map((s) => {
        const px = s ? 105 - 16.5 : 0, gx = s ? 105 - 5.5 : 0, spot = s ? 94 : 11;
        return (
          <g key={s}>
            <rect x={px} y={13.84} width={16.5} height={40.32} {...L} />
            <rect x={gx} y={24.84} width={5.5} height={18.32} {...L} />
            <circle cx={spot} cy={34} r={0.45} fill="var(--line)" />
            <path d={s ? "M88.5 26.69 A9.15 9.15 0 0 0 88.5 41.31" : "M16.5 26.69 A9.15 9.15 0 0 1 16.5 41.31"} {...L} />
          </g>
        );
      })}
      {recent.map((e, i) => {
        const c = colorOf(e.team);
        const op = 0.35 + (0.65 * (i + 1)) / recent.length;
        const cx = sx(e.x), cy = sy(e.y);
        const r = e.type === "goal" ? 3.2 : e.type === "shot" ? 2.4 : 1.7;
        return (
          <g key={e.id} opacity={op}>
            {e.type === "pass" && (
              <>
                <line x1={cx} y1={cy} x2={sx(e.end_x)} y2={sy(e.end_y)} stroke={c} strokeWidth={0.8}
                  strokeDasharray={e.outcome === "completed" ? undefined : "1.4 1.2"} />
                <circle cx={sx(e.end_x)} cy={sy(e.end_y)} r={0.8} fill={c} />
              </>
            )}
            {evidence.has(e.id) && <circle cx={cx} cy={cy} r={r + 1.8} fill="none" stroke="#ffd34d" strokeWidth={0.7} />}
            {e.type === "card" ? (
              <rect x={cx - 1.1} y={cy - 1.6} width={2.2} height={3.2} fill={e.card_color === "red" ? "#d62828" : "#f5c518"} stroke="var(--line)" strokeWidth={0.25} />
            ) : (
              <circle cx={cx} cy={cy} r={r} fill={e.type === "shot" ? "none" : c} stroke={e.type === "shot" ? c : "var(--line)"}
                strokeWidth={e.type === "shot" ? 0.9 : e.type === "goal" ? 0.7 : 0.3} />
            )}
            {e.type === "goal" && <circle cx={cx} cy={cy} r={r + 1.1} fill="none" stroke="var(--line)" strokeWidth={0.35} />}
          </g>
        );
      })}
      {newest && (
        <text x={sx(newest.x) + 3} y={sy(newest.y) - 2.6} className="pitch-label">
          {newest.player}
        </text>
      )}
    </svg>
  );
}

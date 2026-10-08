import { MatchEvent } from "../types";
import { clock } from "../utils";

interface Props {
  teams: string[];
  events: MatchEvent[];
  matchTime: number;
}

export function Scoreboard({ teams, events, matchTime }: Props) {
  const goals = (team?: string) => {
    if (!team) return 0;
    return events.filter((event) => event.type === "goal" && event.team === team).length;
  };

  const hasData = events.length > 0;

  return (
    <section className="scoreboard" aria-label="Scoreboard">
      <div className="side">
        <i style={{ background: "var(--home)" }} aria-hidden />
        <span className="name">{teams[0] ?? "Home"}</span>
        <b className="score">{goals(teams[0])}</b>
      </div>

      <div className="clock" aria-label="Match clock">
        {hasData ? clock(matchTime) : "--:--"}
      </div>

      <div className="side away">
        <b className="score">{goals(teams[1])}</b>
        <span className="name">{teams[1] ?? "Away"}</span>
        <i style={{ background: "var(--away)" }} aria-hidden />
      </div>
    </section>
  );
}
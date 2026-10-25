import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslation } from "../Utils/i18n";
import type { ClubTeam, MatchEvent, TeamPlayer } from "../types";

interface MatchLineupsProps {
  homeTeam: ClubTeam;
  awayTeam: ClubTeam;
  events: MatchEvent[];
}

function FootballIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="1.6" />
      <path
        d="M12 6.5 L15.5 9 L14 13 H10 L8.5 9 Z"
        fill="#0f172a"
        stroke="#0f172a"
        strokeWidth="1"
      />
      <line x1="12" y1="6.5" x2="12" y2="2" stroke="#0f172a" strokeWidth="1.5" />
      <line x1="15.5" y1="9" x2="20" y2="7.5" stroke="#0f172a" strokeWidth="1.5" />
      <line x1="8.5" y1="9" x2="4" y2="7.5" stroke="#0f172a" strokeWidth="1.5" />
      <line x1="14" y1="13" x2="17.5" y2="18" stroke="#0f172a" strokeWidth="1.5" />
      <line x1="10" y1="13" x2="6.5" y2="18" stroke="#0f172a" strokeWidth="1.5" />
    </svg>
  );
}

function substitutionOffName(event: MatchEvent): string | null {
  if (event.type !== "substitution" || !event.details) return null;
  const separator = " replaces ";
  const separatorIndex = event.details.indexOf(separator);
  return separatorIndex < 0
    ? null
    : event.details.slice(separatorIndex + separator.length).trim();
}

function PlayerRow({
  player,
  events,
  teamColor,
}: {
  player: TeamPlayer;
  events: MatchEvent[];
  teamColor: string;
}) {
  const goals = events.filter(
    (event) =>
      event.type === "goal" &&
      (event.scorer === player.name || event.player === player.name),
  ).length;
  const cards = events.filter(
    (event): event is Extract<MatchEvent, { type: "card" }> =>
      event.type === "card" && event.player === player.name,
  );
  const substitutionOn = events.some(
    (event) => event.type === "substitution" && event.player === player.name,
  );
  const substitutionOff = events.some(
    (event) => substitutionOffName(event) === player.name,
  );

  return (
    <div className="flex min-h-10 items-center gap-2.5 border-b border-slate-800/80 px-2.5 py-2 last:border-b-0">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/70 text-xs font-black tabular-nums text-white"
        style={{ backgroundColor: teamColor || "#64748b" }}
        aria-label={`Squad number ${player.squad_number}`}
      >
        {player.squad_number}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm sm:text-base font-semibold text-slate-200">
        {player.name}
      </span>
      <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">
        {player.role}
      </span>
      <div className="flex min-w-6 shrink-0 items-center justify-end gap-1.5">
        {goals > 0 && (
          <span
            className="flex items-center gap-1 text-white"
            title={`${goals} goal${goals === 1 ? "" : "s"}`}
            aria-label={`${goals} goal${goals === 1 ? "" : "s"}`}
          >
            <FootballIcon className="h-4 w-4 drop-shadow-sm" />
            {goals > 1 && <span className="text-xs font-black text-emerald-400">x{goals}</span>}
          </span>
        )}
        {cards.map((event) => (
          <span
            key={event.id}
            className={`h-4 w-2.5 rounded-[2px] border border-white/60 ${
              event.card_color === "red" ? "bg-red-600" : "bg-yellow-400"
            }`}
            title={`${event.card_color} card`}
            aria-label={`${event.card_color} card`}
          />
        ))}
        {substitutionOff && (
          <span
            className="text-red-500"
            aria-label="Substituted off"
            title="Substituted off"
          >
            <ArrowDown className="h-4 w-4" />
          </span>
        )}
        {substitutionOn && (
          <span
            className="text-emerald-400"
            aria-label="Substituted on"
            title="Substituted on"
          >
            <ArrowUp className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}

function TeamLineup({
  team,
  events,
  isAway,
}: {
  team: ClubTeam;
  events: MatchEvent[];
  isAway: boolean;
}) {
  const { t } = useTranslation();
  const color = isAway ? team.secondary_color : team.primary_color;
  const teamEvents = events.filter((event) => event.team === team.name);

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/60">
      <header
        className="flex items-center justify-between gap-3 border-b border-slate-700 px-3.5 py-3"
        style={{ borderTop: `3px solid ${color || "#64748b"}` }}
      >
        <h3 className="truncate text-sm sm:text-base font-black uppercase tracking-wide text-white">
          {team.name}
        </h3>
        <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">
          {team.formation}
        </span>
      </header>
      <div className="max-h-[480px] overflow-y-auto p-2">
        <h4 className="px-2 pb-1 pt-1 text-xs font-black uppercase tracking-widest text-slate-400">
          {t("startingXI")}
        </h4>
        {team.roster.starters.map((player) => (
          <PlayerRow
            key={`starter-${player.id}`}
            player={player}
            events={teamEvents}
            teamColor={color}
          />
        ))}
        <h4 className="px-2 pb-1 pt-4 text-xs font-black uppercase tracking-widest text-slate-400">
          {t("substitutes")}
        </h4>
        {team.roster.substitutes.map((player) => (
          <PlayerRow
            key={`substitute-${player.id}`}
            player={player}
            events={teamEvents}
            teamColor={color}
          />
        ))}
      </div>
    </section>
  );
}

export function MatchLineups({
  homeTeam,
  awayTeam,
  events,
}: MatchLineupsProps) {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-white sm:text-2xl">
            {t("squads")}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            {t("squadsSub")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3.5 text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <FootballIcon className="h-4 w-4" /> {t("goalLegend")}
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <ArrowDown className="h-3.5 w-3.5" /> {t("offLegend")}
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <ArrowUp className="h-3.5 w-3.5" /> {t("onLegend")}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3.5 w-2.5 rounded-[2px] border border-white/50 bg-yellow-400" />
            {t("cardLegend")}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <TeamLineup team={homeTeam} events={events} isAway={false} />
        <TeamLineup team={awayTeam} events={events} isAway />
      </div>
    </section>
  );
}
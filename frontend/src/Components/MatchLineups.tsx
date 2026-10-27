import { ArrowDown, ArrowUp, Crosshair, X } from "lucide-react";
import { useTranslation } from "../Utils/i18n";
import type { ClubTeam, MatchEvent, TeamPlayer } from "../types";

interface MatchLineupsProps {
  homeTeam: ClubTeam;
  awayTeam: ClubTeam;
  events: MatchEvent[];
  lockedPlayer: TeamPlayer | null;
  onToggleLockPlayer: (player: TeamPlayer) => void;
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
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="#ffffff"
        stroke="#0f172a"
        strokeWidth="1.6"
      />
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
  isLocked,
  onToggleLock,
}: {
  player: TeamPlayer;
  events: MatchEvent[];
  teamColor: string;
  isLocked: boolean;
  onToggleLock: (player: TeamPlayer) => void;
}) {
  const { t } = useTranslation();
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
    <div
      onClick={() => onToggleLock(player)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleLock(player);
        }
      }}
      aria-pressed={isLocked}
      title={isLocked ? t("unlockPlayer") : t("lockPlayer")}
      className={`group flex min-h-9 sm:min-h-11 items-center gap-1.5 sm:gap-2.5 border-b px-1.5 sm:px-2.5 py-1.5 sm:py-2 last:border-b-0 transition-all cursor-pointer select-none rounded-lg ${
        isLocked
          ? "bg-amber-500/15 border-amber-500/50 shadow-[inset_0_0_12px_rgba(245,158,11,0.18)]"
          : "border-slate-800/80 hover:bg-slate-800/60"
      }`}
    >
      <span
        className={`flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full border text-[10px] sm:text-xs font-black tabular-nums text-white transition-transform ${
          isLocked
            ? "border-amber-400 ring-2 ring-amber-400/40 scale-105"
            : "border-white/70"
        }`}
        style={{
          backgroundColor: teamColor || "#64748b",
          WebkitTextStroke: "1px #000",
        }}
        aria-label={t("squadNumberLabel", { number: player.squad_number ?? "" })}
      >
        {player.squad_number}
      </span>

      <div className="min-w-0 flex-1 flex items-center gap-2">
        <span
          className={`truncate text-[11px] sm:text-base font-semibold transition-colors ${
            isLocked
              ? "text-amber-300 font-bold"
              : "text-slate-200 group-hover:text-white"
          }`}
        >
          {player.name}
        </span>
        {isLocked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 shrink-0">
            <Crosshair className="h-3 w-3" />
            {t("lockedBadge")}
          </span>
        )}
      </div>

      <span className="shrink-0 text-[9px] sm:text-xs font-bold uppercase tracking-wide text-slate-400">
        {player.role}
      </span>

      <div className="flex min-w-6 shrink-0 items-center justify-end gap-1.5">
        {goals > 0 && (
          <span
            className="flex items-center gap-1 text-white"
            title={t(goals === 1 ? "goalCountSingular" : "goalCountPlural", {
              count: goals,
            })}
            aria-label={t(goals === 1 ? "goalCountSingular" : "goalCountPlural", {
              count: goals,
            })}
          >
            <FootballIcon className="h-4 w-4 drop-shadow-sm" />
            {goals > 1 && (
              <span className="text-xs font-black text-emerald-400">
                x{goals}
              </span>
            )}
          </span>
        )}
        {cards.map((event) => (
          <span
            key={event.id}
            className={`h-4 w-2.5 rounded-[2px] border border-white/60 ${
              event.card_color === "red" ? "bg-red-600" : "bg-yellow-400"
            }`}
            title={t(
              event.card_color === "red" ? "redCardStatus" : "yellowCardStatus",
            )}
            aria-label={t(
              event.card_color === "red" ? "redCardStatus" : "yellowCardStatus",
            )}
          />
        ))}
        {substitutionOff && (
          <span
            className="text-red-500"
            aria-label={t("substitutedOff")}
            title={t("substitutedOff")}
          >
            <ArrowDown className="h-4 w-4" />
          </span>
        )}
        {substitutionOn && (
          <span
            className="text-emerald-400"
            aria-label={t("substitutedOn")}
            title={t("substitutedOn")}
          >
            <ArrowUp className="h-4 w-4" />
          </span>
        )}

        {/* Lock / Unlock Action Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(player);
          }}
          aria-label={isLocked ? t("unlockPlayer") : t("lockPlayer")}
          title={isLocked ? t("unlockPlayer") : t("lockPlayer")}
          className={`ml-0.5 sm:ml-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md border transition-all cursor-pointer ${
            isLocked
              ? "border-amber-400/60 bg-amber-500/20 text-amber-300 hover:bg-red-500/20 hover:border-red-400/60 hover:text-red-300 opacity-100"
              : "border-slate-700 bg-slate-900/80 text-slate-400 opacity-70 sm:opacity-0 group-hover:opacity-100 hover:border-amber-400/60 hover:text-amber-300"
          }`}
        >
          {isLocked ? (
            <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          ) : (
            <Crosshair className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function TeamLineup({
  team,
  events,
  isAway,
  lockedPlayer,
  onToggleLockPlayer,
}: {
  team: ClubTeam;
  events: MatchEvent[];
  isAway: boolean;
  lockedPlayer: TeamPlayer | null;
  onToggleLockPlayer: (player: TeamPlayer) => void;
}) {
  const { t } = useTranslation();
  const color = isAway ? team.secondary_color : team.primary_color;
  const teamEvents = events.filter((event) => event.team === team.name);

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/60">
      <header
        className="flex items-center justify-between gap-2 sm:gap-3 border-b border-slate-700 px-2 sm:px-3.5 py-2 sm:py-3"
        style={{ borderTop: `3px solid ${color || "#64748b"}` }}
      >
        <h3 className="truncate text-[11px] sm:text-base font-black uppercase tracking-wide text-white">
          {team.name}
        </h3>
        <span className="shrink-0 text-[9px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
          {team.formation}
        </span>
      </header>
      <div className="max-h-[480px] overflow-y-auto p-2 space-y-0.5">
        <h4 className="px-2 pb-1 pt-1 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">
          {t("startingXI")}
        </h4>
        {team.roster.starters.map((player) => (
          <PlayerRow
            key={`starter-${player.id}`}
            player={player}
            events={teamEvents}
            teamColor={color}
            isLocked={lockedPlayer?.id === player.id}
            onToggleLock={onToggleLockPlayer}
          />
        ))}
        <h4 className="px-2 pb-1 pt-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">
          {t("substitutes")}
        </h4>
        {team.roster.substitutes.map((player) => (
          <PlayerRow
            key={`substitute-${player.id}`}
            player={player}
            events={teamEvents}
            teamColor={color}
            isLocked={lockedPlayer?.id === player.id}
            onToggleLock={onToggleLockPlayer}
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
  lockedPlayer,
  onToggleLockPlayer,
}: MatchLineupsProps) {
  const { t } = useTranslation();

  return (
    <section className="mx-2 my-4 flex flex-col gap-3 sm:mx-4 sm:my-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-bold tracking-wide text-white sm:text-2xl">
            {t("squads")}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            {t("squadsSub")} {t("clickPlayerToLock")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3.5 text-xs font-semibold text-slate-300">
          {lockedPlayer && (
            <button
              type="button"
              onClick={() => onToggleLockPlayer(lockedPlayer)}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition cursor-pointer"
            >
              <Crosshair className="h-3.5 w-3.5" />
              <span>{lockedPlayer.name}</span>
              <X className="h-3.5 w-3.5 ml-0.5 text-amber-200 hover:text-white" />
            </button>
          )}
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
      <div className="grid grid-cols-2 gap-3">
        <TeamLineup
          team={homeTeam}
          events={events}
          isAway={false}
          lockedPlayer={lockedPlayer}
          onToggleLockPlayer={onToggleLockPlayer}
        />
        <TeamLineup
          team={awayTeam}
          events={events}
          isAway
          lockedPlayer={lockedPlayer}
          onToggleLockPlayer={onToggleLockPlayer}
        />
      </div>
    </section>
  );
}
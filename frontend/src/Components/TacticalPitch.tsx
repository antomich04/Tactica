import type { PlayerRole, TeamPlayer } from "../types";
import { useTranslation } from "../Utils/i18n";

export type { PlayerRole };

export interface TacticalPlayer {
  name: string;
  role: PlayerRole;
  squad_number?: number | null;
  nationality?: string | null;
}

interface TacticalPitchProps {
  customColor?: string;
  players: (TacticalPlayer | TeamPlayer)[];
}

const ROLE_POSITIONS: Record<string, { top: string; left: string }> = {
  GK: { top: "88%", left: "50%" },
  RB: { top: "72%", left: "86%" },
  RCB: { top: "72%", left: "62%" },
  CB: { top: "72%", left: "50%" },
  LCB: { top: "72%", left: "38%" },
  LB: { top: "72%", left: "14%" },
  RDM: { top: "57%", left: "68%" },
  CDM: { top: "57%", left: "50%" },
  LDM: { top: "57%", left: "32%" },
  RM: { top: "41%", left: "86%" },
  RCM: { top: "41%", left: "62%" },
  CM: { top: "41%", left: "50%" },
  LCM: { top: "41%", left: "38%" },
  LM: { top: "41%", left: "14%" },
  CAM: { top: "27%", left: "50%" },
  RW: { top: "15%", left: "82%" },
  LW: { top: "15%", left: "18%" },
  RS: { top: "11%", left: "66%" },
  ST: { top: "11%", left: "50%" },
  LS: { top: "11%", left: "34%" },
};

function isLightHex(hex?: string): boolean {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.72;
}

export function TacticalPitch({
  customColor,
  players,
}: TacticalPitchProps) {
  const { t } = useTranslation();
  const numberTextColor = isLightHex(customColor)
    ? "text-slate-950"
    : "text-white";

  const rolesPresent = new Set(players.map((p) => p.role));
  const isThreeBack =
    rolesPresent.has("CB") &&
    !rolesPresent.has("RB") &&
    !rolesPresent.has("LB");
  const isFiveBack =
    rolesPresent.has("CB") && rolesPresent.has("RB") && rolesPresent.has("LB");

  const getCoordinates = (role: string) => {
    if (isThreeBack) {
      if (role === "RCB") return { top: "72%", left: "78%" };
      if (role === "LCB") return { top: "72%", left: "22%" };
    }
    if (isFiveBack) {
      if (role === "RB") return { top: "72%", left: "88%" };
      if (role === "RCB") return { top: "72%", left: "69%" };
      if (role === "CB") return { top: "72%", left: "50%" };
      if (role === "LCB") return { top: "72%", left: "31%" };
      if (role === "LB") return { top: "72%", left: "12%" };
    }
    return ROLE_POSITIONS[role] || { top: "50%", left: "50%" };
  };

  return (
    <div className="relative w-full max-w-[540px] mx-auto aspect-[3/4] sm:aspect-[4/5] bg-emerald-900/40 border sm:border-2 border-slate-600/50 rounded-lg sm:rounded-xl overflow-hidden flex-shrink-0 shadow-inner">
      {/* Pitch Lines */}
      <div className="absolute top-1/2 left-0 w-full border-t sm:border-t-2 border-slate-500/30" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-24 sm:h-24 border sm:border-2 border-slate-500/30 rounded-full" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-slate-500/50 rounded-full" />
      <div className="absolute bottom-0 left-1/4 w-1/2 h-[18%] border sm:border-2 border-slate-500/30 border-b-0" />
      <div className="absolute bottom-0 left-[37.5%] w-1/4 h-[6%] border sm:border-2 border-slate-500/30 border-b-0" />
      <div className="absolute top-0 left-1/4 w-1/2 h-[18%] border sm:border-2 border-slate-500/30 border-t-0" />
      <div className="absolute top-0 left-[37.5%] w-1/4 h-[6%] border sm:border-2 border-slate-500/30 border-t-0" />

      {players.map((player) => {
        const position = getCoordinates(player.role);
        // Show last name on tiny mobile screens so it doesn't clip, full name on sm+
        const shortName = player.name.split(" ").slice(-1)[0];

        return (
          <div
            key={`${player.name}-${player.role}`}
            role="img"
            aria-label={t("playerPositionLabel", {
              number: player.squad_number ?? "",
              player: player.name,
              role: player.role,
            })}
            title={t("playerPositionTitle", {
              player: player.name,
              role: player.role,
            })}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center select-none"
            style={{ top: position.top, left: position.left }}
          >
            {/* Player Circle with Shirt Number Inside */}
            <div
              className={`w-5 h-5 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full border sm:border-2 border-white shadow-md flex items-center justify-center font-black text-[9px] sm:text-xs md:text-sm tabular-nums ${numberTextColor}`}
              style={
                customColor
                  ? {
                      backgroundColor: customColor,
                      boxShadow: `0 0 10px ${customColor}66`,
                    }
                  : undefined
              }
            >
              {player.squad_number ?? ""}
            </div>

            {/* Vertically Stacked Player Name & Position */}
            <div className="mt-0.5 sm:mt-1 px-1 py-0.5 sm:px-1.5 sm:py-1 rounded bg-slate-950/90 border border-slate-700/80 shadow-sm flex flex-col items-center text-center leading-none">
              <span className="sm:hidden font-bold text-slate-100 text-[7px] max-w-[42px] truncate">
                {shortName}
              </span>
              <span className="hidden sm:block font-bold text-slate-100 text-[10px] md:text-xs max-w-[75px] md:max-w-[95px] truncate">
                {player.name}
              </span>
              <span className="text-slate-400 font-extrabold text-[6px] sm:text-[8px] md:text-[9px] uppercase tracking-wider mt-0.5">
                {player.role}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
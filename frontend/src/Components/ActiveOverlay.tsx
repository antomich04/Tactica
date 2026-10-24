import { useState, useEffect } from "react";
import { Overlay } from "../types";
import {
  Radio,
  Activity,
  Mic,
  Shield,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface Props {
  active?: Overlay | null;
  teams: string[];
}

export function ActiveOverlay({ active, teams }: Props) {
  const [display, setDisplay] = useState<Overlay | null>(null);

  // Show each new overlay immediately, but let rich insights finish before
  // replacing them with lower-priority fast templates.
  useEffect(() => {
    if (!active) return;
    setDisplay((current) => {
      if (current?.id === active.id) return current;
      if (
        current?.meta?.tier === "rich_agentic" &&
        active.meta?.tier !== "rich_agentic"
      ) {
        return current;
      }
      return active;
    });
  }, [active]);

  // Honor the duration supplied by the broadcaster; keep rich insights visible
  // long enough to read even if their configured duration is shorter.
  useEffect(() => {
    if (display) {
      const isRichAi = display.meta?.tier === "rich_agentic";
      const holdMs = Math.max(
        display.duration * 1000,
        isRichAi ? 8000 : 3500,
      );

      const timer = setTimeout(() => {
        setDisplay(null);
      }, holdMs);

      return () => clearTimeout(timer);
    }
  }, [display]);

  if (!display) {
    return (
      <div className="w-full h-full bg-slate-900 border border-slate-700/50 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 shadow-lg transition-all relative overflow-hidden">
        <Radio className="w-6 h-6 mb-2 opacity-20" />
        <span className="text-xs font-bold tracking-widest uppercase opacity-40">
          Broadcast Feed Clear
        </span>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/20 via-transparent to-transparent opacity-50" />
      </div>
    );
  }

  const homeTeam = teams[0] || "Home";
  const awayTeam = teams[1] || "Away";

  const isRichAi = display.meta?.tier === "rich_agentic";
  const isAnalyst = display.persona === "analyst";

  const searchString = (
    display.text +
    " " +
    (display.meta?.team || "")
  ).toLowerCase();
  const isHome = homeTeam && searchString.includes(homeTeam.toLowerCase());
  const isAway = awayTeam && searchString.includes(awayTeam.toLowerCase());

  let theme = isAnalyst
    ? {
        bg: "bg-gradient-to-br from-blue-950 via-slate-900 to-slate-900",
        accent: "bg-blue-500",
        text: "text-blue-400",
        border: "border-blue-500/30",
        icon: Activity,
        label: "Tactical Analyst",
      }
    : {
        bg: "bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900",
        accent: "bg-emerald-500",
        text: "text-emerald-400",
        border: "border-emerald-500/30",
        icon: Mic,
        label: "Live Commentary",
      };

  if (isHome) {
    theme = {
      bg: "bg-gradient-to-br from-red-950/80 via-slate-900 to-slate-900",
      accent: "bg-red-500",
      text: "text-red-400",
      border: "border-red-500/30",
      icon: Shield,
      label: `${homeTeam} Alert`,
    };
  } else if (isAway) {
    theme = {
      bg: "bg-gradient-to-br from-blue-950/80 via-slate-900 to-slate-900",
      accent: "bg-blue-500",
      text: "text-blue-400",
      border: "border-blue-500/30",
      icon: Shield,
      label: `${awayTeam} Alert`,
    };
  }

  const Icon = theme.icon;

  return (
    <div
      key={display.id}
      className={`w-full h-full ${theme.bg} border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl relative flex flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.accent} shadow-[0_0_15px_currentColor]`}
      />

      <div className="relative z-10 p-3.5 pl-5 flex flex-col h-full min-h-0">
        {/* Top Header Row */}
        <div className="flex shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded bg-slate-950/50 border ${theme.border} shrink-0`}
            >
              <Icon className={`w-3.5 h-3.5 ${theme.text}`} />
            </div>
            <span
              className={`${theme.text} min-w-0 font-black uppercase tracking-widest text-[11px]`}
            >
              {theme.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isRichAi ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-purple-400" />
                AI Insight
              </span>
            ) : (
              display.verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" />
                  Live
                </span>
              )
            )}
          </div>
        </div>

        {/* Main Broadcast Text */}
        <div className="my-1 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <p className="break-words text-white font-black text-xs uppercase tracking-wider leading-tight opacity-75">
            {display.type.replace("_", " ")}
          </p>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-slate-100 font-semibold text-sm sm:text-base leading-snug">
            {display.text}
          </p>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
    </div>
  );
}

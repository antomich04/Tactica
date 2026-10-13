// src/Components/TacticalPitch.tsx
import React from "react";

export type PlayerRole = 
  | "GK" | "RB" | "RCB" | "CB" | "LCB" | "LB" 
  | "RDM" | "CDM" | "LDM" 
  | "RM" | "RCM" | "CM" | "LCM" | "LM" 
  | "CAM" 
  | "RW" | "LW" 
  | "RS" | "ST" | "LS";

export interface TacticalPlayer {
  name: string;
  role: PlayerRole;
}

interface TacticalPitchProps {
  teamColor: "red" | "blue";
  players: TacticalPlayer[];
}

// Maps standard tactical roles to X/Y percentages on the pitch
const ROLE_POSITIONS: Record<PlayerRole, { top: string; left: string }> = {
  GK:  { top: "90%", left: "50%" },
  RB:  { top: "75%", left: "85%" },
  RCB: { top: "75%", left: "65%" },
  CB:  { top: "75%", left: "50%" },
  LCB: { top: "75%", left: "35%" },
  LB:  { top: "75%", left: "15%" },
  RDM: { top: "62%", left: "65%" },
  CDM: { top: "62%", left: "50%" },
  LDM: { top: "62%", left: "35%" },
  RM:  { top: "45%", left: "85%" },
  RCM: { top: "45%", left: "65%" },
  CM:  { top: "45%", left: "50%" },
  LCM: { top: "45%", left: "35%" },
  LM:  { top: "45%", left: "15%" },
  CAM: { top: "32%", left: "50%" },
  RW:  { top: "18%", left: "80%" },
  LW:  { top: "18%", left: "20%" },
  RS:  { top: "12%", left: "65%" },
  ST:  { top: "12%", left: "50%" },
  LS:  { top: "12%", left: "35%" },
};

export function TacticalPitch({ teamColor, players }: TacticalPitchProps) {
  const dotColor = teamColor === "red" ? "bg-red-500" : "bg-blue-500";
  const glowColor = teamColor === "red" ? "shadow-red-500/50" : "shadow-blue-500/50";

  return (
    <div className="relative w-full max-w-[320px] mx-auto aspect-[3/4] bg-emerald-900/40 border-2 border-slate-600/50 rounded-lg overflow-hidden flex-shrink-0">
      
      {/* --- Pitch Markings --- */}
      {/* Center Line */}
      <div className="absolute top-1/2 left-0 w-full border-t-2 border-slate-500/30" />
      {/* Center Circle */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-slate-500/30 rounded-full" />
      {/* Center Dot */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-slate-500/50 rounded-full" />
      {/* Penalty Box (Bottom/Defending) */}
      <div className="absolute bottom-0 left-1/4 w-1/2 h-[18%] border-2 border-slate-500/30 border-b-0" />
      {/* 6-Yard Box (Bottom) */}
      <div className="absolute bottom-0 left-[37.5%] w-1/4 h-[6%] border-2 border-slate-500/30 border-b-0" />
      {/* Penalty Box (Top/Attacking) */}
      <div className="absolute top-0 left-1/4 w-1/2 h-[18%] border-2 border-slate-500/30 border-t-0" />
      {/* 6-Yard Box (Top) */}
      <div className="absolute top-0 left-[37.5%] w-1/4 h-[6%] border-2 border-slate-500/30 border-t-0" />

      {/* --- Player Dots --- */}
      {players.map((player, index) => {
        const position = ROLE_POSITIONS[player.role] || { top: "50%", left: "50%" };
        
        return (
          <div 
            key={index}
            className="group absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
            style={{ top: position.top, left: position.left }}
          >
            {/* The Dot */}
            <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${dotColor} ${glowColor} transition-transform duration-200 group-hover:scale-125`} />
            
            {/* Tooltip (Hover) */}
            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none transition-opacity duration-200">
              <div className="bg-slate-900 border border-slate-700 text-slate-100 text-xs font-bold py-1 px-3 rounded shadow-xl whitespace-nowrap">
                {player.name} <span className="text-slate-400 font-normal ml-1">{player.role}</span>
              </div>
              {/* Tooltip arrow */}
              <div className="w-2 h-2 bg-slate-900 border-b border-r border-slate-700 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
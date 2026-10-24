import { Shield } from "lucide-react";
import type { ClubTeam } from "../types";

interface TeamCrestProps {
  team: ClubTeam;
  fallbackColor?: string;
  sizeClassName?: string;
}

export function TeamCrest({
  team,
  fallbackColor = "#ef4444",
  sizeClassName = "w-12 h-12 sm:w-16 sm:h-16 md:w-22 md:h-22",
}: TeamCrestProps) {
  if (team.badge_svg && team.badge_svg.trim().startsWith("<svg")) {
    return (
      <div
        className={`${sizeClassName} flex items-center justify-center [&>svg]:w-full [&>svg]:h-full drop-shadow-md shrink-0`}
        dangerouslySetInnerHTML={{ __html: team.badge_svg }}
      />
    );
  }

  return (
    <Shield
      className={`${sizeClassName} drop-shadow-md shrink-0`}
      style={{ color: team.primary_color || fallbackColor }}
    />
  );
}

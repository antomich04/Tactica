import axios from "axios";
import { API_URL, ApiError } from "./authService";
import type { ClubTeam, NextMatchResponse } from "../types";

const teamsApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "tactica",
  },
});

function normalizeClubColors(club: ClubTeam): ClubTeam {
  const code = club.short_code?.toUpperCase();

  // A curated, high-contrast palette mapped directly to each club.
  // This completely eliminates dark navy/black conflicts against the dark UI
  // and gives every team a unique visual identity (using away-kit accents where needed).
  const VIBRANT_PALETTE: Record<string, { primary: string; secondary: string }> = {
    "NLC": { primary: "#EF4444", secondary: "#FFFFFF" }, // Arsenal: Red / White
    "MDL": { primary: "#BE185D", secondary: "#93C5FD" }, // Aston Villa: Bright Claret / Light Blue
    "DOR": { primary: "#DC2626", secondary: "#10B981" }, // Bournemouth: Red / Emerald (Away accent)
    "WLH": { primary: "#F87171", secondary: "#FACC15" }, // Brentford: Soft Red / Yellow
    "SXG": { primary: "#3B82F6", secondary: "#FFFFFF" }, // Brighton: Bright Blue / White
    "LDW": { primary: "#2563EB", secondary: "#F59E0B" }, // Chelsea: Royal Blue / Amber
    "WMS": { primary: "#38BDF8", secondary: "#818CF8" }, // Coventry: Sky Blue / Indigo
    "SLG": { primary: "#4F46E5", secondary: "#E11D48" }, // Crystal Palace: Indigo / Rose
    "MSB": { primary: "#0EA5E9", secondary: "#FFFFFF" }, // Everton: Ocean Blue / White
    "THC": { primary: "#F8FAFC", secondary: "#64748B" }, // Fulham: Off-White / Slate
    "HMT": { primary: "#F59E0B", secondary: "#334155" }, // Hull: Amber / Dark Slate
    "SFT": { primary: "#60A5FA", secondary: "#FFFFFF" }, // Ipswich: Soft Blue / White
    "YKW": { primary: "#F8FAFC", secondary: "#FBBF24" }, // Leeds: Off-White / Yellow
    "MSR": { primary: "#B91C1C", secondary: "#FDE047" }, // Liverpool: Deep Red / Bright Yellow
    "MCS": { primary: "#7DD3FC", secondary: "#14B8A6" }, // Man City: Light Sky / Teal
    "MCD": { primary: "#E11D48", secondary: "#FEF08A" }, // Man Utd: Crimson / Pale Yellow
    "TYM": { primary: "#94A3B8", secondary: "#2DD4BF" }, // Newcastle: Silver / Turquoise
    "SWA": { primary: "#EF4444", secondary: "#F8FAFC" }, // Nottm Forest: Standard Red / Off-White
    "WBC": { primary: "#991B1B", secondary: "#E2E8F0" }, // Sunderland: Dark Red / Light Slate
    "NLL": { primary: "#F8FAFC", secondary: "#8B5CF6" }, // Tottenham: Off-White / Violet
  };

  if (code && VIBRANT_PALETTE[code]) {
    return {
      ...club,
      primary_color: VIBRANT_PALETTE[code].primary,
      secondary_color: VIBRANT_PALETTE[code].secondary,
    };
  }

  return club;
}

function handleAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      throw new ApiError(0, "Can't reach the server.");
    }
    const detail = error.response.data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : `Request failed (${error.response.status})`;
    throw new ApiError(error.response.status, message);
  }
  throw error;
}

let cachedTeams: ClubTeam[] | null = null;

export async function fetchAllTeams(forceRefresh = false): Promise<ClubTeam[]> {
  if (cachedTeams && !forceRefresh) {
    return cachedTeams;
  }
  try {
    const response = await teamsApi.get<{ status: string; teams: ClubTeam[] }>(
      "/api/teams",
      { params: { include_players: true } },
    );
    const normalized = response.data.teams.map(normalizeClubColors);
    cachedTeams = normalized;
    return normalized;
  } catch (error) {
    handleAxiosError(error);
  }
}

let cachedNextMatch: NextMatchResponse | null = null;

export async function fetchNextMatch(
  home?: string,
  away?: string,
  forceRefresh = false,
): Promise<NextMatchResponse> {
  if (cachedNextMatch && !forceRefresh && !home && !away) {
    return cachedNextMatch;
  }

  try {
    const params = new URLSearchParams();
    if (home) params.set("home", home);
    if (away) params.set("away", away);
    const qs = params.toString();

    const response = await teamsApi.get<NextMatchResponse>(
      `/api/teams/next-match${qs ? `?${qs}` : ""}`,
    );

    const normalized: NextMatchResponse = {
      ...response.data,
      home_team: normalizeClubColors(response.data.home_team),
      away_team: normalizeClubColors(response.data.away_team),
    };

    if (!home && !away) {
      cachedNextMatch = normalized;
    }
    return normalized;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchTeamByIdentifier(
  identifier: string | number,
): Promise<ClubTeam> {
  try {
    const response = await teamsApi.get<{ status: string; team: ClubTeam }>(
      `/api/teams/${encodeURIComponent(String(identifier))}`,
    );
    return normalizeClubColors(response.data.team);
  } catch (error) {
    handleAxiosError(error);
  }
}

export function clearTeamsCache(): void {
  cachedTeams = null;
  cachedNextMatch = null;
}
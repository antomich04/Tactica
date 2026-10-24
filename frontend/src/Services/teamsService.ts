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
    cachedTeams = response.data.teams;
    return response.data.teams;
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

    if (!home && !away) {
      cachedNextMatch = response.data;
    }
    return response.data;
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
    return response.data.team;
  } catch (error) {
    handleAxiosError(error);
  }
}

export function clearTeamsCache(): void {
  cachedTeams = null;
}

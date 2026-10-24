const MATCHUP_STORAGE_KEY = "tactica.matchup";

export type SavedMatchup = {
  homeTeamId: number;
  awayTeamId: number;
};

export function readSavedMatchup(): SavedMatchup | null {
  const saved = window.localStorage.getItem(MATCHUP_STORAGE_KEY);
  if (!saved) return null;

  try {
    const matchup: unknown = JSON.parse(saved);
    if (
      typeof matchup === "object" &&
      matchup !== null &&
      "homeTeamId" in matchup &&
      "awayTeamId" in matchup &&
      typeof matchup.homeTeamId === "number" &&
      Number.isInteger(matchup.homeTeamId) &&
      typeof matchup.awayTeamId === "number" &&
      Number.isInteger(matchup.awayTeamId) &&
      matchup.homeTeamId !== matchup.awayTeamId
    ) {
      return {
        homeTeamId: matchup.homeTeamId,
        awayTeamId: matchup.awayTeamId,
      };
    }
  } catch {
    // Invalid persisted selection is discarded below.
  }

  window.localStorage.removeItem(MATCHUP_STORAGE_KEY);
  return null;
}

export function saveMatchup(matchup: SavedMatchup): void {
  window.localStorage.setItem(MATCHUP_STORAGE_KEY, JSON.stringify(matchup));
}

export function clearSavedMatchup(): void {
  window.localStorage.removeItem(MATCHUP_STORAGE_KEY);
}

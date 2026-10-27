import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/Components/button";
import { api, ApiError } from "../Services/authService";
import { useAuth } from "../Providers/AuthProvider";
import { clearTeamsCache, fetchAllTeams } from "../Services/teamsService";
import { useTranslation } from "../Utils/i18n";
import type { ClubTeam, LanguageCode } from "../types";

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  es: "Español (Spanish)",
  pt: "Português (Portuguese)",
  gr: "Ελληνικά (Greek)",
};

interface AccountPreferencesModalProps {
  open: boolean;
  preference: "language" | "favorites";
  onClose: () => void;
}

function extractError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) {
      return String(detail[0].msg).replace(/^Value error,\s*/i, "");
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export function AccountPreferencesModal({
  open,
  preference,
  onClose,
}: AccountPreferencesModalProps) {
  const { user, patchUser } = useAuth();
  const { t } = useTranslation();
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [favoritePlayer, setFavoritePlayer] = useState("");
  const [teams, setTeams] = useState<ClubTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamsError, setTeamsError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setLanguage(user?.preferences?.language ?? "en");
    setFavoriteTeam(user?.preferences?.favorite_team ?? "");
    setFavoritePlayer(user?.preferences?.favorite_player ?? "");
    setTeamsError("");
    setError("");

    if (preference !== "favorites") return;

    let active = true;
    setLoadingTeams(true);
    fetchAllTeams()
      .then((teamList) => {
        if (active) setTeams(teamList);
      })
      .catch((loadError: unknown) => {
        if (active) setTeamsError(extractError(loadError, t("preferencesUpdateFailure")));
      })
      .finally(() => {
        if (active) setLoadingTeams(false);
      });

    return () => {
      active = false;
    };
  }, [open, preference, user?.preferences]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  const selectedClub = teams.find((team) => team.name === favoriteTeam) ?? null;

  const savePreferences = async (
    event: FormEvent,
    updates:
      | { language: LanguageCode }
      | {
          favorite_team: string | null;
          favorite_player: string | null;
        },
  ) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await api.patch("/api/account/preferences", updates);
      patchUser({ preferences: response.data.user?.preferences ?? response.data.preferences }, true);
      if ("favorite_team" in updates) clearTeamsCache();
      onClose();
    } catch (saveError: unknown) {
      setError(extractError(saveError, t("preferencesUpdateFailure")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-preference-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-2xl border-2 border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6"
      >
        <header className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2
            id="account-preference-title"
            className="text-xl font-black uppercase tracking-wide text-white"
          >
            {preference === "language" ? t("changeLanguage") : t("favTeamAndPlayer")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closePreferences", { preference })}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {preference === "favorites" && teamsError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{teamsError}</span>
          </div>
        )}
        {preference === "language" ? (
          <form
            onSubmit={(event) => void savePreferences(event, { language })}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setLanguage(code);
                    setError("");
                  }}
                  className={`rounded-xl border-2 p-3.5 text-left font-bold transition-all ${
                    language === code
                      ? "border-blue-500 bg-blue-950/50 text-blue-400"
                      : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {LANGUAGE_LABELS[code]}
                </button>
              ))}
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="h-12 bg-blue-500 font-bold text-white hover:bg-blue-600"
            >
              {busy ? t("saving") : t("saveLanguage")}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(event) =>
              void savePreferences(event, {
                favorite_team: favoriteTeam.trim() || null,
                favorite_player: favoritePlayer.trim() || null,
              })
            }
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("favoriteTeam")}
              <select
                value={favoriteTeam}
                onChange={(event) => {
                  setFavoriteTeam(event.target.value);
                  setFavoritePlayer("");
                  setError("");
                }}
                disabled={loadingTeams}
                className="h-12 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white disabled:opacity-50"
              >
                <option value="">{t("none")}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.name}>
                    {team.name} ({team.formation})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("favoritePlayer")}
              <select
                value={favoritePlayer}
                onChange={(event) => {
                  setFavoritePlayer(event.target.value);
                  setError("");
                }}
                disabled={!selectedClub || loadingTeams}
                className="h-12 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white disabled:opacity-50"
              >
                <option value="">
                  {selectedClub ? t("noneAllPlayers") : t("selectTeamFirst")}
                </option>
                {selectedClub && (
                  <>
                    <optgroup label={t("startingXI")}>
                      {selectedClub.roster.starters.map((player) => (
                        <option key={player.id} value={player.name}>
                          {player.name} ({player.role})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t("substitutes")}>
                      {selectedClub.roster.substitutes.map((player) => (
                        <option key={player.id} value={player.name}>
                          {player.name} ({player.role})
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
            </label>
            <Button
              type="submit"
              disabled={busy || loadingTeams || Boolean(teamsError)}
              className="h-12 bg-blue-500 font-bold text-white hover:bg-blue-600"
            >
              {busy ? t("saving") : t("saveFavorites")}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
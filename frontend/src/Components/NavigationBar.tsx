import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  User,
  Settings,
  LogOut,
  Globe,
  Heart,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../Providers/AuthProvider";
import { AccountPreferencesModal } from "./AccountPreferencesModal";
import { useTranslation } from "../Utils/i18n";

export function NavigationBar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [preferenceModal, setPreferenceModal] = useState<
    "language" | "favorites" | null
  >(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const { logout, user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = (user?.preferences?.language ?? "en").toUpperCase();
  const favSummary =
    user?.preferences?.favorite_team ||
    user?.preferences?.favorite_player ||
    t("favTeamPlayer");

  return (
    <>
      <nav
        aria-label={t("primaryNavigation")}
        className="w-full h-20 bg-slate-900 border-b border-slate-700/50 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-md"
      >
        {/* Left: Brand */}
        <div className="flex items-center">
          <Link
            to="/home"
            className="text-2xl font-black text-emerald-400 tracking-widest uppercase hover:text-emerald-300 transition-colors"
          >
            Tactica
          </Link>
        </div>

        {/* Right: Account Dropdown */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative flex justify-end" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-label={`Account menu for ${user?.username ?? t("account")}`}
              aria-expanded={dropdownOpen}
              aria-controls="account-dropdown"
              className="flex items-center gap-2 md:gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 pl-1.5 pr-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-600 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
                )}
              </div>
              <span className="hidden sm:block text-sm font-bold text-white max-w-[100px] truncate">
                {user?.username ?? t("account")}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div
                id="account-dropdown"
                className="absolute right-0 top-full mt-3 w-64 bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-slate-700/50 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    {t("quickPrefs")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setPreferenceModal("language");
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 mt-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                      {t("language")}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {currentLang}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setPreferenceModal("favorites");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Heart className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="truncate">{favSummary}</span>
                  </button>
                </div>

                <div className="px-4 py-3">
                  <Link
                    to="/settings"
                    state={{
                      returnTo: `${location.pathname}${location.search}${location.hash}`,
                    }}
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    {t("settings")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void logout();
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-sm font-medium text-red-400 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    {t("logout")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <AccountPreferencesModal
        open={preferenceModal !== null}
        preference={preferenceModal ?? "language"}
        onClose={() => setPreferenceModal(null)}
      />
    </>
  );
}
import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  User,
  Settings,
  LogOut,
  Globe,
  Heart,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../Providers/AuthProvider";

export function NavigationBar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerCloseButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const { logout, user } = useAuth();

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

  useEffect(() => {
    if (!drawerOpen) return;

    drawerCloseButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        mobileMenuButtonRef.current?.focus();
        return;
      }

      if (event.key === "Tab") {
        const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) {
          event.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [drawerOpen]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    mobileMenuButtonRef.current?.focus();
  };

  const getDesktopLinkStyle = (route: string) => {
    const isActive =
      route === "/home"
        ? path === route || path === "/"
        : path.startsWith(route);
    return isActive
      ? "text-sm font-bold text-emerald-400 border-b-2 border-emerald-400 pb-1 uppercase tracking-wider"
      : "text-sm font-bold text-slate-400 hover:text-white border-b-2 border-transparent pb-1 uppercase tracking-wider transition-colors";
  };

  const getMobileLinkStyle = (route: string) => {
    const isActive =
      route === "/home"
        ? path === route || path === "/"
        : path.startsWith(route);
    return isActive
      ? "block text-base font-bold text-emerald-400 border-l-4 border-emerald-400 pl-4 py-3 uppercase tracking-wider bg-slate-800/50 rounded-r-lg"
      : "block text-base font-bold text-slate-400 hover:text-white hover:bg-slate-800/30 border-l-4 border-transparent pl-4 py-3 uppercase tracking-wider transition-all rounded-r-lg";
  };

  const currentLang = (user?.preferences?.language ?? "en").toUpperCase();
  const favSummary =
    user?.preferences?.favorite_team ||
    user?.preferences?.favorite_player ||
    "Favorite Team/Player";

  return (
    <>
      <nav
        aria-label="Primary navigation"
        className="w-full h-20 bg-slate-900 border-b border-slate-700/50 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-md"
      >
        <div className="flex items-center flex-1 md:flex-none justify-start">
          <button
            ref={mobileMenuButtonRef}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-navigation-drawer"
            className="md:hidden text-slate-300 hover:text-white p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden md:flex items-center">
            <Link
              to="/home"
              className="text-2xl font-black text-emerald-400 tracking-widest uppercase hover:text-emerald-300 transition-colors"
            >
              Tactica
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-center flex-1 md:flex-none">
          <div className="md:hidden flex items-center justify-center">
            <Link
              to="/home"
              className="text-2xl font-black text-emerald-400 tracking-widest uppercase hover:text-emerald-300 transition-colors"
            >
              Tactica
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8 mt-2">
            <Link to="/home" className={getDesktopLinkStyle("/home")}>
              Home
            </Link>
            <Link to="/match" className={getDesktopLinkStyle("/match")}>
              Matches
            </Link>
            <Link to="/settings" className={getDesktopLinkStyle("/settings")}>
              Settings
            </Link>
          </div>
        </div>

        <div
          className="relative flex justify-end flex-1 md:flex-none"
          ref={dropdownRef}
        >
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label={`Account menu for ${user?.username ?? "Account"}`}
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
              {user?.username ?? "Account"}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div
              id="account-dropdown"
              className="absolute right-0 top-full mt-3 w-56 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50"
            >
              <div className="px-3 py-2 border-b border-slate-700/50 mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                  Quick Prefs
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/settings");
                  }}
                  className="w-full flex items-center justify-between gap-3 px-2 py-2 mt-1 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                    Language
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {currentLang}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/settings");
                  }}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="truncate">{favSummary}</span>
                </button>
              </div>

              <div className="px-3 py-1">
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void logout();
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {drawerOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 md:hidden animate-in fade-in duration-200"
          onClick={closeDrawer}
        />
      )}

      <div
        ref={drawerRef}
        id="mobile-navigation-drawer"
        role="dialog"
        aria-label="Mobile navigation"
        aria-modal={drawerOpen}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
        className={`fixed top-0 left-0 h-full w-[280px] bg-slate-900 border-r border-slate-700/50 z-[60] transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl flex flex-col ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-700/50">
          <span className="text-xl font-black text-emerald-400 tracking-widest uppercase">
            Tactica
          </span>
          <button
            ref={drawerCloseButtonRef}
            onClick={closeDrawer}
            aria-label="Close navigation menu"
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2 p-4 mt-2 overflow-y-auto">
          <Link
            to="/home"
            onClick={closeDrawer}
            className={getMobileLinkStyle("/home")}
          >
            Home
          </Link>
          <Link
            to="/match"
            onClick={closeDrawer}
            className={getMobileLinkStyle("/match")}
          >
            Matches
          </Link>
          <Link
            to="/settings"
            onClick={closeDrawer}
            className={getMobileLinkStyle("/settings")}
          >
            Settings
          </Link>
        </div>
      </div>
    </>
  );
}

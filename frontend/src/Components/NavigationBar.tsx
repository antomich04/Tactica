import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../Providers/AuthProvider";
import { UserCircle, LogOut, Settings, ChevronDown } from "lucide-react";

export function NavigationBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Dropdown state and ref for the click-outside listener
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/Login");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-lg font-bold transition-colors hover:text-emerald-400 ${
      isActive ? "text-emerald-500 border-b-4 border-emerald-500 pb-1" : "text-slate-300"
    }`;

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-10 py-6 bg-slate-900 border-b border-slate-800 relative">
      
      {/* LEFT: Logo */}
      <div className="flex items-center">
        <span className="text-4xl font-black tracking-tight text-emerald-500 uppercase">
          Tactica
        </span>
      </div>

      {/* CENTER: Navigation Links */}
      <div className="hidden md:flex gap-10 items-center absolute left-1/2 -translate-x-1/2 mt-2">
        <NavLink to="/Home" className={navLinkClass}>
          Home
        </NavLink>
        <NavLink to="/Match" className={navLinkClass}>
          Matches
        </NavLink>
        <NavLink to="/Settings" className={navLinkClass}>
          Settings
        </NavLink>
      </div>

      {/* RIGHT: User Dropdown */}
      <div className="flex items-center" ref={dropdownRef}>
        {user && (
          <div className="relative">
            {/* Clickable Profile Trigger */}
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 text-slate-300 hover:text-emerald-400 transition-colors focus:outline-none"
            >
              <UserCircle className="w-8 h-8" />
              <span className="text-xl font-bold">{user.username}</span>
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-4 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden py-1 z-50">
                
                <button 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate("/Settings");
                  }}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 text-slate-300 hover:bg-slate-700 hover:text-emerald-400 transition-colors font-semibold"
                >
                  <Settings className="w-5 h-5" />
                  User Settings
                </button>
                
                <div className="h-px bg-slate-700 my-1" />
                
                <button 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors font-semibold"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
                
              </div>
            )}
          </div>
        )}
      </div>
      
    </nav>
  );
}
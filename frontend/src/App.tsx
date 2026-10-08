// The shell: decides which page to show. The match logic lives in Pages/MatchPage, the sign-in logic in Components/AuthProvider.
import { AuthProvider, useAuth } from "./Providers/AuthProvider";
import { LoginPage } from "./Pages/LoginPage";
import { MatchPage } from "./Pages/MatchPage";
import { AUTH_ENABLED } from "./Services/authService";

export function App() {
  if (!AUTH_ENABLED) return <MatchPage />;
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { status, user, logout, getWsTicket } = useAuth();

  if (status === "loading") return <p className="splash">Loading…</p>;
  if (status === "anonymous" || !user) return <LoginPage />;

  return <MatchPage user={user} onLogout={() => void logout()} getWsTicket={getWsTicket} />;
}

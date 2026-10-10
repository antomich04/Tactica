import { createBrowserRouter, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "./Providers/AuthProvider";
import { LoginPage } from "./Pages/LoginPage";
import { SignUpPage } from "./Pages/SignUpPage";
import { MatchPage } from "./Pages/MatchPage";

function AuthGuard() {
  const { status, user } = useAuth();
  
  if (status === "loading") return <p className="splash">Loading…</p>;
  
  const isAuthenticated = status !== "anonymous" && user;
  return isAuthenticated ? <Outlet /> : <Navigate to="/Login" replace />;
}

function PublicGuard() {
  const { status, user } = useAuth();
  
  if (status === "loading") return <p className="splash">Loading…</p>;
  
  const isAuthenticated = status !== "anonymous" && user;
  return !isAuthenticated ? <Outlet /> : <Navigate to="/Home" replace />;
}

function MatchPageWrapper() {
  const { user, logout, getWsTicket } = useAuth();
  return <MatchPage user={user!} onLogout={() => void logout()} getWsTicket={getWsTicket} />;
}

export const router = createBrowserRouter([
  {
    element: <PublicGuard />,
    children: [
      { path: "/Login", element: <LoginPage /> },
      { path: "/SignUp", element: <SignUpPage /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      { path: "/Home", element: <MatchPageWrapper /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/Login" replace />,
  },
]);
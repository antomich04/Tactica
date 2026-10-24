import { createBrowserRouter, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "./Providers/AuthProvider";
import { LoginPage } from "./Pages/LoginPage";
import { ForgotPasswordPage } from "./Pages/ForgotPasswordPage";
import { SignUpPage } from "./Pages/SignUpPage";
import { MatchPage } from "./Pages/MatchPage";
import { HomePage } from "./Pages/HomePage";
import { SettingsPage } from "./Pages/SettingsPage";
import { NotFoundPage } from "./Pages/NotFoundPage";
import { NavigationBar } from "./Components/NavigationBar";

function AuthGuard() {
  const { status, user } = useAuth();

  if (status === "loading") return <p className="splash">Loading…</p>;

  const isAuthenticated = status !== "anonymous" && user;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicGuard() {
  const { status, user } = useAuth();

  if (status === "loading") return <p className="splash">Loading…</p>;

  const isAuthenticated = status === "authenticated" && Boolean(user);
  return !isAuthenticated ? <Outlet /> : <Navigate to="/home" replace />;
}

function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0f172a]">
      <NavigationBar />
      <main className="flex-1 relative min-h-0">
        <Outlet />
      </main>
    </div>
  );
}

function MatchPageWrapper() {
  const { getWsTicket } = useAuth();
  return <MatchPage getWsTicket={getWsTicket} />;
}

export const router = createBrowserRouter([
  {
    element: <PublicGuard />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/signup", element: <SignUpPage /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: "/home", element: <HomePage /> },
          { path: "/match", element: <MatchPageWrapper /> },
          { path: "/settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

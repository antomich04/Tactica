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
    path: "/",
    element: <Navigate to="/home" replace />,
  },
  {
    element: <PublicGuard />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/Login", element: <Navigate to="/login" replace /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/ signup", element: <Navigate to="/signup" replace /> },
      { path: "/signup", element: <SignUpPage /> },
      { path: "/SignUp", element: <Navigate to="/signup" replace /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: "/home", element: <HomePage /> },
          { path: "/Home", element: <Navigate to="/home" replace /> },
          { path: "/match", element: <MatchPageWrapper /> },
          { path: "/Match", element: <Navigate to="/match" replace /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "/Settings", element: <Navigate to="/settings" replace /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
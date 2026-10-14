import { createBrowserRouter, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "./Providers/AuthProvider";
import { LoginPage } from "./Pages/LoginPage";
import { SignUpPage } from "./Pages/SignUpPage";
import { MatchPage } from "./Pages/MatchPage";
import { HomePage } from "./Pages/HomePage";
import { NavigationBar } from "./Components/NavigationBar";

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
      { path: "/Login", element: <LoginPage /> },
      { path: "/SignUp", element: <SignUpPage /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: "/Home", element: <HomePage /> },
          { path: "/Match", element: <MatchPageWrapper /> },
        ]
      }
    ],
  },
  {
    path: "*",
    element: <Navigate to="/Login" replace />,
  },
]);
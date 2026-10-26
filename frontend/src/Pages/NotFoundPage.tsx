import { useNavigate } from "react-router-dom";
import { Button } from "@/Components/button";
import { useAuth } from "../Providers/AuthProvider";

export function NotFoundPage() {
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const destination =
    status === "authenticated" && user ? "/home" : "/login";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0f172a] px-6 text-center text-slate-50">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-400">
          404
        </p>
        <h1 className="text-4xl font-black sm:text-5xl">Page not found</h1>
        <p className="max-w-md text-slate-400">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
      </div>
      <Button
        type="button"
        onClick={() => navigate(destination)}
        className="bg-emerald-600 px-6 text-white hover:bg-emerald-500"
      >
        {destination === "/home" ? "Go to home" : "Go to login"}
      </Button>
    </main>
  );
}

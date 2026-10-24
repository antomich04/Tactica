import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../Providers/AuthProvider";
import { ApiError } from "../Services/authService";
import { Button } from "@/Components/button";
import { Input } from "@/Components/input";
import { Label } from "@/Components/label";
import { Alert, AlertDescription } from "@/Components/alert";
import {
  AlertCircle,
  Activity,
  Radio,
  CheckCircle2,
} from "lucide-react";

const BASE_INPUT_CLASSES =
  "h-16 px-5 w-full rounded-xl bg-slate-950 text-white text-2xl border border-slate-700 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#020617_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]";

const ERROR_INPUT_CLASSES =
  "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30";

function extractError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) {
      return String(detail[0].msg).replace(/^Value error,\s*/i, "");
    }
  }
  return err instanceof Error ? err.message : fallback;
}

export function LoginPage() {
  const { login, notice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const resetSuccess = (
    location.state as { resetSuccess?: string } | null
  )?.resetSuccess;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    identifier: "",
    password: "",
  });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const validateLogin = () => {
    const errors = { identifier: "", password: "" };
    let isValid = true;

    if (!identifier.trim()) {
      errors.identifier = "Username or email is required.";
      isValid = false;
    }
    if (!password) {
      errors.password = "Password is required.";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    if (!validateLogin()) return;

    setBusy(true);
    setFormError("");
    try {
      await login(identifier.trim(), password);
      navigate("/home");
    } catch (err: unknown) {
      setFormError(extractError(err, "Sign in failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#070d24] text-slate-50 min-[860px]:flex-row">
      <section className="flex flex-none flex-col items-center justify-center border-b border-slate-800 bg-[#020617] px-8 py-16 min-[860px]:flex-1 min-[860px]:border-b-0 min-[860px]:border-r min-[860px]:p-8">
        <h1 className="mb-12 font-[family-name:var(--cond)] text-[4rem] leading-none tracking-[0.05em] text-white [text-shadow:0_0_40px_rgba(255,255,255,0.05)] min-[860px]:text-[6rem]">
          TACTICA
        </h1>

        <div className="grid w-full max-w-[720px] grid-cols-1 gap-8 min-[860px]:grid-cols-2">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-8 py-10 text-center backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-white/[0.06]">
            <Activity className="mb-2 h-12 w-12 text-blue-500" />
            <h2 className="m-0 font-[family-name:var(--cond)] text-[1.75rem] tracking-wide text-slate-50">
              Live Intelligence
            </h2>
            <p className="m-0 text-lg leading-relaxed text-slate-300">
              Real-time momentum tracking and control vs chaos analytics.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-8 py-10 text-center backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-white/[0.06]">
            <Radio className="mb-2 h-12 w-12 text-blue-500" />
            <h2 className="m-0 font-[family-name:var(--cond)] text-[1.75rem] tracking-wide text-slate-50">
              Broadcast Gallery
            </h2>
            <p className="m-0 text-lg leading-relaxed text-slate-300">
              Dynamic, personalized overlay generation in multiple languages.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center p-8 sm:p-12">
        <form
          className="flex w-full max-w-[560px] flex-col gap-7"
          onSubmit={submitLogin}
          noValidate
        >
          <div>
            <h2 className="mb-2 font-[family-name:var(--cond)] text-6xl leading-none text-white">
              Welcome Back
            </h2>
            <p className="m-0 text-xl text-slate-400">
              Sign in to access the broadcast gallery.
            </p>
          </div>

          {resetSuccess && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-400">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <span className="text-lg font-medium">{resetSuccess}</span>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <Label
              htmlFor="identifier"
              className={`text-lg font-semibold ${fieldErrors.identifier ? "text-red-500" : "text-white"}`}
            >
              Username or Email
            </Label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                setFieldErrors((previous) => ({
                  ...previous,
                  identifier: "",
                }));
                setFormError("");
              }}
              placeholder="Enter your username or email"
              autoComplete="username"
              className={`${BASE_INPUT_CLASSES} ${fieldErrors.identifier ? ERROR_INPUT_CLASSES : ""}`}
              autoFocus
            />
            {fieldErrors.identifier && (
              <span className="mt-1 text-base font-medium text-red-500">
                {fieldErrors.identifier}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className={`text-lg font-semibold ${fieldErrors.password ? "text-red-500" : "text-white"}`}
              >
                Password
              </Label>
              <Button
                variant="link"
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="h-auto p-0 text-base text-blue-400 hover:underline"
              >
                Forgot password?
              </Button>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors((previous) => ({ ...previous, password: "" }));
                setFormError("");
              }}
              placeholder="Enter your password"
              autoComplete="current-password"
              className={`${BASE_INPUT_CLASSES} ${fieldErrors.password ? ERROR_INPUT_CLASSES : ""}`}
            />
            {fieldErrors.password && (
              <span className="mt-1 text-base font-medium text-red-500">
                {fieldErrors.password}
              </span>
            )}
          </div>

          {formError && (
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-red-500 bg-red-500/10 p-4 text-red-500">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <span className="text-lg font-medium">{formError}</span>
            </div>
          )}

          {!formError && notice && (
            <Alert className="mt-2 border-none bg-transparent p-0 text-lg text-slate-300 shadow-none [&>svg]:hidden">
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="mt-2 h-16 w-full rounded-xl bg-blue-500 text-xl font-semibold text-white transition-colors hover:bg-blue-600"
            disabled={busy}
          >
            {busy ? "Signing in..." : "Login"}
          </Button>

          <div className="mt-2 text-center text-lg text-slate-400">
            <p className="m-0">
              Don&apos;t have an account?{" "}
              <Button
                variant="link"
                type="button"
                className="h-auto bg-transparent p-0 text-lg font-semibold text-blue-500 hover:underline"
                onClick={() => navigate("/signup")}
              >
                Sign up
              </Button>
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}

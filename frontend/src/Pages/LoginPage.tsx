import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../Providers/AuthProvider";
import { api, ApiError } from "../Services/authService";
import { Button } from "@/Components/button";
import { Input } from "@/Components/input";
import { Label } from "@/Components/label";
import { Alert, AlertDescription } from "@/Components/alert";
import { AlertCircle, Activity, Radio, CheckCircle2 } from "lucide-react";

const BASE_INPUT_CLASSES =
  "h-16 px-5 w-full rounded-xl bg-slate-950 text-white text-2xl border border-slate-700 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#020617_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]";

const ERROR_INPUT_CLASSES =
  "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30";

function validateBackendPassword(pw: string): string {
  if (!pw) return "Password is required.";
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw))
    return "Password must contain at least one capital letter.";
  if (!/[!@#$%^&*]/.test(pw))
    return "Password must contain at least one special character (!@#$%^&*).";
  if (/[()]/.test(pw)) return "Password must not contain parentheses.";
  return "";
}

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

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    identifier: "",
    password: "",
  });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  // 3-Step Forgot Password State: request -> verify -> reset
  const [mode, setMode] = useState<
    "login" | "forgot_request" | "forgot_verify" | "forgot_reset"
  >("login");
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

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
      navigate("/Home");
    } catch (err: unknown) {
      setFormError(extractError(err, "Sign in failed"));
    } finally {
      setBusy(false);
    }
  }

  // Step 1: POST /api/auth/forgot-password/request
  async function handleRequestReset(event: FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
      setFormError("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      await api.post("/api/auth/forgot-password/request", {
        email: resetEmail.trim(),
      });
      setMode("forgot_verify");
    } catch (err: unknown) {
      setFormError(extractError(err, "Request failed"));
    } finally {
      setBusy(false);
    }
  }

  // Step 2: POST /api/auth/forgot-password/verify
  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    if (otp.trim().length !== 6) {
      setFormError("OTP must be 6 digits.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      await api.post("/api/auth/forgot-password/verify", {
        email: resetEmail.trim(),
        otp: otp.trim(),
      });
      setMode("forgot_reset");
    } catch (err: unknown) {
      setFormError(extractError(err, "Invalid or expired OTP."));
    } finally {
      setBusy(false);
    }
  }

  // Step 3: POST /api/auth/forgot-password/reset
  async function handleConfirmReset(event: FormEvent) {
    event.preventDefault();
    const pwErr = validateBackendPassword(newPassword);
    if (pwErr) {
      setFormError(pwErr);
      return;
    }

    setBusy(true);
    setFormError("");
    try {
      await api.post("/api/auth/forgot-password/reset", {
        email: resetEmail.trim(),
        otp: otp.trim(),
        new_password: newPassword,
      });
      setResetSuccess("Password reset successfully! You can now log in.");
      setMode("login");
      setPassword("");
      setOtp("");
      setNewPassword("");
    } catch (err: unknown) {
      setFormError(extractError(err, "Reset failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col min-[860px]:flex-row min-h-screen w-full bg-[#070d24] text-slate-50">
      {/* Left Brand Section */}
      <section className="flex-none min-[860px]:flex-1 flex flex-col items-center justify-center bg-[#020617] border-b min-[860px]:border-b-0 min-[860px]:border-r border-slate-800 px-8 py-16 min-[860px]:p-8">
        <h1 className="font-[family-name:var(--cond)] text-[4rem] min-[860px]:text-[6rem] tracking-[0.05em] mb-12 text-white [text-shadow:0_0_40px_rgba(255,255,255,0.05)] leading-none">
          TACTICA
        </h1>

        <div className="grid grid-cols-1 min-[860px]:grid-cols-2 gap-8 max-w-[720px] w-full">
          <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-blue-500/30 rounded-2xl px-8 py-10 text-center flex flex-col items-center gap-4 backdrop-blur-md transition-all duration-200 hover:-translate-y-1">
            <Activity className="w-12 h-12 text-blue-500 mb-2" />
            <h3 className="m-0 font-[family-name:var(--cond)] text-[1.75rem] text-slate-50 tracking-wide">
              Live Intelligence
            </h3>
            <p className="m-0 text-lg text-slate-300 leading-relaxed">
              Real-time momentum tracking and control vs chaos analytics.
            </p>
          </div>

          <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-blue-500/30 rounded-2xl px-8 py-10 text-center flex flex-col items-center gap-4 backdrop-blur-md transition-all duration-200 hover:-translate-y-1">
            <Radio className="w-12 h-12 text-blue-500 mb-2" />
            <h3 className="m-0 font-[family-name:var(--cond)] text-[1.75rem] text-slate-50 tracking-wide">
              Broadcast Gallery
            </h3>
            <p className="m-0 text-lg text-slate-300 leading-relaxed">
              Dynamic, personalized overlay generation in multiple languages.
            </p>
          </div>
        </div>
      </section>

      {/* Right Form Section */}
      <section className="flex-1 flex items-center justify-center p-8 sm:p-12">
        {mode === "login" && (
          <form
            className="w-full max-w-[560px] flex flex-col gap-7"
            onSubmit={submitLogin}
            noValidate
          >
            <div>
              <h2 className="font-[family-name:var(--cond)] text-6xl mb-2 text-white leading-none">
                Welcome Back
              </h2>
              <p className="text-slate-400 text-xl m-0">
                Sign in to access the broadcast gallery.
              </p>
            </div>

            {resetSuccess && (
              <div className="p-4 rounded-xl flex items-center gap-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <span className="font-medium text-lg">{resetSuccess}</span>
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
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setFieldErrors((p) => ({ ...p, identifier: "" }));
                  setFormError("");
                }}
                placeholder="Enter your username or email"
                autoComplete="username"
                className={`${BASE_INPUT_CLASSES} ${fieldErrors.identifier ? ERROR_INPUT_CLASSES : ""}`}
                autoFocus
              />
              {fieldErrors.identifier && (
                <span className="text-red-500 text-base mt-1 font-medium">
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
                  onClick={() => {
                    setFormError("");
                    setResetSuccess("");
                    setMode("forgot_request");
                  }}
                  className="p-0 h-auto text-base text-blue-400 hover:underline"
                >
                  Forgot password?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((p) => ({ ...p, password: "" }));
                  setFormError("");
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={`${BASE_INPUT_CLASSES} ${fieldErrors.password ? ERROR_INPUT_CLASSES : ""}`}
              />
              {fieldErrors.password && (
                <span className="text-red-500 text-base mt-1 font-medium">
                  {fieldErrors.password}
                </span>
              )}
            </div>

            {formError && (
              <div className="mt-2 p-4 rounded-xl flex items-center gap-3 bg-red-500/10 text-red-500 border border-red-500">
                <AlertCircle className="h-6 w-6 shrink-0" />
                <span className="font-medium text-lg">{formError}</span>
              </div>
            )}

            {!formError && notice && (
              <Alert className="mt-2 bg-transparent border-none p-0 shadow-none text-slate-300 text-lg [&>svg]:hidden">
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xl h-16 rounded-xl transition-colors"
              disabled={busy}
            >
              {busy ? "Signing in..." : "Login"}
            </Button>

            <div className="text-center mt-2 text-lg text-slate-400">
              <p className="m-0">
                Don't have an account?{" "}
                <Button
                  variant="link"
                  type="button"
                  className="p-0 h-auto font-semibold text-lg text-blue-500 hover:underline bg-transparent"
                  onClick={() => navigate("/SignUp")}
                >
                  Sign up
                </Button>
              </p>
            </div>
          </form>
        )}

        {mode === "forgot_request" && (
          <form
            className="w-full max-w-[560px] flex flex-col gap-7"
            onSubmit={handleRequestReset}
            noValidate
          >
            <div>
              <h2 className="font-[family-name:var(--cond)] text-6xl mb-2 text-white leading-none">
                Reset Password
              </h2>
              <p className="text-slate-400 text-xl m-0">
                Enter your email to receive a 6-digit one-time passcode.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <Label
                htmlFor="resetEmail"
                className="text-lg font-semibold text-white"
              >
                Email Address
              </Label>
              <Input
                id="resetEmail"
                type="email"
                value={resetEmail}
                onChange={(e) => {
                  setResetEmail(e.target.value);
                  setFormError("");
                }}
                placeholder="Enter your account email"
                className={BASE_INPUT_CLASSES}
                autoFocus
              />
            </div>

            {formError && (
              <div className="p-4 rounded-xl flex items-center gap-3 bg-red-500/10 text-red-500 border border-red-500">
                <AlertCircle className="h-6 w-6 shrink-0" />
                <span className="font-medium text-lg">{formError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xl h-16 rounded-xl"
              disabled={busy}
            >
              {busy ? "Sending OTP..." : "Send Reset Code"}
            </Button>

            <Button
              variant="link"
              type="button"
              className="text-lg text-slate-400 hover:text-white"
              onClick={() => {
                setFormError("");
                setMode("login");
              }}
            >
              Back to Login
            </Button>
          </form>
        )}

        {mode === "forgot_verify" && (
          <form
            className="w-full max-w-[560px] flex flex-col gap-7"
            onSubmit={handleVerifyOtp}
            noValidate
          >
            <div>
              <h2 className="font-[family-name:var(--cond)] text-6xl mb-2 text-white leading-none">
                Verify OTP
              </h2>
              <p className="text-slate-400 text-xl m-0">
                Enter the 6-digit code sent to{" "}
                <span className="text-white font-semibold">{resetEmail}</span>.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="otp" className="text-lg font-semibold text-white">
                6-Digit OTP
              </Label>
              <Input
                id="otp"
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  setFormError("");
                }}
                placeholder="123456"
                className={BASE_INPUT_CLASSES}
                autoFocus
              />
            </div>

            {formError && (
              <div className="p-4 rounded-xl flex items-center gap-3 bg-red-500/10 text-red-500 border border-red-500">
                <AlertCircle className="h-6 w-6 shrink-0" />
                <span className="font-medium text-lg">{formError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xl h-16 rounded-xl"
              disabled={busy}
            >
              {busy ? "Verifying..." : "Verify Code"}
            </Button>

            <Button
              variant="link"
              type="button"
              className="text-lg text-slate-400 hover:text-white"
              onClick={() => {
                setFormError("");
                setMode("login");
              }}
            >
              Cancel
            </Button>
          </form>
        )}

        {mode === "forgot_reset" && (
          <form
            className="w-full max-w-[560px] flex flex-col gap-7"
            onSubmit={handleConfirmReset}
            noValidate
          >
            <div>
              <h2 className="font-[family-name:var(--cond)] text-6xl mb-2 text-white leading-none">
                New Password
              </h2>
              <p className="text-slate-400 text-xl m-0">
                OTP verified! Choose a new password for{" "}
                <span className="text-white font-semibold">{resetEmail}</span>.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <Label
                htmlFor="newPassword"
                className="text-lg font-semibold text-white"
              >
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setFormError("");
                }}
                placeholder="Min 8 chars, 1 uppercase, 1 symbol (!@#$%^&*)"
                className={BASE_INPUT_CLASSES}
                autoFocus
              />
            </div>

            {formError && (
              <div className="p-4 rounded-xl flex items-center gap-3 bg-red-500/10 text-red-500 border border-red-500">
                <AlertCircle className="h-6 w-6 shrink-0" />
                <span className="font-medium text-lg">{formError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xl h-16 rounded-xl"
              disabled={busy}
            >
              {busy ? "Resetting..." : "Confirm New Password"}
            </Button>

            <Button
              variant="link"
              type="button"
              className="text-lg text-slate-400 hover:text-white"
              onClick={() => {
                setFormError("");
                setMode("login");
              }}
            >
              Cancel
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api, ApiError } from "../Services/authService";
import { Button } from "@/Components/button";
import { Input } from "@/Components/input";
import { Label } from "@/Components/label";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

const BASE_INPUT_CLASSES =
  "h-16 px-5 w-full rounded-xl bg-slate-950 text-white text-2xl border border-slate-700 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#020617_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]";

function validatePassword(password: string): string {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password))
    return "Password must contain at least one capital letter.";
  if (!/[!@#$%^&*]/.test(password))
    return "Password must contain at least one special character (!@#$%^&*).";
  if (/[()]/.test(password))
    return "Password must not contain parentheses.";
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

type ResetStep = "request" | "verify" | "reset";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ResetStep>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [requestNotice, setRequestNotice] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(
      () => setResendSeconds((seconds) => seconds - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  async function sendResetCode(isResend = false) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await api.post("/api/auth/forgot-password/request", {
        email: email.trim(),
      });
      setRequestNotice(
        isResend
          ? "A new code has been sent."
          : "The code has been sent if the provided email matches your account.",
      );
      setEmailSubmitted(true);
      setOtp("");
      setNewPassword("");
      setResendSeconds(30);
      setStep("verify");
    } catch (err: unknown) {
      setError(extractError(err, "Request failed"));
    } finally {
      setBusy(false);
    }
  }

  function requestReset(event: FormEvent) {
    event.preventDefault();
    void sendResetCode();
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    if (!emailSubmitted) {
      setError("Submit your email before entering the code.");
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("OTP must be 6 digits.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await api.post("/api/auth/forgot-password/verify", {
        email: email.trim(),
        otp: otp.trim(),
      });
      setStep("reset");
    } catch (err: unknown) {
      setError(extractError(err, "Invalid or expired OTP."));
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset(event: FormEvent) {
    event.preventDefault();
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setBusy(true);
    setError("");
    try {
      await api.post("/api/auth/forgot-password/reset", {
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword,
      });
      navigate("/login", {
        replace: true,
        state: { resetSuccess: "Password reset successfully! You can now log in." },
      });
    } catch (err: unknown) {
      setError(extractError(err, "Reset failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070d24] px-6 py-12 text-slate-50">
      <section className="w-full max-w-[560px]">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mb-8 inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </button>

        <div className="flex flex-col gap-7">
          <div>
            <h1 className="font-[family-name:var(--cond)] text-5xl text-white leading-none sm:text-6xl">
              {step === "request"
                ? "Reset Password"
                : step === "verify"
                  ? "Verify OTP"
                  : "New Password"}
            </h1>
            <p className="mt-3 text-lg text-slate-400">
              {step === "request" &&
                "Enter your email to receive a 6-digit one-time passcode."}
              {step === "verify" && (
                <>
                  Enter the code sent to{" "}
                  <span className="font-semibold text-white">{email}</span>.
                </>
              )}
              {step === "reset" && (
                <>
                  Choose a new password for{" "}
                  <span className="font-semibold text-white">{email}</span>.
                </>
              )}
            </p>
          </div>

          <form
            className="flex flex-col gap-2.5"
            onSubmit={requestReset}
            noValidate
          >
            <Label
              htmlFor="resetEmail"
              className="text-lg font-semibold text-white"
            >
              Email Address
            </Label>
            <Input
              id="resetEmail"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
                setRequestNotice("");
                setEmailSubmitted(false);
                setResendSeconds(0);
                setStep("request");
                setOtp("");
                setNewPassword("");
              }}
              placeholder="Enter your account email"
              autoComplete="email"
              className={BASE_INPUT_CLASSES}
              autoFocus
            />
            <Button
              type="submit"
              className="h-16 w-full rounded-xl bg-blue-500 text-xl font-semibold text-white hover:bg-blue-600"
              disabled={busy}
            >
              {busy ? "Sending OTP..." : "Submit email"}
            </Button>
          </form>

          {requestNotice && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-300">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <span className="font-medium">{requestNotice}</span>
            </div>
          )}

          {step !== "reset" && (
            <form
              className="flex flex-col gap-2.5"
              onSubmit={verifyOtp}
              noValidate
            >
              <Label htmlFor="otp" className="text-lg font-semibold text-white">
                6-Digit OTP
              </Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value);
                  setError("");
                }}
                placeholder="123456"
                className={BASE_INPUT_CLASSES}
                autoFocus={emailSubmitted}
              />
              <Button
                type="submit"
                className="h-16 w-full rounded-xl bg-blue-500 text-xl font-semibold text-white hover:bg-blue-600"
                disabled={busy || !emailSubmitted}
              >
                {busy ? "Verifying..." : "Submit code"}
              </Button>
              {emailSubmitted && (
                <Button
                  type="button"
                  variant="link"
                  className="text-base text-slate-300 hover:text-white"
                  disabled={busy || resendSeconds > 0}
                  onClick={() => void sendResetCode(true)}
                >
                  {resendSeconds > 0
                    ? `Resend code in ${resendSeconds}s`
                    : "Resend code"}
                </Button>
              )}
            </form>
          )}

          {step === "reset" && (
            <form
              className="flex flex-col gap-2.5"
              onSubmit={confirmReset}
              noValidate
            >
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
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setError("");
                }}
                placeholder="Min 8 chars, 1 uppercase, 1 symbol (!@#$%^&*)"
                autoComplete="new-password"
                className={BASE_INPUT_CLASSES}
                autoFocus
              />
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500 bg-red-500/10 p-4 text-red-500">
                  <AlertCircle className="h-6 w-6 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}
              <Button
                type="submit"
                className="h-16 w-full rounded-xl bg-blue-500 text-xl font-semibold text-white hover:bg-blue-600"
                disabled={busy}
              >
                {busy ? "Resetting..." : "Confirm New Password"}
              </Button>
            </form>
          )}

          {error && step !== "reset" && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500 bg-red-500/10 p-4 text-red-500">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}

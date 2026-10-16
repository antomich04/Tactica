import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../Providers/AuthProvider";
import { Button } from "@/Components/button";
import { Input } from "@/Components/input";
import { Label } from "@/Components/label";
import { AlertCircle, Activity, Radio } from "lucide-react";

const BASE_INPUT_CLASSES =
  "h-16 px-5 w-full rounded-xl bg-slate-950 text-white text-2xl border border-slate-700 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#020617_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]";

const ERROR_INPUT_CLASSES =
  "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30";

export function SignUpPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleInput = (
    field: "username" | "email" | "password" | "confirmPassword",
    value: string
  ) => {
    if (field === "username") setUsername(value);
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);
    if (field === "confirmPassword") setConfirmPassword(value);

    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    setFormError("");
  };

  const validate = () => {
    let isValid = true;
    const errors = { username: "", email: "", password: "", confirmPassword: "" };

    if (!username.trim()) {
      errors.username = "Name is required.";
      isValid = false;
    } else if (username.trim().length < 3 || username.trim().length > 64) {
      errors.username = "Name must be between 3 and 64 characters.";
      isValid = false;
    }

    if (!email.trim()) {
      errors.email = "Email is required.";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Invalid email format.";
      isValid = false;
    }

    // Keep these password rules aligned with backend registration validation.
    if (!password) {
      errors.password = "Password is required.";
      isValid = false;
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
      isValid = false;
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Password must contain at least one capital letter.";
      isValid = false;
    } else if (!/[!@#$%^&*]/.test(password)) {
      errors.password = "Password must contain at least one special character (!@#$%^&*).";
      isValid = false;
    } else if (/[()]/.test(password)) {
      errors.password = "Password must not contain parentheses.";
      isValid = false;
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setBusy(true);
    setFormError("");

    try {
      await register(username.trim(), email.trim(), password);
      navigate("/Home");
    } catch (err: unknown) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.detail ?? err.message
        : err instanceof Error
          ? err.message
          : "Sign up failed";
      setFormError(typeof errorMessage === "string" ? errorMessage : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col min-[860px]:flex-row min-h-screen w-full bg-[#070d24] text-slate-50">
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

      <section className="flex-1 flex items-center justify-center p-8 sm:p-12">
        <form className="w-full max-w-[560px] flex flex-col gap-6" onSubmit={submit} noValidate>
          <div>
            <h2 className="font-[family-name:var(--cond)] text-6xl mb-2 text-white leading-none">
              Create an Account
            </h2>
            <p className="text-slate-400 text-xl m-0">
              Sign up to get started with Tactica.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <Label
              htmlFor="username"
              className={`text-lg font-semibold ${fieldErrors.username ? "text-red-500" : "text-white"}`}
            >
              Name
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => handleInput("username", e.target.value)}
              placeholder="Enter your name"
              autoComplete="username"
              className={`${BASE_INPUT_CLASSES} ${fieldErrors.username ? ERROR_INPUT_CLASSES : ""}`}
              autoFocus
            />
            {fieldErrors.username && (
              <span className="text-red-500 text-base mt-1 font-medium">
                {fieldErrors.username}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <Label
              htmlFor="email"
              className={`text-lg font-semibold ${fieldErrors.email ? "text-red-500" : "text-white"}`}
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => handleInput("email", e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              className={`${BASE_INPUT_CLASSES} ${fieldErrors.email ? ERROR_INPUT_CLASSES : ""}`}
            />
            {fieldErrors.email && (
              <span className="text-red-500 text-base mt-1 font-medium">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <Label
              htmlFor="password"
              className={`text-lg font-semibold ${fieldErrors.password ? "text-red-500" : "text-white"}`}
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => handleInput("password", e.target.value)}
              placeholder="Min 8 chars, 1 uppercase, 1 symbol (!@#$%^&*)"
              autoComplete="new-password"
              className={`${BASE_INPUT_CLASSES} ${fieldErrors.password ? ERROR_INPUT_CLASSES : ""}`}
            />
            {fieldErrors.password && (
              <span className="text-red-500 text-base mt-1 font-medium">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <Label
              htmlFor="confirmPassword"
              className={`text-lg font-semibold ${fieldErrors.confirmPassword ? "text-red-500" : "text-white"}`}
            >
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => handleInput("confirmPassword", e.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              className={`${BASE_INPUT_CLASSES} ${fieldErrors.confirmPassword ? ERROR_INPUT_CLASSES : ""}`}
            />
            {fieldErrors.confirmPassword && (
              <span className="text-red-500 text-base mt-1 font-medium">
                {fieldErrors.confirmPassword}
              </span>
            )}
          </div>

          {formError && (
            <div className="mt-2 p-4 rounded-xl flex items-center gap-3 bg-red-500/10 text-red-500 border border-red-500">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <span className="font-medium text-lg">{formError}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xl h-16 rounded-xl transition-colors"
            disabled={busy}
          >
            {busy ? "Creating account..." : "Sign Up"}
          </Button>

          <div className="text-center mt-2 text-lg text-slate-400">
            <p className="m-0">
              Already have an account?{" "}
              <Button
                variant="link"
                type="button"
                className="p-0 h-auto font-semibold text-lg text-blue-500 hover:underline bg-transparent"
                onClick={() => navigate("/Login")}
              >
                Login
              </Button>
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
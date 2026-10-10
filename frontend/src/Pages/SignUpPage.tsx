import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/Components/Ui/button";
import { Input } from "@/Components/Ui/input";
import { Label } from "@/Components/Ui/label";
import { Alert, AlertDescription } from "@/Components/Ui/alert";
import { AlertCircle, Activity, Radio } from "lucide-react";
import "../Styles/Auth.css";

export function SignUpPage() {
  const navigate = useNavigate();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [fieldErrors, setFieldErrors] = useState({
    username: "",
    password: "",
    confirmPassword: ""
  });
  
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleInput = (field: "username" | "password" | "confirmPassword", value: string) => {
    if (field === "username") setUsername(value);
    if (field === "password") setPassword(value);
    if (field === "confirmPassword") setConfirmPassword(value);
    
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    setFormError("");
  };

  const validate = () => {
    let isValid = true;
    const errors = { username: "", password: "", confirmPassword: "" };

    if (!username.trim()) {
      errors.username = "Name is required.";
      isValid = false;
    } else if (!/^[A-Za-z0-9_.-]{3,64}$/.test(username.trim())) {
      errors.username = "Name must be 3-64 characters (letters, digits, _, ., -).";
      isValid = false;
    }

    if (!password) {
      errors.password = "Password is required.";
      isValid = false;
    } else if (password.length < 12) {
      errors.password = "Password must be at least 12 characters.";
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
      // Registration is not connected to the API yet; simulate a brief submission.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Send users to sign in after the simulated registration succeeds.
      navigate("/Login");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-layout">
      <section className="login-brand">
        <h1>TACTICA</h1>
        
        <div className="brand-features">
          <div className="feature-card">
            <Activity className="feature-icon" />
            <h3>Live Intelligence</h3>
            <p>Real-time momentum tracking and control vs chaos analytics.</p>
          </div>
          
          <div className="feature-card">
            <Radio className="feature-icon" />
            <h3>Broadcast Gallery</h3>
            <p>Dynamic, personalized overlay generation in multiple languages.</p>
          </div>
        </div>
      </section>

      <section className="login-form-container">
        <form className="login-form" onSubmit={submit} noValidate>
          <h2>Create an Account</h2>
          <p className="login-subtitle">Sign up to get started with Tactica.</p>

          <div className="input-group">
            <Label htmlFor="username" className={fieldErrors.username ? "text-destructive" : ""}>
              Name
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => handleInput("username", e.target.value)}
              placeholder="Enter your name"
              autoComplete="username"
              className={fieldErrors.username ? "border-destructive focus-visible:ring-destructive" : ""}
              autoFocus
            />
            {fieldErrors.username && (
              <span className="field-error-text">{fieldErrors.username}</span>
            )}
          </div>

          <div className="input-group">
            <Label htmlFor="password" className={fieldErrors.password ? "text-destructive" : ""}>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => handleInput("password", e.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
              className={fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {fieldErrors.password && (
              <span className="field-error-text">{fieldErrors.password}</span>
            )}
          </div>

          <div className="input-group">
            <Label htmlFor="confirmPassword" className={fieldErrors.confirmPassword ? "text-destructive" : ""}>
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => handleInput("confirmPassword", e.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              className={fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {fieldErrors.confirmPassword && (
              <span className="field-error-text">{fieldErrors.confirmPassword}</span>
            )}
          </div>

          {formError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full mt-4" disabled={busy}>
            {busy ? "Creating account..." : "Sign Up"}
          </Button>

          <div className="form-footer">
            <p>
              Already have an account?{" "}
              <Button 
                variant="link" 
                type="button" 
                className="p-0 h-auto font-semibold"
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
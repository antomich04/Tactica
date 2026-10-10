import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Providers/AuthProvider";
import { Button } from "@/Components/Ui/button";
import { Input } from "@/Components/Ui/input";
import { Label } from "@/Components/Ui/label";
import { Alert, AlertDescription } from "@/Components/Ui/alert";
import { AlertCircle, Activity, Radio } from "lucide-react";
import "../Styles/Auth.css";

export function LoginPage() {
  const { login, notice } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const [fieldErrors, setFieldErrors] = useState({
    username: "",
    password: ""
  });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleInput = (field: "username" | "password", value: string) => {
    if (field === "username") setUsername(value);
    if (field === "password") setPassword(value);
    
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    setFormError("");
  };

  const validate = () => {
    let isValid = true;
    const errors = { username: "", password: "" };

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

    setFieldErrors(errors);
    return isValid;
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setBusy(true);
    setFormError("");

    try {
      await login(username.trim(), password);
    } catch (err: any) {
      // Safely extract the error message from the backend response
      const errorMessage = 
        err?.response?.data?.detail || 
        err?.message || 
        (typeof err === "string" ? err : "Sign in failed");
        
      setFormError(errorMessage);
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
          <h2>Welcome Back</h2>
          <p className="login-subtitle">Sign in to access the broadcast gallery.</p>

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
              placeholder="Enter your password"
              autoComplete="current-password"
              className={fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {fieldErrors.password && (
              <span className="field-error-text">{fieldErrors.password}</span>
            )}
          </div>

          {formError && (
            <div 
              className="mt-4 p-3 rounded-md flex items-center gap-2" 
              style={{ 
                backgroundColor: "rgba(239, 68, 68, 0.1)", 
                color: "#ef4444", 
                border: "1px solid #ef4444" 
              }}
            >
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">{formError}</span>
            </div>
          )}

          {!formError && notice && (
            <Alert className="mt-2 text-blue-500">
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full mt-4" disabled={busy}>
            {busy ? "Signing in..." : "Login"}
          </Button>

          <div className="form-footer">
            <p>
              Don't have an account?{" "}
              <Button 
                variant="link" 
                type="button" 
                className="p-0 h-auto font-semibold"
                onClick={() => navigate("/SignUp")}
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
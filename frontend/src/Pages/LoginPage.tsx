import { FormEvent, useState } from "react";
import { useAuth } from "../Providers/AuthProvider";

export function LoginPage() {
  const { login, notice } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await login(username.trim(), password); // on success this page is replaced by the match page
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <form className="login" onSubmit={submit}>
      <h1>Tactica</h1>
      <p className="notice">Sign in to watch the live match.</p>

      <label>
        Username
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      {error && <p className="error" role="alert">{error}</p>}
      {!error && notice && <p className="notice">{notice}</p>}

      <button className="go" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

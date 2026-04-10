import { useState } from "react";

export function AuthPanel({ auth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    try {
      if (mode === "register") {
        await auth.register(form);
        setMode("login");
        setMessage("Registered. Log in to bind your save slots.");
        return;
      }

      await auth.login(form);
      setMessage("Logged in.");
    } catch {
      setMessage("");
    }
  }

  if (auth.isAuthenticated) {
    return (
      <section className="auth-panel signed-in">
        <div>
          <p className="eyebrow">Player Session</p>
          <h2>{auth.session.user.username}</h2>
          <p className="hero-text">Progress can now be tied to your player session.</p>
        </div>
        <button className="mini-button" onClick={auth.logout} type="button">
          Logout
        </button>
      </section>
    );
  }

  return (
    <section className="auth-panel">
      <div className="auth-art">
        <div className="auth-spark auth-spark-a" />
        <div className="auth-spark auth-spark-b" />
        <div className="auth-spark auth-spark-c" />
      </div>
      <div className="auth-form-wrap">
        <p className="eyebrow">Player Access</p>
        <h2>{mode === "login" ? "Login" : "Register"}</h2>
        <p className="hero-text">
          8-bit occult access layer for player identity and save ownership.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            placeholder="username"
            value={form.username}
          />
          <input
            className="auth-input"
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="password"
            type="password"
            value={form.password}
          />
          <button className="primary-button" type="submit">
            {mode === "login" ? "Login" : "Register"}
          </button>
        </form>
        <button
          className="mini-button"
          onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
          type="button"
        >
          {mode === "login" ? "Need an account?" : "Already registered?"}
        </button>
        {message ? <p className="auth-message">{message}</p> : null}
        {auth.error ? <p className="error-text">{auth.error}</p> : null}
      </div>
    </section>
  );
}

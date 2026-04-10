import { useEffect, useState } from "react";
import { createGuestSession, fetchCurrentUser, loginUser, registerUser } from "../api/authApi";

const storageKey = "apex-clash-auth";

export function useAuthSession() {
  const [session, setSession] = useState(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : { token: "", user: null };
    } catch {
      window.localStorage.removeItem(storageKey);
      return { token: "", user: null };
    }
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session.token) {
      return;
    }

    fetchCurrentUser(session.token)
      .then((data) => {
        setSession((current) => ({ ...current, user: data.user }));
      })
      .catch(() => {
        setSession({ token: "", user: null });
        window.localStorage.removeItem(storageKey);
      });
  }, [session.token]);

  async function register(credentials) {
    setStatus("registering");
    setError("");
    await registerUser(credentials);
    setStatus("registered");
  }

  async function login(credentials) {
    setStatus("logging-in");
    setError("");
    try {
      const data = await loginUser(credentials);
      const nextSession = { token: data.token, user: data.user };
      setSession(nextSession);
      window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
      setStatus("ready");
    } catch (loginError) {
      setError(loginError.message);
      setStatus("error");
      throw loginError;
    }
  }

  async function guestLogin() {
    setStatus("guest-login");
    setError("");
    try {
      const data = await createGuestSession();
      const nextSession = { token: data.token, user: data.user };
      setSession(nextSession);
      window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
      setStatus("ready");
    } catch (guestError) {
      setError(guestError.message);
      setStatus("error");
      throw guestError;
    }
  }

  function logout() {
    setSession({ token: "", user: null });
    window.localStorage.removeItem(storageKey);
    setStatus("idle");
    setError("");
  }

  return {
    session,
    status,
    error,
    isAuthenticated: Boolean(session.token && session.user),
    register,
    login,
    guestLogin,
    logout
  };
}

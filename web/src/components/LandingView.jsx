import { useState, useEffect, useRef } from "react";
import { AuthPanel } from "./AuthPanel";

export function LandingView({ auth, showLanding, onCompleteLogin }) {
  const [titleMovedUp, setTitleMovedUp] = useState(false);
  const [titleArrived, setTitleArrived] = useState(false);
  const containerRef = useRef(null);
  const isLoading = auth.status === "logging-in" || auth.status === "registering" || auth.status === "guest-login";

  useEffect(() => {
    if (!showLanding) {
      setTitleArrived(true);
      setTitleMovedUp(true);
      return;
    }
    // Phase 1: Title fades in at center (after a brief delay)
    const fadeInTimer = window.setTimeout(() => {
      setTitleArrived(true);
    }, 300);
    // Phase 2: After 0.5s hold + fade-in time, title moves up and login appears
    const moveTimer = window.setTimeout(() => {
      setTitleMovedUp(true);
    }, 2500);
    return () => {
      window.clearTimeout(fadeInTimer);
      window.clearTimeout(moveTimer);
    };
  }, [showLanding]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      onCompleteLogin();
    }
  }, [auth.isAuthenticated, onCompleteLogin]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      container.style.setProperty("--mouse-x", `${x}%`);
      container.style.setProperty("--mouse-y", `${y}%`);
    };

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="landing-container" ref={containerRef}>
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner" />
            <p className="loading-text">Entering the realm...</p>
          </div>
        </div>
      )}
      <div className="landing-background" />
      <div className={`landing-content ${titleArrived ? "title-arrived" : ""} ${titleMovedUp ? "title-moved-up" : ""}`}>
        <h1 className="game-title">
          <span className="title-word title-apex">Apex</span>
          <span className="title-word title-clash">Clash</span>
          <svg className="title-slash" viewBox="0 0 400 100" preserveAspectRatio="none">
            <path
              className="slash-path"
              d="M0,50 Q100,45 200,50 T400,50"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />
          </svg>
        </h1>
        <p className="tagline">A JIUJITSU Kaizen-Inspired Action RPG</p>
        {!isLoading && titleMovedUp && (
          <div className="login-fade-in">
            <AuthPanel auth={auth} />
          </div>
        )}
      </div>
      <div className="landing-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${4 + Math.random() * 4}px`,
              height: `${4 + Math.random() * 4}px`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}

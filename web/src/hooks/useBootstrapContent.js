import { useEffect, useState } from "react";
import { apiBaseUrl } from "../config/api";

const fallbackContent = {
  classes: [],
  dungeons: [],
  enemies: [],
  items: [],
  regions: [],
  skills: []
};

export function useBootstrapContent() {
  const [status, setStatus] = useState("loading");
  const [content, setContent] = useState(fallbackContent);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadContent() {
      try {
        const response = await fetch(`${apiBaseUrl}/content/bootstrap`);
        if (!response.ok) {
          throw new Error(`Bootstrap failed with status ${response.status}`);
        }

        const payload = await response.json();
        if (!active) {
          return;
        }

        setContent(payload.data);
        setStatus("ready");
      } catch {
        if (!active) {
          return;
        }

        setStatus("degraded");
        setError("API unavailable. Start the server to load shared content.");
      }
    }

    loadContent();

    return () => {
      active = false;
    };
  }, []);

  return { content, status, error };
}

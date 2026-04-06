import { useEffect, useState } from "react";
import {
  equipPlayerItem,
  equipPlayerSkills,
  fetchPlayerProfile,
  updatePlayerClassType
} from "../api/playerApi";

export function usePlayerProfile(authToken, selectedArchetype) {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authToken) {
      setProfile(null);
      return;
    }

    setStatus("loading");
    fetchPlayerProfile(authToken)
      .then((data) => {
        setProfile(data);
        setStatus("ready");
      })
      .catch((loadError) => {
        setError(loadError.message);
        setStatus("error");
      });
  }, [authToken]);

  useEffect(() => {
    if (!authToken || !profile || profile.classType === selectedArchetype) {
      return;
    }

    updatePlayerClassType(authToken, selectedArchetype)
      .then(setProfile)
      .catch((updateError) => setError(updateError.message));
  }, [authToken, profile, selectedArchetype]);

  async function equipItem(itemId) {
    const data = await equipPlayerItem(authToken, itemId);
    setProfile(data);
  }

  async function equipSkills(skillIds) {
    const data = await equipPlayerSkills(authToken, skillIds);
    setProfile(data);
  }

  return {
    profile,
    status,
    error,
    equipItem,
    equipSkills
  };
}

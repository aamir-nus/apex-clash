import { useEffect, useState } from "react";
import {
  applyPlayerCombatReward,
  applyPlayerLevelChoice,
  claimPlayerReward,
  equipPlayerItem,
  equipPlayerSkills,
  fetchPlayerProfile,
  updatePlayerSessionState,
  updatePlayerClassType
} from "../api/playerApi";
import { subscribeToInventoryRewards, subscribeToProgressionRewards } from "../game/runtime/runtimeBridge";

export function usePlayerProfile(authToken, selectedArchetype) {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [latestReward, setLatestReward] = useState(null);

  useEffect(() => {
    if (!authToken) {
      setProfile(null);
      setLatestReward(null);
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

  useEffect(() => {
    if (!authToken) {
      return undefined;
    }

    return subscribeToProgressionRewards(async (rewardState) => {
      try {
        const data = await applyPlayerCombatReward(authToken, rewardState);
        setProfile(data);
      } catch (rewardError) {
        setError(rewardError.message);
      }
    });
  }, [authToken]);

  useEffect(() => {
    if (!authToken) {
      return undefined;
    }

    return subscribeToInventoryRewards(async (rewardEvent) => {
      try {
        const data = await claimPlayerReward(authToken, rewardEvent.rewardSource);
        setProfile(data.profile);
        setLatestReward(data.reward ?? null);
      } catch (rewardError) {
        setError(rewardError.message);
      }
    });
  }, [authToken]);

  async function equipItem(itemId) {
    const data = await equipPlayerItem(authToken, itemId);
    setProfile(data);
    if (latestReward?.id === itemId) {
      setLatestReward(null);
    }
  }

  async function equipSkills(skillIds) {
    const data = await equipPlayerSkills(authToken, skillIds);
    setProfile(data);
  }

  async function applyLevelChoiceChoice(optionId, runtimePlayer) {
    const data = await applyPlayerLevelChoice(authToken, optionId, {
      level: runtimePlayer.level,
      xp: runtimePlayer.xp,
      xpToNextLevel: runtimePlayer.xpToNextLevel,
      pendingStatPoints: runtimePlayer.pendingStatPoints
    });
    setProfile(data);
    return data;
  }

  async function syncSessionState(sessionUpdate) {
    const data = await updatePlayerSessionState(authToken, sessionUpdate);
    setProfile(data);
    return data;
  }

  return {
    profile,
    status,
    error,
    latestReward,
    equipItem,
    equipSkills,
    applyLevelChoice: applyLevelChoiceChoice,
    syncSessionState
  };
}

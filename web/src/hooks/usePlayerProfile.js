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
import {
  emitCombatFeedEvent,
  subscribeToInventoryRewards,
  subscribeToProgressionRewards
} from "../game/runtime/runtimeBridge";
import { BINDABLE_SKILL_KEYS } from "../utils/skillBindings";

function buildStatDelta(previousStats = {}, nextStats = {}) {
  return ["attack", "defense", "speed", "hp", "ce"]
    .map((key) => {
      const before = previousStats[key] ?? 0;
      const after = nextStats[key] ?? 0;
      const delta = after - before;
      return delta === 0 ? null : { key, delta };
    })
    .filter(Boolean);
}

function buildSkillBindingSummary(equippedSkills = []) {
  return equippedSkills.map((skill, index) => ({
    key: BINDABLE_SKILL_KEYS[index] ?? `S${index + 1}`,
    id: skill.id,
    name: skill.name
  }));
}

export function usePlayerProfile(authToken, selectedArchetype) {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [latestReward, setLatestReward] = useState(null);
  const [loadoutFeedback, setLoadoutFeedback] = useState(null);

  useEffect(() => {
    if (!authToken) {
      setProfile(null);
      setLatestReward(null);
      setLoadoutFeedback(null);
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
        const data = await claimPlayerReward(authToken, rewardEvent.rewardSource, {
          regionId: rewardEvent.regionId,
          sessionState: rewardEvent.sessionState
        });
        setProfile(data.profile);
        const hasPrimaryReward = Boolean(data.reward);
        const hasBonusRewards = (data.bonusRewards?.length ?? 0) > 0;
        setLatestReward(
          hasPrimaryReward || hasBonusRewards
            ? {
                ...(data.reward ?? {
                  id: `bundle-${rewardEvent.rewardSource}`,
                  name: "Supply cache",
                  type: "bundle",
                  rarity: "mixed"
                }),
                bonusRewards: data.bonusRewards ?? []
              }
            : null
        );
      } catch (rewardError) {
        setError(rewardError.message);
      }
    });
  }, [authToken]);

  async function equipItem(itemId) {
    const previousStats = profile?.computedStats ?? {};
    const previousEquippedItems = profile?.equippedItems ?? [];
    const data = await equipPlayerItem(authToken, itemId);
    setProfile(data);
    const equippedItem = data.equippedItems?.find((item) => item.id === itemId);
    setLoadoutFeedback({
      type: "gear",
      createdAt: Date.now(),
      title: equippedItem ? `Equipped ${equippedItem.name}` : "Loadout updated",
      detail: equippedItem
        ? `${equippedItem.equipSlot} synced into live combat state`
        : "Item sync applied to runtime",
      equippedSummary: data.equippedItems ?? previousEquippedItems,
      statDelta: buildStatDelta(previousStats, data.computedStats ?? {})
    });
    emitCombatFeedEvent({
      id: `loadout-gear-${Date.now()}`,
      message: equippedItem
        ? `${equippedItem.name} equipped to ${equippedItem.equipSlot}.`
        : "Gear sync applied to live combat state."
    });
    if (latestReward?.id === itemId) {
      setLatestReward(null);
    }
  }

  async function equipSkills(skillIds) {
    const previousStats = profile?.computedStats ?? {};
    const data = await equipPlayerSkills(authToken, skillIds);
    setProfile(data);
    const bindingSummary = buildSkillBindingSummary(data.equippedSkills ?? []);
    setLoadoutFeedback({
      type: "skills",
      createdAt: Date.now(),
      title: "Moveset rebound",
      detail: bindingSummary.length
        ? bindingSummary.map((entry) => `${entry.name} -> ${entry.key}`).join(" | ")
        : "Bound skills synced into live runtime cooldowns",
      equippedSummary: data.equippedItems ?? profile?.equippedItems ?? [],
      skillBindings: bindingSummary,
      statDelta: buildStatDelta(previousStats, data.computedStats ?? previousStats)
    });
    if (bindingSummary.length) {
      bindingSummary.forEach((entry, index) => {
        emitCombatFeedEvent({
          id: `loadout-skill-${entry.id}-${Date.now()}-${index}`,
          message: `${entry.name} bound to ${entry.key}.`
        });
      });
    } else {
      emitCombatFeedEvent({
        id: `loadout-skill-${Date.now()}`,
        message: "Moveset sync applied to live runtime."
      });
    }
    if (latestReward?.type === "scroll" && skillIds.includes(latestReward.id)) {
      setLatestReward(null);
    }
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

  function applyProfileUpdate(nextProfile) {
    setProfile(nextProfile);
  }

  function clearLatestReward() {
    setLatestReward(null);
  }

  return {
    profile,
    status,
    error,
    latestReward,
    loadoutFeedback,
    equipItem,
    equipSkills,
    applyLevelChoice: applyLevelChoiceChoice,
    syncSessionState,
    applyProfileUpdate,
    clearLatestReward
  };
}

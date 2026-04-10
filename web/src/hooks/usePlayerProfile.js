import { useEffect, useState } from "react";
import {
  applyPlayerCombatReward,
  applyPlayerLevelChoice,
  claimPlayerReward,
  consumePlayerItem,
  craftPlayerItem,
  equipPlayerItem,
  equipPlayerSkills,
  fetchPlayerEndgameStatus,
  fetchPlayerGradeStatus,
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

function mergeById(currentEntries = [], nextEntries = []) {
  const merged = new Map();
  currentEntries.forEach((entry) => {
    if (entry?.id) {
      merged.set(entry.id, entry);
    }
  });
  nextEntries.forEach((entry) => {
    if (entry?.id) {
      merged.set(entry.id, entry);
    }
  });
  return [...merged.values()];
}

function mergeProfileState(currentProfile, nextProfile) {
  if (!currentProfile) {
    return nextProfile;
  }

  if (!nextProfile) {
    return currentProfile;
  }

  return {
    ...currentProfile,
    ...nextProfile,
    unlockedRegionIds: [
      ...new Set([...(currentProfile.unlockedRegionIds ?? []), ...(nextProfile.unlockedRegionIds ?? [])])
    ],
    clearedRegionIds: [
      ...new Set([...(currentProfile.clearedRegionIds ?? []), ...(nextProfile.clearedRegionIds ?? [])])
    ],
    inventoryItems: mergeById(currentProfile.inventoryItems, nextProfile.inventoryItems),
    equippedItems: mergeById(currentProfile.equippedItems, nextProfile.equippedItems),
    availableSkills: mergeById(currentProfile.availableSkills, nextProfile.availableSkills),
    equippedSkills:
      nextProfile.equippedSkills?.length || currentProfile.equippedSkills?.length
        ? mergeById(currentProfile.equippedSkills, nextProfile.equippedSkills)
        : [],
    sessionState: {
      ...(currentProfile.sessionState ?? {}),
      ...(nextProfile.sessionState ?? {})
    }
  };
}

export function usePlayerProfile(authToken, selectedArchetype) {
  const [profile, setProfile] = useState(null);
  const [gradeStatus, setGradeStatus] = useState(null);
  const [endgameStatus, setEndgameStatus] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [latestReward, setLatestReward] = useState(null);
  const [loadoutFeedback, setLoadoutFeedback] = useState(null);

  async function refreshProgressionStatus(token) {
    if (!token) {
      setGradeStatus(null);
      setEndgameStatus(null);
      return;
    }

    try {
      const [nextGradeStatus, nextEndgameStatus] = await Promise.all([
        fetchPlayerGradeStatus(token),
        fetchPlayerEndgameStatus(token)
      ]);
      setGradeStatus(nextGradeStatus);
      setEndgameStatus(nextEndgameStatus);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    if (!authToken) {
      setProfile(null);
      setGradeStatus(null);
      setEndgameStatus(null);
      setLatestReward(null);
      setLoadoutFeedback(null);
      return;
    }

    setStatus("loading");
    Promise.all([fetchPlayerProfile(authToken), fetchPlayerGradeStatus(authToken), fetchPlayerEndgameStatus(authToken)])
      .then(([data, nextGradeStatus, nextEndgameStatus]) => {
        setProfile(data);
        setGradeStatus(nextGradeStatus);
        setEndgameStatus(nextEndgameStatus);
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
      .then(async (data) => {
        setProfile(data);
        await refreshProgressionStatus(authToken);
      })
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
        await refreshProgressionStatus(authToken);
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
        await refreshProgressionStatus(authToken);
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
    await refreshProgressionStatus(authToken);
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
    await refreshProgressionStatus(authToken);
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

  async function consumeItem(itemId) {
    const previousStats = profile?.computedStats ?? {};
    const data = await consumePlayerItem(authToken, itemId);
    setProfile(data.profile);
    await refreshProgressionStatus(authToken);
    setLoadoutFeedback({
      type: "consumable",
      createdAt: Date.now(),
      title: `Used ${data.effect.name}`,
      detail: "Consumable effect synced into the active route state.",
      equippedSummary: data.profile?.equippedItems ?? profile?.equippedItems ?? [],
      statDelta: buildStatDelta(previousStats, data.profile?.computedStats ?? previousStats)
    });
    emitCombatFeedEvent({
      id: `use-consumable-${itemId}-${Date.now()}`,
      message: `${data.effect.name} applied to the current route state.`
    });
  }

  async function craftItem(recipeId) {
    const previousStats = profile?.computedStats ?? {};
    const data = await craftPlayerItem(authToken, recipeId);
    setProfile(data.profile);
    await refreshProgressionStatus(authToken);
    setLatestReward(
      data.craftedItem
        ? {
            ...data.craftedItem,
            bonusRewards: []
          }
        : null
    );
    setLoadoutFeedback({
      type: "craft",
      createdAt: Date.now(),
      title: `Crafted ${data.craftedItem?.name ?? "new item"}`,
      detail: "Materials were consumed and the crafted item was added to inventory.",
      equippedSummary: data.profile?.equippedItems ?? profile?.equippedItems ?? [],
      statDelta: buildStatDelta(previousStats, data.profile?.computedStats ?? previousStats)
    });
    emitCombatFeedEvent({
      id: `craft-item-${recipeId}-${Date.now()}`,
      message: `${data.craftedItem?.name ?? "Crafted item"} added to inventory.`
    });
  }

  async function applyLevelChoiceChoice(optionId, runtimePlayer) {
    const data = await applyPlayerLevelChoice(authToken, optionId, {
      level: runtimePlayer.level,
      xp: runtimePlayer.xp,
      xpToNextLevel: runtimePlayer.xpToNextLevel,
      pendingStatPoints: runtimePlayer.pendingStatPoints
    });
    setProfile(data);
    await refreshProgressionStatus(authToken);
    return data;
  }

  async function syncSessionState(sessionUpdate) {
    const data = await updatePlayerSessionState(authToken, sessionUpdate);
    setProfile(data);
    await refreshProgressionStatus(authToken);
    return data;
  }

  function applyProfileUpdate(nextProfile) {
    setProfile((currentProfile) => mergeProfileState(currentProfile, nextProfile));
  }

  function clearLatestReward() {
    setLatestReward(null);
  }

  return {
    profile,
    gradeStatus,
    endgameStatus,
    status,
    error,
    latestReward,
    loadoutFeedback,
    equipItem,
    equipSkills,
    consumeItem,
    craftItem,
    applyLevelChoice: applyLevelChoiceChoice,
    syncSessionState,
    applyProfileUpdate,
    clearLatestReward
  };
}

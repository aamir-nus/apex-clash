import Phaser from "phaser";

function getSceneFromRegionId(regionId) {
  return regionId === "boss_vault"
    ? "BossScene"
    : regionId === "shatter_dungeon"
      ? "DungeonScene"
      : regionId === "shatter_block"
        ? "RegionScene"
        : "HubScene";
}

function buildLoadedPlayerState(profile, fallbackArchetype) {
  if (!profile) {
    return null;
  }

  const stats = profile.computedStats ?? {};
  return {
    hp: stats.hp ?? 100,
    maxHp: stats.hp ?? 100,
    ce: stats.ce ?? 60,
    maxCe: stats.ce ?? 60,
    level: profile.level ?? 1,
    xp: profile.xp ?? 0,
    xpToNextLevel: profile.xpToNextLevel ?? 30,
    attack: stats.attack ?? 10,
    defense: stats.defense ?? 8,
    speed: stats.speed ?? 10,
    pendingStatPoints: profile.pendingStatPoints ?? 0,
    archetype: profile.classType ?? fallbackArchetype ?? "close_combat"
  };
}

export class BootScene extends Phaser.Scene {
  constructor(runtimeConfig) {
    super("BootScene");
    this.runtimeConfig = runtimeConfig;
  }

  create() {
    this.registry.set("content", this.runtimeConfig.content);
    this.registry.set("selectedArchetype", this.runtimeConfig.selectedArchetype);
    this.registry.set("playerProfile", this.runtimeConfig.playerProfile ?? null);
    this.registry.set("activeSave", this.runtimeConfig.activeSave ?? null);
    this.registry.set("resumeSource", "fresh-start");

    const activeSave = this.runtimeConfig.activeSave ?? null;
    if (activeSave) {
      this.registry.set("resumeSource", "save-snapshot");
      this.registry.set("selectedArchetype", activeSave.archetypeId ?? this.runtimeConfig.selectedArchetype);
      this.registry.set("loadedPlayerState", activeSave.playerState ?? null);
      this.registry.set("loadedSessionSummary", activeSave.sessionSummary ?? null);
      this.scene.start(getSceneFromRegionId(activeSave.regionId));
      return;
    }

    const profile = this.runtimeConfig.playerProfile ?? null;
    const sessionState = profile?.sessionState ?? {};
    const currentRegionId = profile?.currentRegionId ?? "hub_blacksite";
    const hasSessionState = Object.keys(sessionState).length > 0;
    const shouldResumeFromProfile = profile && (currentRegionId !== "hub_blacksite" || hasSessionState);

    if (shouldResumeFromProfile) {
      this.registry.set("resumeSource", "profile-session");
      this.registry.set("selectedArchetype", profile.classType ?? this.runtimeConfig.selectedArchetype);
      this.registry.set(
        "loadedPlayerState",
        buildLoadedPlayerState(profile, this.runtimeConfig.selectedArchetype)
      );
      this.registry.set("loadedSessionSummary", {
        enemiesRemaining: 0,
        combatFeed: [],
        sessionState
      });
      this.scene.start(getSceneFromRegionId(currentRegionId));
      return;
    }

    this.scene.start("HubScene");
  }
}

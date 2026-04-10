import Phaser from "phaser";

function getSceneFromRegionId(regionId) {
  return regionId === "shatter_boss_vault" || regionId === "veil_boss_vault" || regionId === "cinder_boss_vault" || regionId === "night_boss_vault"
    ? "BossScene"
    : regionId === "shatter_dungeon" || regionId === "veil_dungeon" || regionId === "cinder_dungeon" || regionId === "night_dungeon"
      ? "DungeonScene"
      : regionId === "shatter_block" || regionId === "veil_shrine" || regionId === "cinder_ward" || regionId === "night_cathedral"
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
    const content = this.registry.get("content") ?? this.runtimeConfig.content;
    const selectedArchetype =
      this.registry.get("selectedArchetype") ?? this.runtimeConfig.selectedArchetype;
    const playerProfile =
      this.registry.get("playerProfile") ?? this.runtimeConfig.playerProfile ?? null;
    const activeSave = this.registry.get("activeSave") ?? this.runtimeConfig.activeSave ?? null;
    const firstRunTutorial =
      this.registry.get("firstRunTutorial") ?? this.runtimeConfig.firstRunTutorial ?? false;

    this.registry.set("content", content);
    this.registry.set("selectedArchetype", selectedArchetype);
    this.registry.set("playerProfile", playerProfile);
    this.registry.set("activeSave", activeSave);
    this.registry.set("firstRunTutorial", firstRunTutorial);
    this.registry.set("currentRegionId", "hub_blacksite");
    this.registry.set("resumeSource", "fresh-start");

    if (activeSave) {
      this.registry.set("resumeSource", "save-snapshot");
      this.registry.set("selectedArchetype", activeSave.archetypeId ?? selectedArchetype);
      this.registry.set("loadedPlayerState", activeSave.playerState ?? null);
      this.registry.set("loadedSessionSummary", activeSave.sessionSummary ?? null);
      this.registry.set("currentRegionId", activeSave.regionId ?? "hub_blacksite");
      this.scene.start(getSceneFromRegionId(activeSave.regionId));
      return;
    }

    const profile = playerProfile ?? null;
    const sessionState = profile?.sessionState ?? {};
    const currentRegionId = profile?.currentRegionId ?? "hub_blacksite";
    const hasSessionState = Object.keys(sessionState).length > 0;
    const shouldResumeFromProfile = profile && (currentRegionId !== "hub_blacksite" || hasSessionState);

    if (shouldResumeFromProfile) {
      this.registry.set("resumeSource", "profile-session");
      this.registry.set("selectedArchetype", profile.classType ?? selectedArchetype);
      this.registry.set(
        "loadedPlayerState",
        buildLoadedPlayerState(profile, selectedArchetype)
      );
      this.registry.set("currentRegionId", currentRegionId);
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

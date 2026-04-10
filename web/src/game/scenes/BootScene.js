import Phaser from "phaser";

function getSceneFromRegionId(regionId) {
  return regionId === "detention_center_boss_vault" || regionId === "barrier_shrine_boss_vault" || regionId === "shibuya_burn_sector_boss_vault" || regionId === "collapsed_cathedral_barrier_boss_vault" || regionId === "merger_ossuary_boss_vault"
    ? "BossScene"
    : regionId === "detention_center_dungeon" || regionId === "barrier_shrine_dungeon" || regionId === "shibuya_burn_sector_dungeon" || regionId === "collapsed_cathedral_barrier_dungeon" || regionId === "merger_ossuary_dungeon"
      ? "DungeonScene"
      : regionId === "detention_center" || regionId === "barrier_shrine" || regionId === "shibuya_burn_sector" || regionId === "collapsed_cathedral_barrier" || regionId === "merger_ossuary"
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
    archetype: profile.classType ?? fallbackArchetype ?? "striker"
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
    this.registry.set("currentRegionId", "hub_jujutsu_high");
    this.registry.set("resumeSource", "fresh-start");

    if (activeSave) {
      this.registry.set("resumeSource", "save-snapshot");
      this.registry.set("selectedArchetype", activeSave.archetypeId ?? selectedArchetype);
      this.registry.set("loadedPlayerState", activeSave.playerState ?? null);
      this.registry.set("loadedSessionSummary", activeSave.sessionSummary ?? null);
      this.registry.set("currentRegionId", activeSave.regionId ?? "hub_jujutsu_high");
      this.scene.start(getSceneFromRegionId(activeSave.regionId));
      return;
    }

    const profile = playerProfile ?? null;
    const sessionState = profile?.sessionState ?? {};
    const currentRegionId = profile?.currentRegionId ?? "hub_jujutsu_high";
    const hasSessionState = Object.keys(sessionState).length > 0;
    const shouldResumeFromProfile = profile && (currentRegionId !== "hub_jujutsu_high" || hasSessionState);

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

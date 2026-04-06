import Phaser from "phaser";

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

    const activeSave = this.runtimeConfig.activeSave ?? null;
    if (activeSave) {
      this.registry.set("selectedArchetype", activeSave.archetypeId ?? this.runtimeConfig.selectedArchetype);
      this.registry.set("loadedPlayerState", activeSave.playerState ?? null);
      this.registry.set("loadedSessionSummary", activeSave.sessionSummary ?? null);
      this.scene.start(
        activeSave.regionId === "boss_vault"
          ? "BossScene"
          : activeSave.regionId === "shatter_dungeon"
            ? "DungeonScene"
            : activeSave.regionId === "shatter_block"
              ? "RegionScene"
              : "HubScene"
      );
      return;
    }

    this.scene.start("HubScene");
  }
}

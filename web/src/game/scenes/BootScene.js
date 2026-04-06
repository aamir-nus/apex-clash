import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor(runtimeConfig) {
    super("BootScene");
    this.runtimeConfig = runtimeConfig;
  }

  create() {
    this.registry.set("content", this.runtimeConfig.content);
    this.registry.set("selectedArchetype", this.runtimeConfig.selectedArchetype);
    this.scene.start("CombatSandboxScene");
  }
}

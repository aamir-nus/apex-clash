import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { BossScene } from "../scenes/BossScene";
import { CombatSandboxScene } from "../scenes/CombatSandboxScene";
import { DungeonScene } from "../scenes/DungeonScene";
import { HubScene } from "../scenes/HubScene";
import { RegionScene } from "../scenes/RegionScene";

export function createGame({ parent, content, selectedArchetype, playerProfile, activeSave }) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 960,
      height: 540
    },
    pixelArt: true,
    backgroundColor: "#06141f",
    physics: {
      default: "arcade",
      arcade: {
        debug: false
      }
    },
    scene: [
      new BootScene({ content, selectedArchetype, playerProfile, activeSave }),
      HubScene,
      RegionScene,
      DungeonScene,
      BossScene,
      CombatSandboxScene
    ]
  });
}

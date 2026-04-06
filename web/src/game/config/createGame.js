import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { CombatSandboxScene } from "../scenes/CombatSandboxScene";

export function createGame({ parent, content, selectedArchetype }) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    pixelArt: true,
    backgroundColor: "#06141f",
    physics: {
      default: "arcade",
      arcade: {
        debug: false
      }
    },
    scene: [new BootScene({ content, selectedArchetype }), CombatSandboxScene]
  });
}

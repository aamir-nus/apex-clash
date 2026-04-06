import Phaser from "phaser";
import {
  emitRuntimeUpdate,
  emitSceneUpdate,
  emitSoundEvent,
  emitTransitionUpdate
} from "../runtime/runtimeBridge";

const arena = {
  width: 960,
  height: 540
};

export class HubScene extends Phaser.Scene {
  constructor() {
    super("HubScene");
    this.enterKey = null;
    this.selectedArchetype = "close_combat";
    this.content = {};
    this.summaryText = null;
  }

  create() {
    this.content = this.registry.get("content") ?? {};
    this.selectedArchetype = this.registry.get("selectedArchetype") ?? "close_combat";
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.add.rectangle(arena.width / 2, arena.height / 2, arena.width, arena.height, 0x0c1722);
    this.add.rectangle(arena.width / 2, arena.height / 2, 760, 360, 0x13283a, 1).setStrokeStyle(2, 0xf4b942);

    this.add.text(100, 100, "Blacksite Hub", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "28px"
    });

    this.add.text(
      100,
      150,
      "Safe zone prototype.\n\nPress ENTER to enter the first region shell.\nSwitch archetypes from the browser shell before entering.\nLater v2 target: vendors, saves, progression, region gate, dungeon board.",
      {
        color: "#c6d2dc",
        fontFamily: "monospace",
        fontSize: "16px",
        lineSpacing: 8
      }
    );

    this.summaryText = this.add.text(100, 300, "", {
      color: "#ffd98b",
      fontFamily: "monospace",
      fontSize: "16px"
    });

    this.refreshSummary();
    this.emitHubRuntime();
    emitSceneUpdate({
      scene: "hub",
      label: "Hub"
    });
  }

  refreshSummary() {
    const definition = (this.content.classes ?? []).find((entry) => entry.id === this.selectedArchetype);
    this.summaryText?.setText(
      `Current build: ${definition?.name ?? "Unknown"}\nCombat style: ${definition?.combatStyle ?? "Unavailable"}`
    );
  }

  emitHubRuntime() {
    const definition = (this.content.classes ?? []).find((entry) => entry.id === this.selectedArchetype);
    const resumeSource = this.registry.get("resumeSource") ?? "fresh-start";
    emitRuntimeUpdate({
      player: {
        hp: 0,
        maxHp: 0,
        ce: 0,
        maxCe: 0,
        level: 1,
        xp: 0,
        xpToNextLevel: 0,
        attack: definition?.baseStats?.attack ?? 0,
        defense: definition?.baseStats?.defense ?? 0,
        speed: definition?.baseStats?.speed ?? 0,
        pendingStatPoints: 0,
        archetype: definition?.name ?? "Unknown Build"
      },
      controls: [
        { key: "ENTER", label: "Enter region" },
        { key: "Shell", label: "Switch build from browser UI" }
      ],
      cooldowns: [],
      resumeSource,
      combatFeed: [
        { id: 1, message: "Hub ready. Press ENTER in the game window to enter the region." },
        { id: 2, message: "This is the first v2 shell replacing direct sandbox boot." }
      ],
      encounter: {
        enemiesRemaining: 0,
        status: "Safe zone"
      }
    });
  }

  update() {
    const nextArchetype = this.registry.get("selectedArchetype") ?? this.selectedArchetype;
    if (nextArchetype !== this.selectedArchetype) {
      this.selectedArchetype = nextArchetype;
      this.refreshSummary();
      this.emitHubRuntime();
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      emitSoundEvent({ type: "skill_cast" });
      emitTransitionUpdate({
        active: true,
        label: "Entering region",
        detail: "Scanning cursed density in Shatter Block..."
      });
      this.time.delayedCall(220, () => {
        emitSceneUpdate({
          scene: "region",
          label: "Region"
        });
        emitTransitionUpdate({
          active: false,
          label: "",
          detail: ""
        });
        this.scene.start("RegionScene");
      });
    }
  }
}

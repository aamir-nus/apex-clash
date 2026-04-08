import Phaser from "phaser";
import {
  emitRuntimeUpdate,
  emitSceneUpdate,
  emitSoundEvent,
  emitTransitionUpdate,
  subscribeToControlCommands
} from "../runtime/runtimeBridge";

const arena = {
  width: 960,
  height: 540
};

const routeDisplay = {
  shatter_block: {
    name: "Shatter Block",
    x: 268,
    y: 252,
    fill: 0x244b33,
    stroke: 0xb8f29b,
    accent: 0x8ec07c
  },
  veil_shrine: {
    name: "Veil Shrine",
    x: 488,
    y: 252,
    fill: 0x322146,
    stroke: 0xf0d2ff,
    accent: 0xc77dff
  },
  cinder_ward: {
    name: "Cinder Ward",
    x: 708,
    y: 252,
    fill: 0x472016,
    stroke: 0xffd4a3,
    accent: 0xff8a5b
  }
};

function resetRouteRuntimeState(registry) {
  registry.set("loadedPlayerState", null);
  registry.set("loadedSessionSummary", null);
  registry.set("explorationBonus", null);
  registry.set("combatSnapshot", null);
}

function mapBossVaultToClearedRegion(regionId) {
  return regionId === "shatter_boss_vault"
    ? "shatter_block"
    : regionId === "veil_boss_vault"
      ? "veil_shrine"
      : regionId === "cinder_boss_vault"
        ? "cinder_ward"
        : null;
}

export class HubScene extends Phaser.Scene {
  constructor() {
    super("HubScene");
    this.enterKey = null;
    this.regionKeys = null;
    this.selectedArchetype = "close_combat";
    this.content = {};
    this.summaryText = null;
    this.tutorialText = null;
    this.selectedRegionId = "shatter_block";
    this.unlockedRegionIds = ["shatter_block"];
    this.clearedRegionIds = [];
    this.routeLadderDecor = [];
    this.isTransitioning = false;
    this.firstRunTutorial = false;
    this.unsubscribeControlCommands = null;
  }

  create() {
    this.content = this.registry.get("content") ?? {};
    this.selectedArchetype = this.registry.get("selectedArchetype") ?? "close_combat";
    this.firstRunTutorial = this.registry.get("firstRunTutorial") ?? false;
    this.isTransitioning = false;
    this.input.keyboard.resetKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.regionKeys = this.input.keyboard.addKeys("ONE,TWO,THREE");
    const profile = this.registry.get("playerProfile") ?? null;
    const loadedSessionSummary = this.registry.get("loadedSessionSummary") ?? null;
    const derivedClearedRegionId = mapBossVaultToClearedRegion(
      loadedSessionSummary?.sessionState?.clearedBossRegionId ?? null
    );
    this.unlockedRegionIds = [
      ...new Set([
        ...(profile?.unlockedRegionIds ?? ["shatter_block"]),
        ...(loadedSessionSummary?.sessionState?.unlockedRegionIds ?? [])
      ])
    ];
    this.clearedRegionIds = [
      ...new Set([
        ...(profile?.clearedRegionIds ?? []),
        ...(loadedSessionSummary?.sessionState?.clearedRegionIds ?? []),
        ...(derivedClearedRegionId ? [derivedClearedRegionId] : [])
      ])
    ];
    this.registry.set("loadedSessionSummary", null);
    this.selectedRegionId = this.unlockedRegionIds.includes("cinder_ward")
      ? "cinder_ward"
      : this.unlockedRegionIds.includes("veil_shrine")
        ? "veil_shrine"
        : "shatter_block";

    this.add.rectangle(arena.width / 2, arena.height / 2, arena.width, arena.height, 0x0c1722);
    this.add.circle(168, 110, 34, 0xf4b942, 0.08).setStrokeStyle(2, 0xf4b942, 0.22);
    this.add.circle(792, 428, 42, 0x4cc9f0, 0.08).setStrokeStyle(2, 0x4cc9f0, 0.24);
    this.add.rectangle(arena.width / 2, arena.height / 2, 760, 360, 0x13283a, 1).setStrokeStyle(2, 0xf4b942);
    const commandStrip = this.add.rectangle(480, 424, 688, 54, 0x0f1d2b, 0.85).setStrokeStyle(1, 0x30526a, 0.8);
    this.tweens.add({
      targets: commandStrip,
      alpha: 0.68,
      duration: 980,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.add.rectangle(708, 210, 92, 124, 0x1b3044, 0.55).setStrokeStyle(2, 0x4cc9f0, 0.45);
    this.add.text(674, 186, "Gate", {
      color: "#9adbf2",
      fontFamily: "monospace",
      fontSize: "16px"
    });
    this.add.rectangle(250, 214, 118, 90, 0x201912, 0.45).setStrokeStyle(2, 0xffb36b, 0.35);
    this.add.text(198, 188, "Archive", {
      color: "#ffd4a3",
      fontFamily: "monospace",
      fontSize: "16px"
    });

    this.add.text(100, 100, "Blacksite Hub", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "28px"
    });

    this.add.text(
      100,
      150,
      this.firstRunTutorial
        ? "First deployment briefing.\n\nPress 1 to target Shatter Block.\nPress ENTER to deploy.\nUse the browser shell to swap archetypes before stepping out."
        : "Safe zone prototype.\n\nPress 1, 2, or 3 to target an unlocked region.\nPress ENTER to deploy.\nSwitch archetypes from the browser shell before entering.",
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
    this.tutorialText = this.add.text(100, 378, "", {
      color: "#9adbf2",
      fontFamily: "monospace",
      fontSize: "14px",
      lineSpacing: 6
    });

    this.refreshSummary();
    this.emitHubRuntime();
    this.unsubscribeControlCommands = subscribeToControlCommands((command) => {
      if (command?.scene !== "hub" || this.isTransitioning) {
        return;
      }

      if (command.type === "select-region" && command.regionId) {
        this.handleRegionSelection(command.regionId);
      }

      if (command.type === "deploy") {
        this.deployToRegion();
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeControlCommands?.();
      this.unsubscribeControlCommands = null;
    });
    emitSceneUpdate({
      scene: "hub",
      label: "Hub"
    });
  }

  refreshSummary() {
    const definition = (this.content.classes ?? []).find((entry) => entry.id === this.selectedArchetype);
    const selectedRegion = (this.content.regions ?? []).find((entry) => entry.id === this.selectedRegionId);
    const veilUnlocked = this.unlockedRegionIds.includes("veil_shrine");
    const cinderUnlocked = this.unlockedRegionIds.includes("cinder_ward");
    this.summaryText?.setText(
      `Current build: ${definition?.name ?? "Unknown"}\nCombat style: ${definition?.combatStyle ?? "Unavailable"}\nSelected region: ${selectedRegion?.name ?? "Unknown"}\nUnlocked routes: Shatter Block${veilUnlocked ? ", Veil Shrine" : ""}${cinderUnlocked ? ", Cinder Ward" : ""}`
    );
    this.tutorialText?.setText(
      this.firstRunTutorial
        ? "Deploy path: Hub -> Region -> Secure a boon -> Enter dungeon -> Break the boss pattern."
        : "Hot path: choose route, deploy, clear the route, return stronger."
    );
    this.drawRouteLadder();
  }

  drawRouteLadder() {
    this.routeLadderDecor.forEach((entry) => entry.destroy());
    this.routeLadderDecor = [];
    Object.entries(routeDisplay).forEach(([regionId, route]) => {
      const unlocked = this.unlockedRegionIds.includes(regionId);
      const cleared = this.clearedRegionIds.includes(regionId);
      const selected = this.selectedRegionId === regionId;

      this.routeLadderDecor.push(
        this.add
        .rectangle(route.x, route.y, 146, 118, route.fill, unlocked ? 0.68 : 0.22)
        .setStrokeStyle(selected ? 3 : 2, route.stroke, cleared ? 1 : unlocked ? 0.7 : 0.28)
      );
      this.routeLadderDecor.push(
        this.add
        .rectangle(route.x, route.y + 56, 102, 10, route.accent, cleared ? 0.82 : unlocked ? 0.46 : 0.18)
        .setStrokeStyle(1, 0xf6f1df, 0.15)
      );
      this.routeLadderDecor.push(this.add.text(route.x - 52, route.y - 36, route.name, {
        color: "#f6f1df",
        fontFamily: "monospace",
        fontSize: "14px"
      }));
      this.routeLadderDecor.push(this.add.text(route.x - 52, route.y - 8, cleared ? "Cleared" : unlocked ? "Unlocked" : "Sealed", {
        color: cleared ? "#b8f29b" : unlocked ? "#ffd98b" : "#7c8a96",
        fontFamily: "monospace",
        fontSize: "13px"
      }));
      this.routeLadderDecor.push(this.add.text(route.x - 52, route.y + 18, selected ? "Selected for deploy" : "Standby route", {
        color: selected ? "#9adbf2" : "#c6d2dc",
        fontFamily: "monospace",
        fontSize: "12px"
      }));
    });
  }

  emitHubRuntime() {
    const definition = (this.content.classes ?? []).find((entry) => entry.id === this.selectedArchetype);
    const resumeSource = this.registry.get("resumeSource") ?? "fresh-start";
    emitRuntimeUpdate({
      scene: {
        scene: "hub",
        label: "Hub"
      },
      regionId: "hub_blacksite",
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
        { key: "1 / 2 / 3", label: "Select region" },
        { key: "ENTER", label: "Deploy" },
        { key: "Shell", label: "Switch build from browser UI" }
      ],
      cooldowns: [],
      resumeSource,
      objective: {
        title: this.firstRunTutorial ? "First deployment" : "Deploy from Blacksite",
        detail: this.firstRunTutorial
          ? "Start in Shatter Block, secure one boon, then enter the field gate."
          : `Choose a route and enter ${(this.content.regions ?? []).find((entry) => entry.id === this.selectedRegionId)?.name ?? "the field"}.`,
        step: this.firstRunTutorial ? "Press 1, then Enter" : "Select 1 / 2 / 3, then press Enter"
      },
      combatFeed: [
        { id: 1, message: `Hub ready. Deploy to ${(this.content.regions ?? []).find((entry) => entry.id === this.selectedRegionId)?.name ?? "the field"}.` },
        {
          id: 2,
          message: this.unlockedRegionIds.includes("cinder_ward")
            ? "Cinder Ward route unlocked from sanctum collapse."
            : this.unlockedRegionIds.includes("veil_shrine")
              ? "Veil Shrine route unlocked from prior boss clear."
              : "Clear Shatter Block's boss to unlock the next route."
        }
      ],
      encounter: {
        enemiesRemaining: 0,
        status: "Safe zone"
      },
      sessionState: {
        unlockedRegionIds: this.unlockedRegionIds,
        clearedRegionIds: this.clearedRegionIds
      },
      selectedRegionId: this.selectedRegionId
    });
  }

  handleRegionSelection(regionId) {
    if (!this.unlockedRegionIds.includes(regionId)) {
      return;
    }

    this.selectedRegionId = regionId;
    this.refreshSummary();
    this.emitHubRuntime();
  }

  deployToRegion() {
    if (this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    resetRouteRuntimeState(this.registry);
    emitSoundEvent({ type: "skill_cast" });
    this.registry.set("currentRegionId", this.selectedRegionId);
    emitTransitionUpdate({
      active: true,
      label: "Entering region",
      detail: `Scanning cursed density in ${(this.content.regions ?? []).find((entry) => entry.id === this.selectedRegionId)?.name ?? "the target region"}...`
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

  update() {
    if (this.isTransitioning) {
      return;
    }

    const nextArchetype = this.registry.get("selectedArchetype") ?? this.selectedArchetype;
    if (nextArchetype !== this.selectedArchetype) {
      this.selectedArchetype = nextArchetype;
      const profile = this.registry.get("playerProfile") ?? null;
      const loadedSessionSummary = this.registry.get("loadedSessionSummary") ?? null;
      this.unlockedRegionIds = [
        ...new Set([
          ...(profile?.unlockedRegionIds ?? ["shatter_block"]),
          ...(loadedSessionSummary?.sessionState?.unlockedRegionIds ?? [])
        ])
      ];
      if (!this.unlockedRegionIds.includes(this.selectedRegionId)) {
        this.selectedRegionId = "shatter_block";
      }
      this.refreshSummary();
      this.emitHubRuntime();
    }

    if (Phaser.Input.Keyboard.JustDown(this.regionKeys.ONE)) {
      this.handleRegionSelection("shatter_block");
    }

    if (Phaser.Input.Keyboard.JustDown(this.regionKeys.TWO) && this.unlockedRegionIds.includes("veil_shrine")) {
      this.handleRegionSelection("veil_shrine");
    }

    if (Phaser.Input.Keyboard.JustDown(this.regionKeys.THREE) && this.unlockedRegionIds.includes("cinder_ward")) {
      this.handleRegionSelection("cinder_ward");
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.deployToRegion();
    }
  }
}

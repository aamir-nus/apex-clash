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
  detention_center: {
    name: "Detention Center",
    x: 268,
    y: 230,
    fill: 0x244b33,
    stroke: 0xb8f29b,
    accent: 0x8ec07c
  },
  barrier_shrine: {
    name: "Barrier Shrine",
    x: 488,
    y: 230,
    fill: 0x322146,
    stroke: 0xf0d2ff,
    accent: 0xc77dff
  },
  shibuya_burn_sector: {
    name: "Shibuya Burn Sector",
    x: 378,
    y: 360,
    fill: 0x472016,
    stroke: 0xffd4a3,
    accent: 0xff8a5b
  },
  collapsed_cathedral_barrier: {
    name: "Collapsed Cathedral Barrier",
    x: 598,
    y: 360,
    fill: 0x141b36,
    stroke: 0xa9c4ff,
    accent: 0x7aa2ff
  },
  merger_ossuary: {
    name: "Merger Ossuary",
    x: 760,
    y: 228,
    fill: 0x221425,
    stroke: 0xf3d9ff,
    accent: 0xff73d0
  }
};

function resetRouteRuntimeState(registry) {
  registry.set("loadedPlayerState", null);
  registry.set("loadedSessionSummary", null);
  registry.set("explorationBonus", null);
  registry.set("combatSnapshot", null);
  registry.set("routeReturnSummary", null);
}

function mapBossVaultToClearedRegion(regionId) {
  return regionId === "detention_center_boss_vault"
    ? "detention_center"
    : regionId === "barrier_shrine_boss_vault"
      ? "barrier_shrine"
      : regionId === "shibuya_burn_sector_boss_vault"
        ? "shibuya_burn_sector"
        : regionId === "collapsed_cathedral_barrier_boss_vault"
          ? "collapsed_cathedral_barrier"
          : regionId === "merger_ossuary_boss_vault"
            ? "merger_ossuary"
        : null;
}

function pickNextRecommendedRegion(unlockedRegionIds, clearedRegionIds) {
  const routeOrder = ["detention_center", "barrier_shrine", "shibuya_burn_sector", "collapsed_cathedral_barrier", "merger_ossuary"];
  return (
    routeOrder.find((regionId) => unlockedRegionIds.includes(regionId) && !clearedRegionIds.includes(regionId)) ??
    routeOrder.find((regionId) => unlockedRegionIds.includes(regionId)) ??
    "detention_center"
  );
}

export class HubScene extends Phaser.Scene {
  constructor() {
    super("HubScene");
    this.enterKey = null;
    this.regionKeys = null;
    this.selectedArchetype = "striker";
    this.content = {};
    this.summaryText = null;
    this.tutorialText = null;
    this.selectedRegionId = "detention_center";
    this.unlockedRegionIds = ["detention_center"];
    this.clearedRegionIds = [];
    this.routeLadderDecor = [];
    this.isTransitioning = false;
    this.firstRunTutorial = false;
    this.unsubscribeControlCommands = null;
    this.routeReturnSummary = null;
    this.arrivalText = null;
    this.arrivalSubtext = null;
    this.arrivalGlow = null;
  }

  create() {
    this.content = this.registry.get("content") ?? {};
    this.selectedArchetype = this.registry.get("selectedArchetype") ?? "striker";
    this.firstRunTutorial = this.registry.get("firstRunTutorial") ?? false;
    this.isTransitioning = false;
    this.input.keyboard.resetKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.regionKeys = this.input.keyboard.addKeys("ONE,TWO,THREE,FOUR,FIVE");
    const profile = this.registry.get("playerProfile") ?? null;
    const loadedSessionSummary = this.registry.get("loadedSessionSummary") ?? null;
    this.routeReturnSummary = this.registry.get("routeReturnSummary") ?? null;
    const derivedClearedRegionId = mapBossVaultToClearedRegion(
      loadedSessionSummary?.sessionState?.clearedBossRegionId ?? null
    );
    this.unlockedRegionIds = [
      ...new Set([
        ...(profile?.unlockedRegionIds ?? ["detention_center"]),
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
    this.selectedRegionId = pickNextRecommendedRegion(this.unlockedRegionIds, this.clearedRegionIds);

    this.add.rectangle(arena.width / 2, arena.height / 2, arena.width, arena.height, 0x0c1722);
    this.add.circle(168, 110, 34, 0xf4b942, 0.08).setStrokeStyle(2, 0xf4b942, 0.22);
    this.add.circle(792, 428, 42, 0x4cc9f0, 0.08).setStrokeStyle(2, 0x4cc9f0, 0.24);
    this.add.rectangle(arena.width / 2, arena.height / 2, 760, 360, 0x13283a, 1).setStrokeStyle(2, 0xf4b942);
    this.add.rectangle(164, 246, 92, 150, 0x1b2734, 0.42).setStrokeStyle(1, 0x4cc9f0, 0.2);
    this.add.rectangle(798, 254, 110, 166, 0x1b2734, 0.32).setStrokeStyle(1, 0xf4b942, 0.2);
    this.add.rectangle(162, 308, 54, 14, 0x4cc9f0, 0.18).setStrokeStyle(1, 0xf6f1df, 0.12);
    this.add.rectangle(162, 334, 54, 14, 0x4cc9f0, 0.12).setStrokeStyle(1, 0xf6f1df, 0.1);
    this.add.rectangle(800, 312, 68, 16, 0xf4b942, 0.16).setStrokeStyle(1, 0xf6f1df, 0.12);
    this.add.rectangle(800, 340, 68, 16, 0xf4b942, 0.1).setStrokeStyle(1, 0xf6f1df, 0.1);
    const beaconRing = this.add.circle(706, 210, 22, 0x4cc9f0, 0.06).setStrokeStyle(2, 0x4cc9f0, 0.26);
    this.tweens.add({
      targets: beaconRing,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0,
      duration: 1400,
      repeat: -1,
      ease: "Sine.easeOut"
    });
    const archiveBlink = this.add.rectangle(250, 214, 12, 12, 0xffb36b, 0.7).setStrokeStyle(1, 0xf6f1df, 0.2);
    this.tweens.add({
      targets: archiveBlink,
      alpha: 0.22,
      duration: 580,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
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
    this.add.text(112, 382, "Briefing wall", {
      color: "#7fb7cf",
      fontFamily: "monospace",
      fontSize: "12px"
    });
    this.add.text(740, 384, "Transit cradle", {
      color: "#e5c37b",
      fontFamily: "monospace",
      fontSize: "12px"
    });
    this.arrivalGlow = this.add.circle(706, 210, 42, 0xb8f29b, 0);
    this.arrivalText = this.add.text(480, 164, "", {
      color: "#b8f29b",
      fontFamily: "monospace",
      fontSize: "22px",
      align: "center"
    }).setOrigin(0.5).setAlpha(0);
    this.arrivalSubtext = this.add.text(480, 194, "", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "14px",
      align: "center"
    }).setOrigin(0.5).setAlpha(0);

    this.add.text(100, 100, "Tokyo Jujutsu High", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "28px"
    });

    this.add.text(
      100,
      150,
      this.firstRunTutorial
        ? "First deployment briefing.\n\nPress 1 to target Detention Center.\nPress ENTER to deploy.\nUse the browser shell to swap archetypes before stepping out."
        : "Safe zone prototype.\n\nPress 1, 2, 3, 4, or 5 to target an unlocked region.\nPress ENTER to deploy.\nSwitch archetypes from the browser shell before entering.",
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
    this.playArrivalSummary();
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
    const nextRegion = (this.content.regions ?? []).find(
      (entry) => entry.id === pickNextRecommendedRegion(this.unlockedRegionIds, this.clearedRegionIds)
    );
    const barrierUnlocked = this.unlockedRegionIds.includes("barrier_shrine");
    const burnUnlocked = this.unlockedRegionIds.includes("shibuya_burn_sector");
    const cathedralUnlocked = this.unlockedRegionIds.includes("collapsed_cathedral_barrier");
    const mergerUnlocked = this.unlockedRegionIds.includes("merger_ossuary");
    this.summaryText?.setText(
      `Current build: ${definition?.name ?? "Unknown"}\nCombat style: ${definition?.combatStyle ?? "Unavailable"}\nSelected region: ${selectedRegion?.name ?? "Unknown"}\nNext recommended route: ${nextRegion?.name ?? "Unknown"}\nUnlocked routes: Detention Center${barrierUnlocked ? ", Barrier Shrine" : ""}${burnUnlocked ? ", Shibuya Burn Sector" : ""}${cathedralUnlocked ? ", Collapsed Cathedral Barrier" : ""}${mergerUnlocked ? ", Merger Ossuary" : ""}`
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
    const returnSummary = this.routeReturnSummary;
    const nextRecommendedRegionId = pickNextRecommendedRegion(this.unlockedRegionIds, this.clearedRegionIds);
    const nextRecommendedRegionName =
      (this.content.regions ?? []).find((entry) => entry.id === nextRecommendedRegionId)?.name ?? "the next route";
    const selectedRegionName =
      (this.content.regions ?? []).find((entry) => entry.id === this.selectedRegionId)?.name ?? "the field";
    emitRuntimeUpdate({
      scene: {
        scene: "hub",
        label: "Hub"
      },
      regionId: "hub_jujutsu_high",
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
        { key: "1 / 2 / 3 / 4 / 5", label: "Select region" },
        { key: "ENTER", label: "Deploy" },
        { key: "Shell", label: "Switch build from browser UI" }
      ],
      cooldowns: [],
      resumeSource,
      objective: {
        title: returnSummary?.title ?? (this.firstRunTutorial ? "First deployment" : "Deploy from Tokyo Jujutsu High"),
        detail: returnSummary?.detail ?? (this.firstRunTutorial
          ? "Start in Detention Center, secure one boon, then enter the field gate."
          : `Choose a route and enter ${selectedRegionName}. Next recommended route: ${nextRecommendedRegionName}.`),
        step: returnSummary?.step ?? (this.firstRunTutorial ? "Press 1, then Enter" : `Select ${selectedRegionName}, then deploy toward ${nextRecommendedRegionName}`)
      },
      activeEffects: returnSummary
        ? [
            {
              id: "route-return",
              label: returnSummary.effectLabel,
              detail: returnSummary.effectDetail,
              tone: "boon"
            },
            {
              id: "route-next",
              label: "Next deployment",
              detail: `${nextRecommendedRegionName} is the current recommended route.`,
              tone: "neutral"
            }
          ]
        : [],
      combatFeed: [
        {
          id: 1,
          message: returnSummary?.feedMessage ?? `Hub ready. Deploy to ${selectedRegionName}.`
        },
        {
          id: 2,
          message: `Next recommended deployment: ${nextRecommendedRegionName}.`
        }
      ],
      encounter: {
        enemiesRemaining: 0,
        status: "Safe zone"
      },
      sessionState: {
        unlockedRegionIds: this.unlockedRegionIds,
        clearedRegionIds: this.clearedRegionIds,
        routeReturnSummary: returnSummary,
        nextRecommendedRegionId
      },
      selectedRegionId: this.selectedRegionId
    });
  }

  playArrivalSummary() {
    if (!this.routeReturnSummary || !this.arrivalText || !this.arrivalSubtext || !this.arrivalGlow) {
      return;
    }

    this.arrivalText.setText(this.routeReturnSummary.bannerTitle);
    this.arrivalSubtext.setText(this.routeReturnSummary.bannerDetail);
    this.arrivalText.setAlpha(1).setY(164);
    this.arrivalSubtext.setAlpha(1).setY(194);
    this.arrivalGlow.setAlpha(0.32).setScale(1);
    emitSoundEvent({ type: "route_return" });
    this.tweens.add({
      targets: [this.arrivalText, this.arrivalSubtext],
      alpha: 0,
      y: "-=12",
      duration: 2400,
      ease: "Quad.easeOut"
    });
    this.tweens.add({
      targets: this.arrivalGlow,
      alpha: 0,
      scaleX: 1.55,
      scaleY: 1.55,
      duration: 1100,
      ease: "Quad.easeOut"
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
          ...(profile?.unlockedRegionIds ?? ["detention_center"]),
          ...(loadedSessionSummary?.sessionState?.unlockedRegionIds ?? [])
        ])
      ];
      if (!this.unlockedRegionIds.includes(this.selectedRegionId)) {
        this.selectedRegionId = "detention_center";
      }
      this.refreshSummary();
      this.emitHubRuntime();
    }

    if (Phaser.Input.Keyboard.JustDown(this.regionKeys.ONE)) {
      this.handleRegionSelection("detention_center");
    }

    if (Phaser.Input.Keyboard.JustDown(this.regionKeys.TWO) && this.unlockedRegionIds.includes("barrier_shrine")) {
      this.handleRegionSelection("barrier_shrine");
    }

    if (Phaser.Input.Keyboard.JustDown(this.regionKeys.THREE) && this.unlockedRegionIds.includes("shibuya_burn_sector")) {
      this.handleRegionSelection("shibuya_burn_sector");
    }

    if (Phaser.Input.Keyboard.JustDown(this.regionKeys.FOUR) && this.unlockedRegionIds.includes("collapsed_cathedral_barrier")) {
      this.handleRegionSelection("collapsed_cathedral_barrier");
    }

    if (Phaser.Input.Keyboard.JustDown(this.regionKeys.FIVE) && this.unlockedRegionIds.includes("merger_ossuary")) {
      this.handleRegionSelection("merger_ossuary");
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.deployToRegion();
    }
  }
}

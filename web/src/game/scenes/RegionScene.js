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

export class RegionScene extends Phaser.Scene {
  constructor() {
    super("RegionScene");
    this.content = {};
    this.selectedArchetype = "close_combat";
    this.enterKey = null;
    this.returnKey = null;
    this.cursors = null;
    this.actionKeys = null;
    this.player = null;
    this.gateZone = null;
    this.promptText = null;
    this.summaryText = null;
    this.combatSnapshot = null;
    this.playerProfile = null;
    this.poiZones = [];
    this.poiPrompt = "";
    this.discoveryFeed = [];
    this.nextFeedId = 1;
    this.explorationBonus = null;
    this.currentRegionId = "shatter_block";
    this.isTransitioning = false;
    this.firstRunTutorial = false;
    this.unsubscribeControlCommands = null;
    this.gateMarker = null;
  }

  create() {
    this.content = this.registry.get("content") ?? {};
    this.selectedArchetype = this.registry.get("selectedArchetype") ?? "close_combat";
    this.playerProfile = this.registry.get("playerProfile") ?? null;
    this.firstRunTutorial = this.registry.get("firstRunTutorial") ?? false;
    this.currentRegionId = this.registry.get("currentRegionId") ?? this.playerProfile?.currentRegionId ?? "shatter_block";
    this.isTransitioning = false;
    this.input.keyboard.resetKeys();
    this.combatSnapshot = this.registry.get("combatSnapshot") ?? null;
    this.explorationBonus = this.registry.get("explorationBonus") ?? null;
    const loadedSessionSummary = this.registry.get("loadedSessionSummary") ?? null;
    const loadedSessionState = loadedSessionSummary?.sessionState ?? {};
    if (loadedSessionState.combatSnapshot && !this.combatSnapshot) {
      this.combatSnapshot = loadedSessionState.combatSnapshot;
      this.registry.set("combatSnapshot", this.combatSnapshot);
    }
    if (loadedSessionState.explorationBonus && !this.explorationBonus) {
      this.explorationBonus = loadedSessionState.explorationBonus;
      this.registry.set("explorationBonus", this.explorationBonus);
    }
    this.registry.set("loadedSessionSummary", null);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.returnKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.actionKeys = this.input.keyboard.addKeys("W,A,S,D");

    const regionTheme =
      this.currentRegionId === "veil_shrine"
        ? {
            bg: 0x161220,
            frame: 0x2d2342,
            frameStroke: 0xe2b6ff,
            gateFill: 0x3f2b5b,
            gateStroke: 0xf0d2ff,
            accentFill: 0x1b2e28,
            accentStroke: 0x6fd1b1,
            title: "Veil Shrine",
            copy:
              "Move with WASD or arrows.\nWalk into the violet gate area and press E to enter the shrine depth.\nPress H to return to the hub."
          }
        : this.currentRegionId === "cinder_ward"
          ? {
              bg: 0x22130f,
              frame: 0x3f2318,
              frameStroke: 0xffb36b,
              gateFill: 0x5b2d1d,
              gateStroke: 0xffd4a3,
              accentFill: 0x3b1d18,
              accentStroke: 0xff8a5b,
              title: "Cinder Ward",
              copy:
                "Move with WASD or arrows.\nWalk into the ember gate area and press E to enter the furnace descent.\nPress H to return to the hub."
            }
        : {
            bg: 0x101f14,
            frame: 0x183223,
            frameStroke: 0x8ec07c,
            gateFill: 0x244b33,
            gateStroke: 0xb8f29b,
            accentFill: 0x13283a,
            accentStroke: 0x31556f,
            title: "Shatter Block",
            copy:
              "Move with WASD or arrows.\nWalk into the green gate area and press E to enter the dungeon.\nPress H to return to the hub."
          };

    this.add.rectangle(arena.width / 2, arena.height / 2, arena.width, arena.height, regionTheme.bg);
    this.add.circle(210, 112, 26, regionTheme.frameStroke, 0.08).setStrokeStyle(2, regionTheme.frameStroke, 0.24);
    this.add.circle(760, 418, 42, regionTheme.gateStroke, 0.05).setStrokeStyle(2, regionTheme.gateStroke, 0.22);
    this.add.rectangle(arena.width / 2, arena.height / 2, 820, 400, regionTheme.frame, 1).setStrokeStyle(2, regionTheme.frameStroke);
    this.add.rectangle(660, 270, 140, 140, regionTheme.gateFill, 0.55).setStrokeStyle(2, regionTheme.gateStroke);
    this.add.rectangle(280, 270, 180, 200, regionTheme.accentFill, 0.18).setStrokeStyle(1, regionTheme.accentStroke);
    this.add.rectangle(652, 176, 66, 18, regionTheme.gateStroke, 0.22).setStrokeStyle(1, 0xf6f1df, 0.3);
    this.add.text(624, 166, "Gate", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "14px"
    });
    this.add.rectangle(282, 168, 74, 18, regionTheme.accentStroke, 0.16).setStrokeStyle(1, 0xf6f1df, 0.2);
    this.add.text(246, 158, "Boon zone", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "14px"
    });
    this.add.line(0, 0, 282, 214, 650, 270, regionTheme.frameStroke, 0.28).setOrigin(0, 0).setLineWidth(3);
    this.add.circle(416, 242, 10, regionTheme.frameStroke, 0.16).setStrokeStyle(2, 0xf6f1df, 0.2);
    this.add.text(384, 252, "Forward route", {
      color: "#d9e7d2",
      fontFamily: "monospace",
      fontSize: "12px"
    });

    this.add.text(100, 90, regionTheme.title, {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "28px"
    });
    this.add.text(100, 114, `Route pressure: ${this.currentRegionId === "veil_shrine" ? "sanctum descent" : this.currentRegionId === "cinder_ward" ? "furnace descent" : "rupture sweep"}`, {
      color: "#ffd98b",
      fontFamily: "monospace",
      fontSize: "13px"
    });

    this.add.text(
      100,
      140,
      this.firstRunTutorial
        ? `${regionTheme.copy}\n\nFirst run: claim a point of interest before taking the gate.`
        : regionTheme.copy,
      {
        color: "#d9e7d2",
        fontFamily: "monospace",
        fontSize: "16px",
        lineSpacing: 8
      }
    );

    this.summaryText = this.add.text(100, 300, "", {
      color: "#b8f29b",
      fontFamily: "monospace",
      fontSize: "16px"
    });

    this.promptText = this.add.text(540, 140, "", {
      color: "#ffd98b",
      fontFamily: "monospace",
      fontSize: "14px"
    });

    this.player = this.add.rectangle(220, 270, 24, 24, 0x3ddc97);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.setStrokeStyle(2, 0xf6f1df);
    this.playerIdleTween = this.tweens.add({
      targets: this.player,
      scaleY: 0.95,
      scaleX: 1.04,
      duration: 460,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.gateZone = this.add.rectangle(660, 270, 120, 120, 0xb8f29b, 0.08);
    this.physics.add.existing(this.gateZone, true);
    this.gateMarker = this.add.text(648, 226, "v", {
      color: "#ffd98b",
      fontFamily: "monospace",
      fontSize: "28px"
    });
    this.tweens.add({
      targets: this.gateMarker,
      y: 212,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.buildAdaptivePointsOfInterest();

    this.refreshSummary();
    this.emitRegionRuntime();
    this.unsubscribeControlCommands = subscribeToControlCommands((command) => {
      if (command?.scene !== "region" || this.isTransitioning) {
        return;
      }

      if (command.type === "claim-boon") {
        this.claimFirstAvailablePointOfInterest();
      }

      if (command.type === "enter-dungeon") {
        this.enterDungeon();
      }

      if (command.type === "return-hub") {
        this.returnToHub();
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeControlCommands?.();
      this.unsubscribeControlCommands = null;
    });
    emitSceneUpdate({
      scene: "region",
      label: "Region"
    });
  }

  refreshSummary() {
    const definition = (this.content.classes ?? []).find((entry) => entry.id === this.selectedArchetype);
    const region = (this.content.regions ?? []).find((entry) => entry.id === this.currentRegionId);
    const instinctLabel =
      this.selectedArchetype === "heavenly_restriction" ? "Tool Intuition" : "Explore Radius";
    const combatStyle = this.combatSnapshot?.style ?? "unread";
    this.summaryText?.setText(
      `Build: ${definition?.name ?? "Unknown"}\nRegion: ${region?.name ?? "Unknown"}\nRecommended level: ${region?.recommendedLevel ?? "?"}\nSense: ${instinctLabel}\nRecent combat read: ${combatStyle}`
    );
  }

  buildAdaptivePointsOfInterest() {
    const isHeavenly = this.selectedArchetype === "heavenly_restriction";
    const snapshot = this.combatSnapshot ?? {
      style: "fresh",
      damageTaken: 0,
      skillsUsed: 0,
      basicsUsed: 0,
      kills: 0
    };
    const shouldRevealCache = isHeavenly || snapshot.damageTaken >= 12 || snapshot.style === "pressured";
    const shouldRevealTechniqueNode =
      !isHeavenly && (snapshot.skillsUsed >= snapshot.basicsUsed || this.selectedArchetype !== "close_combat");
    const shouldRevealPredatorNode =
      snapshot.kills >= 2 || this.selectedArchetype === "close_combat" || isHeavenly;

    const definitions = [
      shouldRevealCache
        ? {
            id: "supply_cache",
            x: 268,
            y: 214,
            color: 0x4cc9f0,
            label: isHeavenly ? "Weapon cache" : "Recovery stash",
            prompt: isHeavenly
              ? "Press E to claim a sharpened tool boon"
              : "Press E to steady yourself and recover before the next fight",
            reward: isHeavenly
              ? {
                  kind: "weapon",
                  label: "Sharpened weapon edge",
                  attackBonus: 4,
                  speedBonus: 1
                }
              : {
                  kind: "recovery",
                  label: "Recovered breathing rhythm",
                  hpBonus: 16,
                  defenseBonus: 2
                }
          }
        : null,
      shouldRevealTechniqueNode
        ? {
            id: "echo_shrine",
            x: 414,
            y: 350,
            color: 0xc77dff,
            label: "Echo shrine",
            prompt: "Press E to tune your cursed flow",
            reward: {
              kind: "technique",
              label: "Technique resonance",
              ceBonus: 18,
              speedBonus: 1
            }
          }
        : null,
      shouldRevealPredatorNode
        ? {
            id: "hunter_trail",
            x: 528,
            y: 188,
            color: 0xff9f1c,
            label: isHeavenly ? "Hunter trail" : "Aggression trail",
            prompt: "Press E to lock onto the next threat",
            reward: {
              kind: "pressure",
              label: "Predatory momentum",
              attackBonus: 3,
              hpBonus: 8
            }
          }
        : null
    ].filter(Boolean);

    this.poiZones = definitions.map((entry) => {
      const marker = this.add.circle(entry.x, entry.y, 16, entry.color, 0.65).setStrokeStyle(2, 0xf6f1df);
      marker.pulseTween = this.tweens.add({
        targets: marker,
        scaleX: 1.18,
        scaleY: 1.18,
        alpha: 0.94,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      const label = this.add.text(entry.x - 42, entry.y + 22, entry.label, {
        color: "#f6f1df",
        fontFamily: "monospace",
        fontSize: "11px"
      });
      return {
        ...entry,
        marker,
        label,
        claimed: false
      };
    });

    if (!this.combatSnapshot) {
      this.pushDiscoveryFeed("Fresh region sweep. Hidden nodes will adapt after combat.");
      return;
    }

    if (this.poiZones.length > 0) {
      this.pushDiscoveryFeed(`Region adapted to your ${snapshot.style} fighting pattern.`);
    }
  }

  pushDiscoveryFeed(message) {
    this.discoveryFeed = [{ id: this.nextFeedId++, message }, ...this.discoveryFeed].slice(0, 4);
  }

  emitRegionRuntime() {
    const definition = (this.content.classes ?? []).find((entry) => entry.id === this.selectedArchetype);
    const stats = this.playerProfile?.computedStats ?? definition?.baseStats ?? {};
    const bonusText = this.explorationBonus?.label ?? "No exploration boon";
    const resumeSource = this.registry.get("resumeSource") ?? "fresh-start";
    const gateLabel =
      this.currentRegionId === "veil_shrine"
        ? "sanctum descent"
        : this.currentRegionId === "cinder_ward"
          ? "furnace descent"
          : "dungeon ingress";
    emitRuntimeUpdate({
      scene: {
        scene: "region",
        label: "Region"
      },
      regionId: this.currentRegionId,
      player: {
        hp: stats.hp ?? 0,
        maxHp: stats.hp ?? 0,
        ce: stats.ce ?? 0,
        maxCe: stats.ce ?? 0,
        level: this.playerProfile?.level ?? 1,
        xp: 0,
        xpToNextLevel: 30,
        attack: stats.attack ?? 0,
        defense: stats.defense ?? 0,
        speed: stats.speed ?? 0,
        pendingStatPoints: 0,
        archetype: definition?.name ?? "Unknown Build"
      },
      controls: [
        { key: "WASD", label: "Explore" },
        { key: "E", label: "Interact or enter encounter" },
        { key: "H", label: "Return to hub" }
      ],
      cooldowns: [],
      resumeSource,
      objective: {
        title: this.firstRunTutorial ? "Secure your first boon" : "Probe the route",
        detail: this.explorationBonus
          ? `Carry ${this.explorationBonus.label} into the ${gateLabel}.`
          : this.firstRunTutorial
            ? `Scan the marked boon zone first, then push into the ${gateLabel}.`
            : `Search the area, secure a boon, and enter the ${gateLabel}.`,
        step: this.explorationBonus
          ? "Move to the gate and press E"
          : this.firstRunTutorial
            ? "Claim a point of interest, then take the gate"
            : "Claim a point of interest, then head to the gate"
      },
      activeEffects: this.explorationBonus
        ? [{ id: "region-boon", label: this.explorationBonus.label, detail: "Recovered from prior sweep", tone: "boon" }]
        : [],
      sessionState: {
        explorationBonus: this.explorationBonus,
        combatSnapshot: this.combatSnapshot,
        unlockedRegionIds: this.playerProfile?.unlockedRegionIds ?? ["shatter_block"]
      },
      combatFeed: [
        { id: 1, message: `Exploration boon: ${bonusText}` },
        { id: 2, message: `Route pressure: ${gateLabel}` },
        ...this.discoveryFeed
      ],
      encounter: {
        enemiesRemaining: this.poiZones.filter((entry) => !entry.claimed).length,
        status: this.poiPrompt || "Exploration layer"
      }
    });
  }

  claimPointOfInterest(point) {
    if (point.claimed) {
      return;
    }

    point.claimed = true;
    point.marker.setFillStyle(0x5a5a5a, 0.25);
    point.marker.pulseTween?.stop();
    point.label.setColor("#88939b");
    this.explorationBonus = point.reward;
    this.registry.set("explorationBonus", point.reward);
    this.pushDiscoveryFeed(`${point.label.text} secured: ${point.reward.label}.`);
    emitSoundEvent({ type: "enemy_down" });
    this.emitRegionRuntime();
  }

  claimFirstAvailablePointOfInterest() {
    const point = this.poiZones.find((entry) => !entry.claimed);
    if (!point) {
      return;
    }

    this.player.setPosition(point.x, point.y);
    this.claimPointOfInterest(point);
  }

  enterDungeon() {
    if (this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    this.player.setPosition(this.gateZone.x, this.gateZone.y);
    this.registry.set(
      "currentRegionId",
      this.currentRegionId === "veil_shrine"
        ? "veil_dungeon"
        : this.currentRegionId === "cinder_ward"
          ? "cinder_dungeon"
          : "shatter_dungeon"
    );
    emitSoundEvent({ type: "skill_cast" });
    emitTransitionUpdate({
      active: true,
      label: "Dungeon ingress",
      detail:
        this.currentRegionId === "veil_shrine"
          ? "Dropping into the Veil Depth..."
          : this.currentRegionId === "cinder_ward"
            ? "Dropping into the furnace descent..."
            : "Dropping into the Shatter Dungeon..."
    });
    this.time.delayedCall(220, () => {
      emitSceneUpdate({
        scene: "dungeon",
        label: "Dungeon"
      });
      emitTransitionUpdate({
        active: false,
        label: "",
        detail: ""
      });
      this.scene.start("DungeonScene");
    });
  }

  returnToHub() {
    if (this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    this.registry.set("explorationBonus", null);
    this.registry.set("combatSnapshot", null);
    this.registry.set("loadedPlayerState", null);
    this.registry.set("loadedSessionSummary", {
      enemiesRemaining: 0,
      combatFeed: [],
      sessionState: {
        unlockedRegionIds: this.playerProfile?.unlockedRegionIds ?? ["shatter_block"]
      }
    });
    this.registry.set("currentRegionId", "hub_blacksite");
    emitTransitionUpdate({
      active: true,
      label: "Returning to hub",
      detail: "Pulling back to Blacksite..."
    });
    this.time.delayedCall(220, () => {
      emitSceneUpdate({
        scene: "hub",
        label: "Hub"
      });
      emitTransitionUpdate({
        active: false,
        label: "",
        detail: ""
      });
      this.scene.start("HubScene");
    });
  }

  update() {
    if (this.isTransitioning) {
      return;
    }

    const nextArchetype = this.registry.get("selectedArchetype") ?? this.selectedArchetype;
    if (nextArchetype !== this.selectedArchetype) {
      this.selectedArchetype = nextArchetype;
      this.playerProfile = this.registry.get("playerProfile") ?? null;
      this.combatSnapshot = this.registry.get("combatSnapshot") ?? null;
      this.poiZones.forEach((entry) => {
        entry.marker.destroy();
        entry.label.destroy();
      });
      this.poiZones = [];
      this.discoveryFeed = [];
      this.buildAdaptivePointsOfInterest();
      this.refreshSummary();
      this.emitRegionRuntime();
    }

    const keys = this.actionKeys;
    const velocity = 150;
    this.player.body.setVelocity(0, 0);

    if (this.cursors.left.isDown || keys.A.isDown) {
      this.player.body.setVelocityX(-velocity);
    }
    if (this.cursors.right.isDown || keys.D.isDown) {
      this.player.body.setVelocityX(velocity);
    }
    if (this.cursors.up.isDown || keys.W.isDown) {
      this.player.body.setVelocityY(-velocity);
    }
    if (this.cursors.down.isDown || keys.S.isDown) {
      this.player.body.setVelocityY(velocity);
    }

    this.player.body.velocity.normalize().scale(velocity);
    if (this.player.body.velocity.lengthSq() > 0) {
      const directionX = this.player.body.velocity.x / Math.max(1, Math.abs(this.player.body.velocity.x));
      this.player.angle = Phaser.Math.Linear(this.player.angle, directionX * 6 || 0, 0.24);
      this.player.scaleX = Phaser.Math.Linear(this.player.scaleX, 1.08, 0.25);
      this.player.scaleY = Phaser.Math.Linear(this.player.scaleY, 0.92, 0.25);
    } else {
      this.player.angle = Phaser.Math.Linear(this.player.angle, 0, 0.18);
      this.player.scaleX = Phaser.Math.Linear(this.player.scaleX, 1, 0.18);
      this.player.scaleY = Phaser.Math.Linear(this.player.scaleY, 1, 0.18);
    }

    const gateDistance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.gateZone.x,
      this.gateZone.y
    );
    const insideGate = gateDistance < 96;
    const nearestPoint = this.poiZones
      .filter((entry) => !entry.claimed)
      .find(
        (entry) =>
          Phaser.Math.Distance.Between(this.player.x, this.player.y, entry.x, entry.y) < 52
      );

    if (nearestPoint) {
      this.poiPrompt = nearestPoint.prompt;
      this.gateMarker.setAlpha(0.25);
      nearestPoint.marker.setAlpha(1);
    } else if (insideGate) {
      this.poiPrompt =
        this.currentRegionId === "veil_shrine"
          ? "Press E to enter the sanctum descent"
          : this.currentRegionId === "cinder_ward"
            ? "Press E to enter the furnace descent"
            : "Press E to enter the dungeon";
      this.gateMarker.setAlpha(1);
    } else {
      this.poiPrompt = this.firstRunTutorial
        ? "Follow the marker: secure one boon, then take the gate"
        : "Follow the marker: claim a node or move to the gate";
      this.gateMarker.setAlpha(0.78);
    }

    this.poiZones
      .filter((entry) => !entry.claimed && entry !== nearestPoint)
      .forEach((entry) => entry.marker.setAlpha(0.7));

    this.promptText.setText(this.poiPrompt);

    if (nearestPoint && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.claimPointOfInterest(nearestPoint);
      return;
    }

    if (insideGate && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.enterDungeon();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.returnKey)) {
      this.returnToHub();
    }
  }
}

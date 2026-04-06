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
  }

  create() {
    this.content = this.registry.get("content") ?? {};
    this.selectedArchetype = this.registry.get("selectedArchetype") ?? "close_combat";
    this.playerProfile = this.registry.get("playerProfile") ?? null;
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
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.returnKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.actionKeys = this.input.keyboard.addKeys("W,A,S,D");

    this.add.rectangle(arena.width / 2, arena.height / 2, arena.width, arena.height, 0x101f14);
    this.add.rectangle(arena.width / 2, arena.height / 2, 820, 400, 0x183223, 1).setStrokeStyle(2, 0x8ec07c);
    this.add.rectangle(660, 270, 140, 140, 0x244b33, 0.55).setStrokeStyle(2, 0xb8f29b);
    this.add.rectangle(280, 270, 180, 200, 0x13283a, 0.18).setStrokeStyle(1, 0x31556f);

    this.add.text(100, 90, "Shatter Block", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "28px"
    });

    this.add.text(
      100,
      140,
      "Move with WASD or arrows.\nWalk into the green gate area and press E to enter the dungeon.\nPress H to return to the hub.",
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
    this.buildAdaptivePointsOfInterest();

    this.refreshSummary();
    this.emitRegionRuntime();
    emitSceneUpdate({
      scene: "region",
      label: "Region"
    });
  }

  refreshSummary() {
    const definition = (this.content.classes ?? []).find((entry) => entry.id === this.selectedArchetype);
    const region = (this.content.regions ?? []).find((entry) => entry.id === "shatter_block");
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
    emitRuntimeUpdate({
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
      activeEffects: this.explorationBonus
        ? [{ id: "region-boon", label: this.explorationBonus.label, detail: "Recovered from prior sweep", tone: "boon" }]
        : [],
      sessionState: {
        explorationBonus: this.explorationBonus,
        combatSnapshot: this.combatSnapshot
      },
      combatFeed: [
        { id: 1, message: `Exploration boon: ${bonusText}` },
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

  update() {
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
    } else if (insideGate) {
      this.poiPrompt = "Press E to enter the dungeon";
    } else {
      this.poiPrompt = "Explore the block, read the nodes, then approach the gate";
    }

    this.promptText.setText(this.poiPrompt);

    if (nearestPoint && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.claimPointOfInterest(nearestPoint);
      return;
    }

    if (insideGate && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      emitSoundEvent({ type: "skill_cast" });
      emitTransitionUpdate({
        active: true,
        label: "Dungeon ingress",
        detail: "Dropping into the Shatter Dungeon..."
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
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.returnKey)) {
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
  }
}

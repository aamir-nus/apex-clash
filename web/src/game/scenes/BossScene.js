import Phaser from "phaser";
import {
  emitInventoryReward,
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

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

export class BossScene extends Phaser.Scene {
  constructor() {
    super("BossScene");
    this.playerState = null;
    this.player = null;
    this.boss = null;
    this.cursors = null;
    this.actionKeys = null;
    this.skillKeys = null;
    this.returnKey = null;
    this.bossHp = 120;
    this.currentRegionId = "shatter_boss_vault";
    this.isTransitioning = false;
    this.rewardClaimed = false;
    this.explorationBonus = null;
    this.sanctumGuard = 0;
    this.sanctumWindowOpen = false;
    this.lastSanctumWindowOpen = false;
    this.sanctumCycleMs = 2600;
    this.sanctumOpenMs = 950;
    this.cinderWindowOpen = false;
    this.lastCinderWindowOpen = false;
    this.cinderCycleMs = 1900;
    this.cinderOpenMs = 800;
    this.cinderBacklashHp = 5;
    this.cinderBacklashCe = 8;
    this.signatureActive = false;
    this.lastSignatureActive = false;
    this.signatureCycleMs = 3600;
    this.signatureOpenMs = 900;
    this.signatureTickCooldown = 0;
    this.unsubscribeControlCommands = null;
    this.bossMarker = null;
    this.signatureLane = null;
    this.bossDangerWash = null;
  }

  create() {
    const loadedPlayerState = this.registry.get("loadedPlayerState");
    this.currentRegionId = this.registry.get("currentRegionId") ?? "shatter_boss_vault";
    this.explorationBonus = this.registry.get("explorationBonus") ?? null;
    this.isTransitioning = false;
    this.input.keyboard.resetKeys();
    const loadedSessionSummary = this.registry.get("loadedSessionSummary") ?? null;
    const loadedSessionState = loadedSessionSummary?.sessionState ?? {};
    const profile = this.registry.get("playerProfile");
    this.playerState = loadedPlayerState
      ? cloneState(loadedPlayerState)
      : {
          hp: profile?.computedStats?.hp ?? 100,
          maxHp: profile?.computedStats?.hp ?? 100,
          ce: profile?.computedStats?.ce ?? 60,
          maxCe: profile?.computedStats?.ce ?? 60,
          level: profile?.level ?? 1,
          xp: 0,
          xpToNextLevel: 30,
          attack: profile?.computedStats?.attack ?? 10,
          defense: profile?.computedStats?.defense ?? 8,
          speed: profile?.computedStats?.speed ?? 10,
          pendingStatPoints: 0,
          archetype: profile?.classType ?? "sorcerer"
        };
    this.bossHp = loadedSessionState.bossHp ?? 120;
    this.rewardClaimed = Boolean(loadedSessionState.bossRewardClaimed);
    const isVeilBoss = this.currentRegionId === "veil_boss_vault";
    const isCinderBoss = this.currentRegionId === "cinder_boss_vault";
    const boonKind = this.explorationBonus?.kind ?? "none";
    const baseGuard = boonKind === "technique" ? 34 : boonKind === "pressure" ? 42 : 48;
    this.sanctumCycleMs = boonKind === "pressure" ? 2200 : 2600;
    this.sanctumOpenMs = boonKind === "pressure" ? 1200 : 950;
    this.sanctumGuard = loadedSessionState.sanctumGuard ?? (isVeilBoss ? baseGuard : 0);
    this.sanctumWindowOpen = Boolean(loadedSessionState.sanctumWindowOpen);
    this.lastSanctumWindowOpen = this.sanctumWindowOpen;
    this.cinderCycleMs = boonKind === "pressure" ? 1600 : 1900;
    this.cinderOpenMs = boonKind === "pressure" ? 1000 : 800;
    this.cinderBacklashHp = boonKind === "recovery" ? 3 : 5;
    this.cinderBacklashCe = boonKind === "recovery" ? 4 : 8;
    this.cinderWindowOpen = Boolean(loadedSessionState.cinderWindowOpen);
    this.lastCinderWindowOpen = this.cinderWindowOpen;
    this.signatureActive = Boolean(loadedSessionState.signatureActive);
    this.lastSignatureActive = this.signatureActive;
    this.signatureTickCooldown = 0;
    this.registry.set("loadedPlayerState", null);
    this.registry.set("loadedSessionSummary", null);

    this.add.rectangle(arena.width / 2, arena.height / 2, arena.width, arena.height, isVeilBoss ? 0x171126 : isCinderBoss ? 0x24120d : 0x120b12);
    this.add.rectangle(arena.width / 2, arena.height / 2, 820, 400, isVeilBoss ? 0x2e1e44 : isCinderBoss ? 0x3a1d13 : 0x24131d, 1).setStrokeStyle(2, isVeilBoss ? 0xf0d2ff : isCinderBoss ? 0xffc27a : 0xff8f70);
    this.add
      .line(0, 0, 480, 110, 480, 430, isVeilBoss ? 0xf0d2ff : isCinderBoss ? 0xffb36b : 0xff8f70, 0.14)
      .setOrigin(0, 0)
      .setLineWidth(6);
    this.signatureLane = this.add
      .rectangle(480, 270, 124, 260, isVeilBoss ? 0xc77dff : isCinderBoss ? 0xff8a5b : 0xf25f5c, 0.06)
      .setStrokeStyle(1, 0xf6f1df, 0.12);
    this.add.text(434, 122, "Danger lane", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "12px"
    });
    this.bossDangerWash = this.add.rectangle(
      arena.width / 2,
      arena.height / 2,
      820,
      400,
      isVeilBoss ? 0xc77dff : isCinderBoss ? 0xff8a5b : 0xf25f5c,
      0
    );
    this.add.text(100, 84, isVeilBoss ? "Sanctum Vault" : isCinderBoss ? "Cinder Vault" : "Boss Vault", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "28px"
    });
    this.add.text(100, 124, isVeilBoss ? "Defeat the sanctum curse, then extract to Blacksite." : isCinderBoss ? "Break the furnace core, then extract to Blacksite." : "Defeat the vault curse, then extract to Blacksite.", {
      color: "#d9e7d2",
      fontFamily: "monospace",
      fontSize: "16px"
    });

    this.player = this.add.rectangle(180, 270, 24, 24, 0x3ddc97);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.setStrokeStyle(2, 0xf6f1df);

    this.boss = this.add.rectangle(700, 270, 42, 42, 0xf25f5c);
    this.physics.add.existing(this.boss);
    this.boss.body.setImmovable(true);
    this.boss.setStrokeStyle(3, 0xffd98b);
    this.bossMarker = this.add.text(692, 214, "v", {
      color: "#ffd98b",
      fontFamily: "monospace",
      fontSize: "28px"
    });
    this.tweens.add({
      targets: this.bossMarker,
      y: 202,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.add
      .circle(700, 270, 68, isVeilBoss ? 0xf0d2ff : isCinderBoss ? 0xffb36b : 0xff8f70, 0.06)
      .setStrokeStyle(2, 0xf6f1df, 0.16);
    this.add.text(648, 352, isVeilBoss ? "Rupture zone" : isCinderBoss ? "Heat bloom" : "Punish zone", {
      color: "#c6d2dc",
      fontFamily: "monospace",
      fontSize: "12px"
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.actionKeys = this.input.keyboard.addKeys("W,A,S,D");
    this.skillKeys = this.input.keyboard.addKeys("J,Q,R");
    this.returnKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);

    this.emitBossRuntime();
    this.unsubscribeControlCommands = subscribeToControlCommands((command) => {
      if (command?.scene !== "boss" || this.isTransitioning) {
        return;
      }

      if (command.type === "attack-boss") {
        this.attackBoss();
      }

      if (command.type === "extract") {
        this.extractToHub();
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeControlCommands?.();
      this.unsubscribeControlCommands = null;
    });
    emitSceneUpdate({
      scene: "boss",
      label: "Boss Vault"
    });
  }

  syncProfile(profile) {
    if (!profile || !this.playerState) {
      return;
    }

    this.registry.set("playerProfile", profile);
    const stats = profile.computedStats ?? {};
    const hpRatio = this.playerState.maxHp ? this.playerState.hp / this.playerState.maxHp : 1;
    const ceRatio = this.playerState.maxCe ? this.playerState.ce / this.playerState.maxCe : 1;
    this.playerState.level = profile.level ?? this.playerState.level;
    this.playerState.xp = profile.xp ?? this.playerState.xp;
    this.playerState.xpToNextLevel = profile.xpToNextLevel ?? this.playerState.xpToNextLevel;
    this.playerState.pendingStatPoints =
      profile.pendingStatPoints ?? this.playerState.pendingStatPoints;
    this.playerState.maxHp = stats.hp ?? this.playerState.maxHp;
    this.playerState.hp = Math.max(1, Math.round(this.playerState.maxHp * hpRatio));
    this.playerState.maxCe = stats.ce ?? this.playerState.maxCe;
    this.playerState.ce = Math.max(0, Math.round(this.playerState.maxCe * ceRatio));
    this.playerState.attack = stats.attack ?? this.playerState.attack;
    this.playerState.defense = stats.defense ?? this.playerState.defense;
    this.playerState.speed = stats.speed ?? this.playerState.speed;
    this.playerState.archetype = profile.classType ?? this.playerState.archetype;
    this.emitBossRuntime();
  }

  emitBossRuntime() {
    const resumeSource = this.registry.get("resumeSource") ?? "fresh-start";
    const isVeilBoss = this.currentRegionId === "veil_boss_vault";
    const isCinderBoss = this.currentRegionId === "cinder_boss_vault";
    this.bossMarker?.setVisible(this.bossHp > 0);
    const unlockedRegionIds =
      this.bossHp === 0 && this.currentRegionId === "shatter_boss_vault"
        ? [...new Set([...(this.registry.get("playerProfile")?.unlockedRegionIds ?? ["shatter_block"]), "veil_shrine"])]
        : this.bossHp === 0 && this.currentRegionId === "veil_boss_vault"
          ? [...new Set([...(this.registry.get("playerProfile")?.unlockedRegionIds ?? ["shatter_block"]), "veil_shrine", "cinder_ward"])]
          : this.registry.get("playerProfile")?.unlockedRegionIds ?? ["shatter_block"];
    emitRuntimeUpdate({
      scene: {
        scene: "boss",
        label: "Boss Vault"
      },
      regionId: this.currentRegionId,
      player: this.playerState,
      controls: [
        { key: "WASD", label: "Move" },
        { key: "J / Q / R", label: "Pressure boss" },
        { key: "H", label: "Extract after clear" }
      ],
      cooldowns: [],
      resumeSource,
      objective: {
        title: this.bossHp > 0 ? "Break the boss pattern" : "Extract with the clear",
        detail:
          this.bossHp > 0
            ? this.signatureActive
              ? "Respect the signature field, then punish the active vulnerability cycle."
              : "Read the boss cycle and save your commit for the safe window."
            : "Return to Blacksite and carry the unlock forward.",
        step:
          this.bossHp > 0
            ? "Move off the danger lane, then strike on rupture / cooling windows"
            : "Press H to extract"
      },
      castState: {
        phase: "boss",
        label: isVeilBoss
          ? this.bossHp === 0
            ? "Sanctum collapsed"
            : this.sanctumGuard > 0
              ? `Sanctum guard ${this.sanctumGuard}`
              : this.sanctumWindowOpen
                ? `Rupture window · HP ${this.bossHp}`
                : "Sanctum pulse cycling"
          : isCinderBoss
            ? this.bossHp === 0
              ? "Core extinguished"
              : this.cinderWindowOpen
                ? `Cooling breach · HP ${this.bossHp}`
                : "Furnace overdrive"
          : `Boss HP ${this.bossHp}`,
        progress: isVeilBoss
          ? this.sanctumGuard > 0
            ? Math.max(0, Math.min(1, 1 - this.sanctumGuard / 48))
            : Math.max(0, Math.min(1, 1 - this.bossHp / 120))
          : isCinderBoss
            ? this.cinderWindowOpen
              ? 1
              : 0.2
          : Math.max(0, Math.min(1, 1 - this.bossHp / 120))
      },
      activeEffects: [
        {
          id: "boss-room",
          label: isVeilBoss ? "Sanctum curse" : isCinderBoss ? "Furnace curse" : "Vault curse",
          detail: "Final chamber active",
          tone: "danger"
        },
        ...(isVeilBoss
          ? [
              ...(this.explorationBonus
                ? [
                    {
                      id: "veil-boss-boon",
                      label: this.explorationBonus.label,
                      detail:
                        this.explorationBonus.kind === "technique"
                          ? "Reduced sanctum guard"
                          : this.explorationBonus.kind === "pressure"
                            ? "Longer rupture window"
                            : "Mitigated backlash",
                      tone: "boon"
                    }
                  ]
                : []),
              {
                id: "veil-boss-cycle",
                label: this.sanctumWindowOpen ? "Rupture window" : "Sanctum sealed",
                detail:
                  this.sanctumGuard > 0
                    ? "Strip the guard before the curse opens"
                    : this.sanctumWindowOpen
                      ? "Boss is vulnerable now"
                      : "Wait for the next rupture pulse",
                tone: this.sanctumWindowOpen ? "boon" : "danger"
              }
            ]
          : []),
        ...(isCinderBoss
          ? [
              ...(this.explorationBonus
                ? [
                    {
                      id: "cinder-boss-boon",
                      label: this.explorationBonus.label,
                      detail:
                        this.explorationBonus.kind === "pressure"
                          ? "Longer cooling breaches"
                          : this.explorationBonus.kind === "recovery"
                            ? "Reduced burn backlash"
                            : "Sharper breach tempo",
                      tone: "boon"
                    }
                  ]
                : []),
              {
                id: "cinder-boss-cycle",
                label: this.cinderWindowOpen ? "Cooling breach" : "Furnace overdrive",
                detail: this.cinderWindowOpen
                  ? "Drive damage into the exposed core"
                  : "Mistimed hits trigger severe burn backlash",
                tone: this.cinderWindowOpen ? "boon" : "danger"
              }
            ]
          : []),
        ...(this.bossHp > 0
          ? [
              {
                id: "boss-signature",
                label: this.signatureActive ? "Signature field" : "Signature charge",
                detail: this.signatureActive
                  ? "Leave the centerline or absorb technique pressure"
                  : "A signature cast is building",
                tone: this.signatureActive ? "danger" : "neutral"
              }
            ]
          : [])
      ],
      sessionState: {
        bossHp: this.bossHp,
        bossCleared: this.bossHp === 0,
        bossRewardClaimed: this.rewardClaimed,
        clearedBossRegionId: this.bossHp === 0 ? this.currentRegionId : null,
        sanctumGuard: isVeilBoss ? this.sanctumGuard : undefined,
        sanctumWindowOpen: isVeilBoss ? this.sanctumWindowOpen : undefined,
        cinderWindowOpen: isCinderBoss ? this.cinderWindowOpen : undefined,
        signatureActive: this.signatureActive,
        unlockedRegionIds
      },
      levelUp: {
        available: false,
        options: []
      },
      combatFeed: [
        {
          id: 1,
          message:
            this.bossHp > 0
              ? isVeilBoss
                ? this.sanctumGuard > 0
                  ? "Strip the sanctum guard, then wait for a rupture window."
                  : this.sanctumWindowOpen
                    ? "Rupture window open. Burn the curse down."
                    : "Sanctum resealed. Reposition before the next pulse."
                : isCinderBoss
                  ? this.cinderWindowOpen
                    ? "Cooling breach open. Burn the furnace core now."
                    : "Furnace overdrive active. Wait or eat backlash."
                : "Break the vault curse to finish the dungeon slice."
              : this.currentRegionId === "shatter_boss_vault"
                ? "Boss down. Veil Shrine unlocked. Press H to extract."
                : this.currentRegionId === "veil_boss_vault"
                  ? "Boss down. Cinder Ward unlocked. Press H to extract."
                : "Boss down. Press H to extract."
        }
      ],
      encounter: {
        enemiesRemaining: this.bossHp > 0 ? 1 : 0,
        status: this.bossHp > 0 ? "Boss encounter" : "Boss cleared"
      }
    });
  }

  attackBoss() {
    if (this.bossHp <= 0) {
      return;
    }

    const isVeilBoss = this.currentRegionId === "veil_boss_vault";
    const isCinderBoss = this.currentRegionId === "cinder_boss_vault";
    const damage = Math.max(8, Math.floor(this.playerState.attack * 0.9));
    this.player.setPosition(this.boss.x - 80, this.boss.y);

    if (isVeilBoss && this.sanctumGuard > 0) {
      const guardBreak = Math.max(10, Math.floor(damage * 0.8));
      this.sanctumGuard = Math.max(0, this.sanctumGuard - guardBreak);
      emitSoundEvent({ type: this.sanctumGuard === 0 ? "enemy_down" : "skill_cast" });
      this.emitBossRuntime();
      return;
    }

    if (isVeilBoss && !this.sanctumWindowOpen) {
      this.playerState.ce = Math.max(0, this.playerState.ce - 10);
      this.playerState.hp = Math.max(1, this.playerState.hp - 6);
      emitSoundEvent({ type: "danger" });
      this.emitBossRuntime();
      return;
    }

    if (isCinderBoss && !this.cinderWindowOpen) {
      this.playerState.ce = Math.max(0, this.playerState.ce - this.cinderBacklashCe);
      this.playerState.hp = Math.max(1, this.playerState.hp - this.cinderBacklashHp);
      this.bossHp = Math.max(0, this.bossHp - Math.max(4, Math.floor(damage * 0.25)));
      this.handleBossRewardClaim();
      emitSoundEvent({ type: "danger" });
      this.emitBossRuntime();
      return;
    }

    if (this.signatureActive) {
      this.playerState.hp = Math.max(1, this.playerState.hp - 5);
      this.playerState.ce = Math.max(0, this.playerState.ce - 4);
      emitSoundEvent({ type: "danger" });
      this.emitBossRuntime();
      return;
    }

    this.bossHp = Math.max(0, this.bossHp - damage);
    this.handleBossRewardClaim();
    emitSoundEvent({ type: this.bossHp === 0 ? "enemy_down" : "skill_cast" });
    this.emitBossRuntime();
  }

  handleBossRewardClaim() {
    if (this.bossHp !== 0 || this.rewardClaimed) {
      return;
    }

    this.rewardClaimed = true;
    if (this.currentRegionId === "veil_boss_vault") {
      emitInventoryReward({
        rewardSource: "veil_boss_scroll",
        regionId: this.currentRegionId,
        sessionState: {
          clearedBossRegionId: this.currentRegionId
        }
      });
    }
    if (this.currentRegionId === "cinder_boss_vault") {
      emitInventoryReward({
        rewardSource: "cinder_boss_core",
        regionId: this.currentRegionId,
        sessionState: {
          clearedBossRegionId: this.currentRegionId
        }
      });
    }
  }

  extractToHub() {
    if (this.bossHp > 0 || this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    const unlockedRegionIds =
      this.currentRegionId === "shatter_boss_vault"
        ? [...new Set([...(this.registry.get("playerProfile")?.unlockedRegionIds ?? ["shatter_block"]), "veil_shrine"])]
        : this.currentRegionId === "veil_boss_vault"
          ? [...new Set([...(this.registry.get("playerProfile")?.unlockedRegionIds ?? ["shatter_block"]), "veil_shrine", "cinder_ward"])]
          : this.registry.get("playerProfile")?.unlockedRegionIds ?? ["shatter_block"];
    const clearedRegionId =
      this.currentRegionId === "shatter_boss_vault"
        ? "shatter_block"
        : this.currentRegionId === "veil_boss_vault"
          ? "veil_shrine"
          : this.currentRegionId === "cinder_boss_vault"
            ? "cinder_ward"
            : null;
    const clearedRegionIds = [
      ...new Set([
        ...(this.registry.get("playerProfile")?.clearedRegionIds ?? []),
        ...(clearedRegionId ? [clearedRegionId] : [])
      ])
    ];
    this.registry.set("explorationBonus", null);
    this.registry.set("combatSnapshot", null);
    this.registry.set("loadedPlayerState", {
      ...this.playerState,
      xp: this.playerState.xp + 30,
      regionId: "hub_blacksite"
    });
    this.registry.set("loadedSessionSummary", {
      enemiesRemaining: 0,
      combatFeed: [],
      sessionState: {
        bossCleared: true,
        clearedBossRegionId: this.currentRegionId,
        unlockedRegionIds,
        clearedRegionIds
      }
    });
    const profile = this.registry.get("playerProfile");
    if (profile) {
      this.registry.set("playerProfile", {
        ...profile,
        currentRegionId: "hub_blacksite",
        unlockedRegionIds,
        clearedRegionIds
      });
    }
    this.registry.set("currentRegionId", "hub_blacksite");
    emitTransitionUpdate({
      active: true,
      label: "Dungeon clear",
      detail: "Extracting to Blacksite with recovered progress..."
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

  update(_time, delta) {
    if (this.isTransitioning) {
      return;
    }

    const velocity = 165;
    this.player.body.setVelocity(0, 0);
    if (this.cursors.left.isDown || this.actionKeys.A.isDown) this.player.body.setVelocityX(-velocity);
    if (this.cursors.right.isDown || this.actionKeys.D.isDown) this.player.body.setVelocityX(velocity);
    if (this.cursors.up.isDown || this.actionKeys.W.isDown) this.player.body.setVelocityY(-velocity);
    if (this.cursors.down.isDown || this.actionKeys.S.isDown) this.player.body.setVelocityY(velocity);
    this.player.body.velocity.normalize().scale(velocity);

    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
    const attacking =
      Phaser.Input.Keyboard.JustDown(this.skillKeys.J) ||
      Phaser.Input.Keyboard.JustDown(this.skillKeys.Q) ||
      Phaser.Input.Keyboard.JustDown(this.skillKeys.R);
    const isVeilBoss = this.currentRegionId === "veil_boss_vault";
    const isCinderBoss = this.currentRegionId === "cinder_boss_vault";

    if (isVeilBoss && this.bossHp > 0) {
      const cyclePosition = this.time.now % this.sanctumCycleMs;
      this.sanctumWindowOpen =
        this.sanctumGuard <= 0 && cyclePosition >= this.sanctumCycleMs - this.sanctumOpenMs;
      if (this.sanctumWindowOpen !== this.lastSanctumWindowOpen) {
        this.lastSanctumWindowOpen = this.sanctumWindowOpen;
        emitSoundEvent({ type: this.sanctumWindowOpen ? "enemy_down" : "danger" });
        this.emitBossRuntime();
      }
    }

    if (isCinderBoss && this.bossHp > 0) {
      const cyclePosition = this.time.now % this.cinderCycleMs;
      this.cinderWindowOpen = cyclePosition >= this.cinderCycleMs - this.cinderOpenMs;
      if (this.cinderWindowOpen !== this.lastCinderWindowOpen) {
        this.lastCinderWindowOpen = this.cinderWindowOpen;
        emitSoundEvent({ type: this.cinderWindowOpen ? "enemy_down" : "danger" });
        this.emitBossRuntime();
      }
    }

    if (this.bossHp > 0) {
      const cyclePosition = this.time.now % this.signatureCycleMs;
      this.signatureActive = cyclePosition >= this.signatureCycleMs - this.signatureOpenMs;
      if (this.signatureActive !== this.lastSignatureActive) {
        this.lastSignatureActive = this.signatureActive;
        emitSoundEvent({ type: this.signatureActive ? "danger" : "skill_cast" });
        this.bossMarker.setColor(this.signatureActive ? "#ff8f70" : "#ffd98b");
        this.emitBossRuntime();
      }
    } else {
      this.signatureActive = false;
    }

    this.signatureLane.setAlpha(this.signatureActive ? 0.18 : 0.06);
    this.bossDangerWash.setAlpha(this.signatureActive ? 0.06 : 0);

    this.signatureTickCooldown = Math.max(0, this.signatureTickCooldown - delta / 1000);
    if (this.bossHp > 0 && this.signatureActive) {
      const axisDistance = Math.abs(this.player.y - this.boss.y);
      const centerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
      if (axisDistance < 48 && centerDistance < 240 && this.signatureTickCooldown === 0) {
        this.signatureTickCooldown = 0.5;
        this.playerState.hp = Math.max(1, this.playerState.hp - 7);
        this.playerState.ce = Math.max(0, this.playerState.ce - 5);
        emitSoundEvent({ type: "danger" });
        this.emitBossRuntime();
      }
    }

    if (this.bossHp > 0 && attacking && distance < 160) {
      this.attackBoss();
    }

    if (this.bossHp === 0 && Phaser.Input.Keyboard.JustDown(this.returnKey)) {
      this.extractToHub();
    }
  }
}

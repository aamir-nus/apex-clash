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

export class DungeonScene extends Phaser.Scene {
  constructor() {
    super("DungeonScene");
    this.player = null;
    this.cursors = null;
    this.actionKeys = null;
    this.returnKey = null;
    this.interactKey = null;
    this.playerProfile = null;
    this.selectedArchetype = "close_combat";
    this.relicNode = null;
    this.miniboss = null;
    this.bossGate = null;
    this.promptText = null;
    this.relicClaimed = false;
    this.minibossDefeated = false;
    this.minibossHp = 0;
    this.playerState = null;
    this.skillKeys = null;
    this.currentRegionId = "shatter_dungeon";
    this.isTransitioning = false;
    this.explorationBonus = null;
    this.sanctumShield = 0;
    this.sanctumWindowOpen = false;
    this.lastSanctumWindowOpen = false;
    this.sanctumCycleMs = 2200;
    this.sanctumOpenMs = 900;
    this.cinderWindowOpen = false;
    this.lastCinderWindowOpen = false;
    this.cinderCycleMs = 1800;
    this.cinderOpenMs = 700;
    this.cinderBacklashHp = 4;
    this.cinderBacklashCe = 6;
    this.unsubscribeControlCommands = null;
    this.relicMarker = null;
    this.minibossMarker = null;
    this.vaultMarker = null;
  }

  create() {
    this.playerProfile = this.registry.get("playerProfile") ?? null;
    this.currentRegionId = this.registry.get("currentRegionId") ?? "shatter_dungeon";
    this.selectedArchetype = this.registry.get("selectedArchetype") ?? "close_combat";
    this.explorationBonus = this.registry.get("explorationBonus") ?? null;
    this.isTransitioning = false;
    this.input.keyboard.resetKeys();
    const loadedPlayerState = this.registry.get("loadedPlayerState");
    const loadedSessionSummary = this.registry.get("loadedSessionSummary") ?? null;
    const loadedSessionState = loadedSessionSummary?.sessionState ?? {};
    this.playerState = loadedPlayerState
      ? cloneState(loadedPlayerState)
      : {
          hp: this.playerProfile?.computedStats?.hp ?? 100,
          maxHp: this.playerProfile?.computedStats?.hp ?? 100,
          ce: this.playerProfile?.computedStats?.ce ?? 60,
          maxCe: this.playerProfile?.computedStats?.ce ?? 60,
          level: this.playerProfile?.level ?? 1,
          xp: 0,
          xpToNextLevel: 30,
          attack: this.playerProfile?.computedStats?.attack ?? 10,
          defense: this.playerProfile?.computedStats?.defense ?? 8,
          speed: this.playerProfile?.computedStats?.speed ?? 10,
          pendingStatPoints: 0,
          archetype: this.playerProfile?.classType ?? this.selectedArchetype
        };
    this.relicClaimed = Boolean(loadedSessionState.dungeonRelicClaimed);
    this.minibossDefeated = Boolean(loadedSessionState.dungeonMinibossDefeated);
    const isVeilDungeon = this.currentRegionId === "veil_dungeon";
    const isCinderDungeon = this.currentRegionId === "cinder_dungeon";
    const boonKind = this.explorationBonus?.kind ?? "none";
    const baseSanctumShield =
      boonKind === "technique" ? 24 : boonKind === "pressure" ? 30 : 36;
    this.sanctumCycleMs = boonKind === "pressure" ? 2000 : 2200;
    this.sanctumOpenMs = boonKind === "pressure" ? 1100 : 900;
    this.minibossHp = loadedSessionState.dungeonMinibossHp ?? (isVeilDungeon ? 92 : 72);
    if (isCinderDungeon) {
      this.minibossHp = loadedSessionState.dungeonMinibossHp ?? 84;
      this.cinderCycleMs = boonKind === "pressure" ? 1500 : 1800;
      this.cinderOpenMs = boonKind === "pressure" ? 900 : 700;
      this.cinderBacklashHp = boonKind === "recovery" ? 2 : 4;
      this.cinderBacklashCe = boonKind === "recovery" ? 3 : 6;
    }
    this.sanctumShield = loadedSessionState.sanctumShield ?? (isVeilDungeon ? baseSanctumShield : 0);
    this.sanctumWindowOpen = Boolean(loadedSessionState.sanctumWindowOpen);
    this.lastSanctumWindowOpen = this.sanctumWindowOpen;
    this.cinderWindowOpen = Boolean(loadedSessionState.cinderWindowOpen);
    this.lastCinderWindowOpen = this.cinderWindowOpen;
    this.registry.set("loadedPlayerState", null);
    this.registry.set("loadedSessionSummary", null);

    this.add.rectangle(arena.width / 2, arena.height / 2, arena.width, arena.height, isVeilDungeon ? 0x100d18 : isCinderDungeon ? 0x1a0f0c : 0x0c1218);
    this.add.rectangle(arena.width / 2, arena.height / 2, 820, 400, isVeilDungeon ? 0x20192b : isCinderDungeon ? 0x2d1811 : 0x171f29, 1).setStrokeStyle(2, isVeilDungeon ? 0xe2b6ff : isCinderDungeon ? 0xffb36b : 0x8fb9ff);
    this.add.rectangle(300, 270, 160, 220, isVeilDungeon ? 0x1e2038 : isCinderDungeon ? 0x3a1e16 : 0x13283a, 0.22).setStrokeStyle(1, isVeilDungeon ? 0xd4b5ff : isCinderDungeon ? 0xff995a : 0x74c0fc);
    this.add.rectangle(488, 270, 140, 180, isVeilDungeon ? 0x203126 : isCinderDungeon ? 0x3f281a : 0x2a1626, 0.2).setStrokeStyle(1, isVeilDungeon ? 0x87e0c2 : isCinderDungeon ? 0xffd08a : 0xe56b6f);
    this.add.rectangle(660, 270, 180, 220, isVeilDungeon ? 0x341a3c : isCinderDungeon ? 0x472016 : 0x28161c, 0.22).setStrokeStyle(1, isVeilDungeon ? 0xffc9f5 : isCinderDungeon ? 0xff8a5b : 0xff8f70);
    this.add.line(0, 0, 308, 270, 690, 270, 0xf6f1df, 0.18).setOrigin(0, 0).setLineWidth(2);
    this.add.text(260, 176, isVeilDungeon ? "Sigil chamber" : isCinderDungeon ? "Core chamber" : "Relic chamber", {
      color: "#c6d2dc",
      fontFamily: "monospace",
      fontSize: "12px"
    });
    this.add.text(446, 176, "Sentinel lock", {
      color: "#ffd98b",
      fontFamily: "monospace",
      fontSize: "12px"
    });
    this.add.text(626, 176, "Vault gate", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "12px"
    });

    this.add.text(100, 86, isVeilDungeon ? "Veil Depth" : isCinderDungeon ? "Furnace Descent" : "Shatter Dungeon", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "28px"
    });

    this.add.text(
      100,
      128,
      isVeilDungeon
        ? "Secure the shrine sigil, defeat the veil sentinel, then push into the sanctum vault.\nThis is the second authored route toward the v3 bar."
        : isCinderDungeon
          ? "Stabilize the ember core, force open burn windows, then descend into the cinder vault.\nThis is the third authored route toward the v3 bar."
        : "Claim the relic shard, defeat the miniboss sentinel, then push into the boss vault.\nThis is the first authored dungeon chain for demo flow.",
      {
        color: "#d9e7d2",
        fontFamily: "monospace",
        fontSize: "16px",
        lineSpacing: 8
      }
    );

    this.promptText = this.add.text(520, 120, "", {
      color: "#ffd98b",
      fontFamily: "monospace",
      fontSize: "14px"
    });

    this.player = this.add.rectangle(180, 270, 24, 24, 0x3ddc97);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.setStrokeStyle(2, 0xf6f1df);

    this.relicNode = this.add.circle(308, 270, 18, 0x74c0fc, 0.75).setStrokeStyle(2, 0xf6f1df);
    this.relicNode.pulseTween = this.tweens.add({
      targets: this.relicNode,
      scaleX: 1.18,
      scaleY: 1.18,
      alpha: 1,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.bossGate = this.add.rectangle(690, 270, 72, 120, 0xf25f5c, 0.2).setStrokeStyle(2, 0xff8f70);
    this.miniboss = this.add.rectangle(490, 270, 34, 34, 0xe56b6f, this.relicClaimed ? 0.8 : 0.18);
    this.miniboss.setStrokeStyle(2, 0xffd6a5);
    this.minibossPulse = this.tweens.add({
      targets: this.miniboss,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    if (this.relicClaimed) {
      this.relicNode.pulseTween?.stop();
      this.relicNode.setFillStyle(0x5a5a5a, 0.28);
    }
    if (this.minibossDefeated) {
      this.miniboss.setFillStyle(0x5a5a5a, 0.28);
      this.minibossPulse?.stop();
    }
    this.relicMarker = this.add.text(300, 222, "v", {
      color: "#74c0fc",
      fontFamily: "monospace",
      fontSize: "28px"
    });
    this.minibossMarker = this.add.text(482, 220, "v", {
      color: "#ffd98b",
      fontFamily: "monospace",
      fontSize: "28px"
    });
    this.vaultMarker = this.add.text(682, 214, "v", {
      color: "#ff8f70",
      fontFamily: "monospace",
      fontSize: "28px"
    });
    [this.relicMarker, this.minibossMarker, this.vaultMarker].forEach((marker) => {
      this.tweens.add({
        targets: marker,
        y: marker.y - 12,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    });
    this.add.text(626, 344, this.minibossDefeated ? "Vault open" : "Vault sealed", {
      color: this.minibossDefeated ? "#b8f29b" : "#ffb4a2",
      fontFamily: "monospace",
      fontSize: "12px"
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.actionKeys = this.input.keyboard.addKeys("W,A,S,D");
    this.skillKeys = this.input.keyboard.addKeys("J,Q,R");
    this.returnKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.emitDungeonRuntime();
    this.unsubscribeControlCommands = subscribeToControlCommands((command) => {
      if (command?.scene !== "dungeon" || this.isTransitioning) {
        return;
      }

      if (command.type === "claim-relic") {
        this.claimRelic();
      }

      if (command.type === "attack-miniboss") {
        this.attackMiniboss();
      }

      if (command.type === "enter-boss-vault") {
        this.enterBossVault();
      }

      if (command.type === "return-region") {
        this.returnToRegion();
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeControlCommands?.();
      this.unsubscribeControlCommands = null;
    });
    emitSceneUpdate({
      scene: "dungeon",
      label: "Dungeon"
    });
  }

  syncProfile(profile) {
    if (!profile || !this.playerState) {
      return;
    }

    this.playerProfile = profile;
    this.registry.set("playerProfile", profile);
    this.selectedArchetype = profile.classType ?? this.selectedArchetype;
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
    this.emitDungeonRuntime();
  }

  emitDungeonRuntime() {
    const resumeSource = this.registry.get("resumeSource") ?? "fresh-start";
    const isVeilDungeon = this.currentRegionId === "veil_dungeon";
    const isCinderDungeon = this.currentRegionId === "cinder_dungeon";
    emitRuntimeUpdate({
      scene: {
        scene: "dungeon",
        label: "Dungeon"
      },
      regionId: this.currentRegionId,
      player: this.playerState,
      controls: [
        { key: "WASD", label: "Move" },
        { key: "E", label: "Claim relic / enter boss vault" },
        { key: "J / Q / R", label: "Pressure miniboss" },
        { key: "H", label: "Return to region" }
      ],
      cooldowns: [],
      resumeSource,
      castState: {
        phase: "idle",
        label: this.minibossDefeated
          ? "Boss vault unlocked"
          : this.relicClaimed
            ? isVeilDungeon
              ? this.sanctumShield > 0
                ? `Sanctum shield ${this.sanctumShield}`
                : this.sanctumWindowOpen
                  ? `Fracture window · HP ${this.minibossHp}`
                  : "Sentinel sealed"
              : isCinderDungeon
                ? this.cinderWindowOpen
                  ? `Cooling window · HP ${this.minibossHp}`
                  : "Furnace surge active"
              : `Miniboss HP ${this.minibossHp}`
            : isVeilDungeon
              ? "Sigil search active"
              : isCinderDungeon
                ? "Core search active"
              : "Relic search active",
        progress: isVeilDungeon && this.relicClaimed && !this.minibossDefeated
          ? this.sanctumShield > 0
            ? Math.max(0, Math.min(1, 1 - this.sanctumShield / 36))
            : this.sanctumWindowOpen
              ? 1
              : 0.25
          : isCinderDungeon && this.relicClaimed && !this.minibossDefeated
            ? this.cinderWindowOpen
              ? 1
              : 0.2
          : 0
      },
      activeEffects: this.relicClaimed
        ? [
            {
              id: "dungeon-relic",
              label: isVeilDungeon ? "Shrine sigil" : "Relic shard",
              detail: "Miniboss chamber opened",
              tone: "boon"
            },
            ...(this.minibossDefeated
              ? [{ id: "dungeon-miniboss", label: "Sentinel broken", detail: "Boss vault key acquired", tone: "boon" }]
              : [
                  {
                    id: "dungeon-miniboss",
                    label: "Sentinel active",
                    detail: isVeilDungeon ? "Break the sanctum guardian" : "Break the chamber guardian",
                    tone: "danger"
                  }
                ]),
            ...(isVeilDungeon && !this.minibossDefeated
              ? [
                  ...(this.explorationBonus
                    ? [
                        {
                          id: "dungeon-boon",
                          label: this.explorationBonus.label,
                          detail:
                            this.explorationBonus.kind === "technique"
                              ? "Reduced sanctum shield"
                              : this.explorationBonus.kind === "pressure"
                                ? "Longer fracture windows"
                                : "Sustain against seal backlash",
                          tone: "boon"
                        }
                      ]
                    : []),
                  {
                    id: "sanctum-cycle",
                    label: this.sanctumWindowOpen ? "Fracture window" : "Sanctum sealed",
                    detail:
                      this.sanctumShield > 0
                        ? "Strip the violet shield first"
                        : this.sanctumWindowOpen
                          ? "Sentinel is vulnerable"
                          : "Hold and strike on the fracture pulse",
                    tone: this.sanctumWindowOpen ? "boon" : "danger"
                  }
                ]
              : []),
            ...(isCinderDungeon && !this.minibossDefeated
              ? [
                  {
                    id: "cinder-cycle",
                    label: this.cinderWindowOpen ? "Cooling window" : "Furnace surge",
                    detail: this.cinderWindowOpen
                      ? "Sentinel armor is softening"
                      : "Mistimed hits trigger burn backlash",
                    tone: this.cinderWindowOpen ? "boon" : "danger"
                  }
                ]
              : [])
          ]
        : [],
      sessionState: {
        dungeonRelicClaimed: this.relicClaimed,
        dungeonRelicClaimedRegionId: this.relicClaimed ? this.currentRegionId : null,
        dungeonMinibossDefeated: this.minibossDefeated,
        dungeonMinibossHp: this.minibossHp,
        sanctumShield: isVeilDungeon ? this.sanctumShield : undefined,
        sanctumWindowOpen: isVeilDungeon ? this.sanctumWindowOpen : undefined,
        cinderWindowOpen: isCinderDungeon ? this.cinderWindowOpen : undefined,
        unlockedRegionIds: this.playerProfile?.unlockedRegionIds ?? ["shatter_block"]
      },
      levelUp: {
        available: false,
        options: []
      },
      combatFeed: [
        {
          id: 1,
          message: this.minibossDefeated
            ? "Boss vault is open. Push through the crimson gate."
            : this.relicClaimed
              ? isVeilDungeon
                ? this.sanctumShield > 0
                  ? "Sigil claimed. Break the sanctum shield before the sentinel can be hurt."
                  : this.sanctumWindowOpen
                    ? "Fracture window open. Commit damage now."
                    : "Sentinel resealed. Reposition and wait for the next fracture pulse."
                : isCinderDungeon
                  ? this.cinderWindowOpen
                    ? "Cooling window open. Push damage before the core flares again."
                    : "Furnace surge active. Mistimed attacks will burn you."
                : "Relic claimed. Break the sentinel to unlock the boss vault."
              : isVeilDungeon
                ? "Claim the shrine sigil to wake the sanctum sentinel."
                : isCinderDungeon
                  ? "Claim the ember core to trigger the furnace sentinel."
                : "Claim the relic shard to wake the chamber sentinel."
        }
      ],
      encounter: {
        enemiesRemaining: this.minibossDefeated ? 1 : this.relicClaimed ? 2 : 1,
        status: this.minibossDefeated
          ? "Boss vault ready"
          : this.relicClaimed
            ? "Miniboss chamber"
            : "Dungeon sweep"
      }
    });
  }

  claimRelic() {
    if (this.relicClaimed) {
      return;
    }

    this.player.setPosition(this.relicNode.x, this.relicNode.y);
    this.relicClaimed = true;
    this.relicNode.pulseTween?.stop();
    this.relicNode.setFillStyle(0x5a5a5a, 0.28);
    this.registry.set("dungeonRelicClaimed", true);
    this.miniboss.setFillStyle(0xe56b6f, 0.82);
    emitSoundEvent({ type: "enemy_down" });
    this.emitDungeonRuntime();
  }

  attackMiniboss() {
    if (!this.relicClaimed || this.minibossDefeated) {
      return;
    }

    const isVeilDungeon = this.currentRegionId === "veil_dungeon";
    const isCinderDungeon = this.currentRegionId === "cinder_dungeon";
    const damage = Math.max(10, Math.floor(this.playerState.attack * 0.8));
    this.player.setPosition(this.miniboss.x - 64, this.miniboss.y);

    if (isVeilDungeon && this.sanctumShield > 0) {
      const shieldBreak = Math.max(8, Math.floor(damage * 0.75));
      this.sanctumShield = Math.max(0, this.sanctumShield - shieldBreak);
      emitSoundEvent({ type: this.sanctumShield === 0 ? "enemy_down" : "skill_cast" });
      this.emitDungeonRuntime();
      return;
    }

    if (isVeilDungeon && !this.sanctumWindowOpen) {
      this.playerState.ce = Math.max(0, this.playerState.ce - 8);
      this.playerState.hp = Math.max(1, this.playerState.hp - 4);
      emitSoundEvent({ type: "danger" });
      this.emitDungeonRuntime();
      return;
    }

    if (isCinderDungeon && !this.cinderWindowOpen) {
      this.playerState.ce = Math.max(0, this.playerState.ce - this.cinderBacklashCe);
      this.playerState.hp = Math.max(1, this.playerState.hp - this.cinderBacklashHp);
      this.minibossHp = Math.max(0, this.minibossHp - Math.max(4, Math.floor(damage * 0.35)));
      emitSoundEvent({ type: "danger" });
      this.emitDungeonRuntime();
      return;
    }

    this.minibossHp = Math.max(0, this.minibossHp - damage);
    emitSoundEvent({ type: this.minibossHp === 0 ? "enemy_down" : "skill_cast" });
    if (this.minibossHp === 0) {
      this.minibossDefeated = true;
      this.miniboss.setFillStyle(0x5a5a5a, 0.28);
      this.minibossPulse?.stop();
      this.playerState.pendingStatPoints += 1;
      emitInventoryReward({
        rewardSource:
          this.currentRegionId === "veil_dungeon"
            ? "veil_miniboss"
            : this.currentRegionId === "cinder_dungeon"
              ? "cinder_miniboss"
              : "dungeon_miniboss",
        regionId: this.currentRegionId,
        sessionState: {
          dungeonRelicClaimed: true,
          dungeonRelicClaimedRegionId: this.currentRegionId
        }
      });
    }
    this.emitDungeonRuntime();
  }

  enterBossVault() {
    if (!this.minibossDefeated || this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    this.player.setPosition(this.bossGate.x, this.bossGate.y);
    this.registry.set("currentRegionId", this.currentRegionId === "veil_dungeon" ? "veil_boss_vault" : "shatter_boss_vault");
    if (this.currentRegionId === "cinder_dungeon") {
      this.registry.set("currentRegionId", "cinder_boss_vault");
    }
    emitTransitionUpdate({
      active: true,
      label: "Entering boss vault",
      detail: "Crossing into the sealed chamber..."
    });
    this.time.delayedCall(220, () => {
      emitSceneUpdate({
        scene: "boss",
        label: "Boss Vault"
      });
      emitTransitionUpdate({
        active: false,
        label: "",
        detail: ""
      });
      this.scene.start("BossScene");
    });
  }

  returnToRegion() {
    if (this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    this.registry.set(
      "currentRegionId",
      this.currentRegionId === "veil_dungeon"
        ? "veil_shrine"
        : this.currentRegionId === "cinder_dungeon"
          ? "cinder_ward"
          : "shatter_block"
    );
    emitTransitionUpdate({
      active: true,
      label: "Leaving dungeon",
      detail: "Returning to the region approach..."
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

    const isVeilDungeon = this.currentRegionId === "veil_dungeon";
    const isCinderDungeon = this.currentRegionId === "cinder_dungeon";
    const velocity = 160;
    this.player.body.setVelocity(0, 0);

    if (this.cursors.left.isDown || this.actionKeys.A.isDown) {
      this.player.body.setVelocityX(-velocity);
    }
    if (this.cursors.right.isDown || this.actionKeys.D.isDown) {
      this.player.body.setVelocityX(velocity);
    }
    if (this.cursors.up.isDown || this.actionKeys.W.isDown) {
      this.player.body.setVelocityY(-velocity);
    }
    if (this.cursors.down.isDown || this.actionKeys.S.isDown) {
      this.player.body.setVelocityY(velocity);
    }

    this.player.body.velocity.normalize().scale(velocity);

    const relicDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.relicNode.x, this.relicNode.y);
    const minibossDistance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.miniboss.x,
      this.miniboss.y
    );
    const gateDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bossGate.x, this.bossGate.y);
    const attacking =
      Phaser.Input.Keyboard.JustDown(this.skillKeys.J) ||
      Phaser.Input.Keyboard.JustDown(this.skillKeys.Q) ||
      Phaser.Input.Keyboard.JustDown(this.skillKeys.R);

    if (isVeilDungeon && this.relicClaimed && !this.minibossDefeated) {
      const cyclePosition = this.time.now % this.sanctumCycleMs;
      this.sanctumWindowOpen = this.sanctumShield <= 0 && cyclePosition >= this.sanctumCycleMs - this.sanctumOpenMs;
      if (this.sanctumWindowOpen !== this.lastSanctumWindowOpen) {
        this.lastSanctumWindowOpen = this.sanctumWindowOpen;
        emitSoundEvent({ type: this.sanctumWindowOpen ? "enemy_down" : "danger" });
        this.minibossMarker.setColor(this.sanctumWindowOpen ? "#9bf6ff" : "#ffd98b");
        this.emitDungeonRuntime();
      }
    }

    if (isCinderDungeon && this.relicClaimed && !this.minibossDefeated) {
      const cyclePosition = this.time.now % this.cinderCycleMs;
      this.cinderWindowOpen = cyclePosition >= this.cinderCycleMs - this.cinderOpenMs;
      if (this.cinderWindowOpen !== this.lastCinderWindowOpen) {
        this.lastCinderWindowOpen = this.cinderWindowOpen;
        emitSoundEvent({ type: this.cinderWindowOpen ? "enemy_down" : "danger" });
        this.minibossMarker.setColor(this.cinderWindowOpen ? "#9bf6ff" : "#ffd98b");
        this.emitDungeonRuntime();
      }
    }

    if (!this.relicClaimed && relicDistance < 56) {
      this.promptText.setText(
        isVeilDungeon
          ? "Press E to claim the shrine sigil"
          : isCinderDungeon
            ? "Press E to claim the ember core"
            : "Press E to claim the relic shard"
      );
    } else if (this.relicClaimed && !this.minibossDefeated && minibossDistance < 120) {
      this.promptText.setText("Pressure the sentinel with J / Q / R");
    } else if (this.minibossDefeated && gateDistance < 82) {
      this.promptText.setText("Press E to enter the boss vault");
    } else {
      this.promptText.setText(
        this.minibossDefeated
          ? "Boss vault open. Move to the crimson gate."
          : this.relicClaimed
            ? isVeilDungeon
              ? "Sanctum sentinel active. Break it to reach the inner vault."
              : isCinderDungeon
                ? "Furnace sentinel active. Strike only on cooling breaches."
                : "Sentinel active. Pressure the chamber guardian."
            : isVeilDungeon
              ? "Follow the marker and secure the sigil."
              : isCinderDungeon
                ? "Follow the marker and stabilize the core."
                : "Follow the marker and secure the relic."
      );
    }

    this.relicMarker.setVisible(!this.relicClaimed);
    this.minibossMarker.setVisible(this.relicClaimed && !this.minibossDefeated);
    this.vaultMarker.setVisible(this.minibossDefeated);
    if (this.vaultMarker.visible) {
      this.vaultMarker.setColor("#b8f29b");
    }

    if (!this.relicClaimed && relicDistance < 56 && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.claimRelic();
      return;
    }

    if (this.relicClaimed && !this.minibossDefeated && attacking && minibossDistance < 150) {
      this.attackMiniboss();
      return;
    }

    if (this.minibossDefeated && gateDistance < 82 && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.enterBossVault();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.returnKey)) {
      this.returnToRegion();
    }
  }
}

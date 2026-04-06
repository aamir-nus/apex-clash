import Phaser from "phaser";
import {
  emitInventoryReward,
  emitRuntimeUpdate,
  emitSceneUpdate,
  emitSoundEvent,
  emitTransitionUpdate
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
  }

  create() {
    this.playerProfile = this.registry.get("playerProfile") ?? null;
    this.selectedArchetype = this.registry.get("selectedArchetype") ?? "close_combat";
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
    this.minibossHp = loadedSessionState.dungeonMinibossHp ?? 72;

    this.add.rectangle(arena.width / 2, arena.height / 2, arena.width, arena.height, 0x0c1218);
    this.add.rectangle(arena.width / 2, arena.height / 2, 820, 400, 0x171f29, 1).setStrokeStyle(2, 0x8fb9ff);
    this.add.rectangle(300, 270, 160, 220, 0x13283a, 0.22).setStrokeStyle(1, 0x74c0fc);
    this.add.rectangle(488, 270, 140, 180, 0x2a1626, 0.2).setStrokeStyle(1, 0xe56b6f);
    this.add.rectangle(660, 270, 180, 220, 0x28161c, 0.22).setStrokeStyle(1, 0xff8f70);

    this.add.text(100, 86, "Shatter Dungeon", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "28px"
    });

    this.add.text(
      100,
      128,
      "Claim the relic shard, defeat the miniboss sentinel, then push into the boss vault.\nThis is the first authored dungeon chain for demo flow.",
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

    this.cursors = this.input.keyboard.createCursorKeys();
    this.actionKeys = this.input.keyboard.addKeys("W,A,S,D");
    this.skillKeys = this.input.keyboard.addKeys("J,Q,E");
    this.returnKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.emitDungeonRuntime();
    emitSceneUpdate({
      scene: "dungeon",
      label: "Dungeon"
    });
  }

  emitDungeonRuntime() {
    const resumeSource = this.registry.get("resumeSource") ?? "fresh-start";
    emitRuntimeUpdate({
      player: this.playerState,
      controls: [
        { key: "WASD", label: "Move" },
        { key: "E", label: "Claim relic / enter boss vault" },
        { key: "J / Q / E", label: "Pressure miniboss" },
        { key: "H", label: "Return to region" }
      ],
      cooldowns: [],
      resumeSource,
      castState: {
        phase: "idle",
        label: this.minibossDefeated
          ? "Boss vault unlocked"
          : this.relicClaimed
            ? `Miniboss HP ${this.minibossHp}`
            : "Relic search active",
        progress: 0
      },
      activeEffects: this.relicClaimed
        ? [
            { id: "dungeon-relic", label: "Relic shard", detail: "Miniboss chamber opened", tone: "boon" },
            ...(this.minibossDefeated
              ? [{ id: "dungeon-miniboss", label: "Sentinel broken", detail: "Boss vault key acquired", tone: "boon" }]
              : [{ id: "dungeon-miniboss", label: "Sentinel active", detail: "Break the chamber guardian", tone: "danger" }])
          ]
        : [],
      sessionState: {
        dungeonRelicClaimed: this.relicClaimed,
        dungeonMinibossDefeated: this.minibossDefeated,
        dungeonMinibossHp: this.minibossHp
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
              ? "Relic claimed. Break the sentinel to unlock the boss vault."
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

  update() {
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
      Phaser.Input.Keyboard.JustDown(this.skillKeys.E);

    if (!this.relicClaimed && relicDistance < 56) {
      this.promptText.setText("Press E to claim the relic shard");
    } else if (this.relicClaimed && !this.minibossDefeated && minibossDistance < 120) {
      this.promptText.setText("Use J / Q / E to break the sentinel");
    } else if (this.minibossDefeated && gateDistance < 82) {
      this.promptText.setText("Press E to enter the boss vault");
    } else {
      this.promptText.setText(
        this.minibossDefeated
          ? "Boss vault open. Move to the crimson gate."
          : this.relicClaimed
            ? "Sentinel active. Pressure the chamber guardian."
            : "Sweep the room and secure the relic."
      );
    }

    if (!this.relicClaimed && relicDistance < 56 && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.relicClaimed = true;
      this.relicNode.pulseTween?.stop();
      this.relicNode.setFillStyle(0x5a5a5a, 0.28);
      this.registry.set("dungeonRelicClaimed", true);
      this.miniboss.setFillStyle(0xe56b6f, 0.82);
      emitSoundEvent({ type: "enemy_down" });
      this.emitDungeonRuntime();
      return;
    }

    if (this.relicClaimed && !this.minibossDefeated && attacking && minibossDistance < 150) {
      const damage = Math.max(10, Math.floor(this.playerState.attack * 0.8));
      this.minibossHp = Math.max(0, this.minibossHp - damage);
      emitSoundEvent({ type: this.minibossHp === 0 ? "enemy_down" : "skill_cast" });
      if (this.minibossHp === 0) {
        this.minibossDefeated = true;
        this.miniboss.setFillStyle(0x5a5a5a, 0.28);
        this.minibossPulse?.stop();
        this.playerState.pendingStatPoints += 1;
        emitInventoryReward({
          rewardSource: "dungeon_miniboss"
        });
      }
      this.emitDungeonRuntime();
      return;
    }

    if (this.minibossDefeated && gateDistance < 82 && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
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
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.returnKey)) {
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
  }
}

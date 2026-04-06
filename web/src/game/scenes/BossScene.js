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
  }

  create() {
    const loadedPlayerState = this.registry.get("loadedPlayerState");
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

    this.add.rectangle(arena.width / 2, arena.height / 2, arena.width, arena.height, 0x120b12);
    this.add.rectangle(arena.width / 2, arena.height / 2, 820, 400, 0x24131d, 1).setStrokeStyle(2, 0xff8f70);
    this.add.text(100, 84, "Boss Vault", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "28px"
    });
    this.add.text(100, 124, "Defeat the vault curse, then extract to Blacksite.", {
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

    this.cursors = this.input.keyboard.createCursorKeys();
    this.actionKeys = this.input.keyboard.addKeys("W,A,S,D");
    this.skillKeys = this.input.keyboard.addKeys("J,Q,E");
    this.returnKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);

    this.emitBossRuntime();
    emitSceneUpdate({
      scene: "boss",
      label: "Boss Vault"
    });
  }

  emitBossRuntime() {
    emitRuntimeUpdate({
      player: this.playerState,
      controls: [
        { key: "WASD", label: "Move" },
        { key: "J / Q / E", label: "Pressure boss" },
        { key: "H", label: "Extract after clear" }
      ],
      cooldowns: [],
      castState: {
        phase: "boss",
        label: `Boss HP ${this.bossHp}`,
        progress: Math.max(0, Math.min(1, 1 - this.bossHp / 120))
      },
      activeEffects: [{ id: "boss-room", label: "Vault curse", detail: "Final chamber active", tone: "danger" }],
      sessionState: {
        bossHp: this.bossHp,
        bossCleared: this.bossHp === 0
      },
      levelUp: {
        available: false,
        options: []
      },
      combatFeed: [
        {
          id: 1,
          message: this.bossHp > 0 ? "Break the vault curse to finish the dungeon slice." : "Boss down. Press H to extract."
        }
      ],
      encounter: {
        enemiesRemaining: this.bossHp > 0 ? 1 : 0,
        status: this.bossHp > 0 ? "Boss encounter" : "Boss cleared"
      }
    });
  }

  update() {
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
      Phaser.Input.Keyboard.JustDown(this.skillKeys.E);

    if (this.bossHp > 0 && attacking && distance < 160) {
      const damage = Math.max(8, Math.floor(this.playerState.attack * 0.9));
      this.bossHp = Math.max(0, this.bossHp - damage);
      emitSoundEvent({ type: this.bossHp === 0 ? "enemy_down" : "skill_cast" });
      this.emitBossRuntime();
    }

    if (this.bossHp === 0 && Phaser.Input.Keyboard.JustDown(this.returnKey)) {
      this.registry.set("loadedPlayerState", {
        ...this.playerState,
        xp: this.playerState.xp + 30,
        regionId: "hub_blacksite"
      });
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
  }
}

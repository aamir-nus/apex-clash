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
    this.bossGate = null;
    this.promptText = null;
    this.relicClaimed = false;
    this.playerState = null;
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

    this.add.rectangle(arena.width / 2, arena.height / 2, arena.width, arena.height, 0x0c1218);
    this.add.rectangle(arena.width / 2, arena.height / 2, 820, 400, 0x171f29, 1).setStrokeStyle(2, 0x8fb9ff);
    this.add.rectangle(300, 270, 160, 220, 0x13283a, 0.22).setStrokeStyle(1, 0x74c0fc);
    this.add.rectangle(660, 270, 180, 220, 0x28161c, 0.22).setStrokeStyle(1, 0xff8f70);

    this.add.text(100, 86, "Shatter Dungeon", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "28px"
    });

    this.add.text(
      100,
      128,
      "Claim the relic shard, then push into the boss vault.\nThis is the first authored dungeon chain for demo flow.",
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
    if (this.relicClaimed) {
      this.relicNode.pulseTween?.stop();
      this.relicNode.setFillStyle(0x5a5a5a, 0.28);
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.actionKeys = this.input.keyboard.addKeys("W,A,S,D");
    this.returnKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.emitDungeonRuntime();
    emitSceneUpdate({
      scene: "dungeon",
      label: "Dungeon"
    });
  }

  emitDungeonRuntime() {
    emitRuntimeUpdate({
      player: this.playerState,
      controls: [
        { key: "WASD", label: "Move" },
        { key: "E", label: "Claim relic / enter boss vault" },
        { key: "H", label: "Return to region" }
      ],
      cooldowns: [],
      castState: {
        phase: "idle",
        label: this.relicClaimed ? "Boss vault unlocked" : "Relic search active",
        progress: 0
      },
      activeEffects: this.relicClaimed
        ? [{ id: "dungeon-relic", label: "Relic shard", detail: "Boss vault key acquired", tone: "boon" }]
        : [],
      sessionState: {
        dungeonRelicClaimed: this.relicClaimed
      },
      levelUp: {
        available: false,
        options: []
      },
      combatFeed: [
        {
          id: 1,
          message: this.relicClaimed
            ? "Boss vault is open. Push through the crimson gate."
            : "Claim the relic shard to unlock the boss vault."
        }
      ],
      encounter: {
        enemiesRemaining: this.relicClaimed ? 1 : 0,
        status: this.relicClaimed ? "Boss vault ready" : "Dungeon sweep"
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
    const gateDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bossGate.x, this.bossGate.y);

    if (!this.relicClaimed && relicDistance < 56) {
      this.promptText.setText("Press E to claim the relic shard");
    } else if (this.relicClaimed && gateDistance < 82) {
      this.promptText.setText("Press E to enter the boss vault");
    } else {
      this.promptText.setText(this.relicClaimed ? "Boss vault open. Move to the crimson gate." : "Sweep the room and secure the relic.");
    }

    if (!this.relicClaimed && relicDistance < 56 && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.relicClaimed = true;
      this.relicNode.pulseTween?.stop();
      this.relicNode.setFillStyle(0x5a5a5a, 0.28);
      this.registry.set("dungeonRelicClaimed", true);
      this.playerState.pendingStatPoints += 1;
      emitSoundEvent({ type: "enemy_down" });
      this.emitDungeonRuntime();
      return;
    }

    if (this.relicClaimed && gateDistance < 82 && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
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

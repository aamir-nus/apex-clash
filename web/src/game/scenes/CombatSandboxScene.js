import Phaser from "phaser";
import { emitRuntimeUpdate, emitSoundEvent } from "../runtime/runtimeBridge";

const arena = {
  width: 960,
  height: 540
};

export class CombatSandboxScene extends Phaser.Scene {
  constructor() {
    super("CombatSandboxScene");
    this.player = null;
    this.enemies = null;
    this.cursors = null;
    this.actionKeys = null;
    this.selectedArchetype = "close_combat";
    this.cooldowns = [];
    this.combatFeed = [];
    this.playerState = null;
    this.nextFeedId = 1;
    this.lastRuntimeEmit = 0;
    this.contactDamageCooldown = 0;
    this.enemyRespawnCooldown = -1;
  }

  create() {
    this.content = this.registry.get("content") ?? {};
    this.selectedArchetype = this.registry.get("selectedArchetype") ?? "close_combat";

    this.add.rectangle(arena.width / 2, arena.height / 2, arena.width, arena.height, 0x102332);
    this.add.rectangle(arena.width / 2, arena.height / 2, 820, 400, 0x0d1b26, 1).setStrokeStyle(2, 0x31556f);

    this.player = this.add.rectangle(180, arena.height / 2, 24, 24, 0x3ddc97);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    this.enemies = this.physics.add.group();
    [
      { x: 580, y: 200, tint: 0xc96bff },
      { x: 700, y: 280, tint: 0xf25f5c },
      { x: 620, y: 360, tint: 0xffc857 }
    ].forEach((spawn) => {
      const enemy = this.add.rectangle(spawn.x, spawn.y, 22, 22, spawn.tint);
      this.physics.add.existing(enemy);
      enemy.body.setImmovable(true);
      this.enemies.add(enemy);
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.actionKeys = this.input.keyboard.addKeys("W,A,S,D,SPACE");

    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyContact, undefined, this);

    this.cooldowns = [
      { id: "basic", key: "J", label: "Basic Strike", duration: 0.45, remaining: 0 },
      { id: "skill_1", key: "Q", label: "Burst Step", duration: 4, remaining: 0 },
      { id: "skill_2", key: "E", label: "Veil Shot", duration: 6, remaining: 0 },
      { id: "dodge", key: "SPACE", label: "Dodge", duration: 1.2, remaining: 0 }
    ];

    this.skillKeys = this.input.keyboard.addKeys("J,Q,E");

    this.applyArchetype(this.selectedArchetype);
    this.pushFeed("Sandbox live. Use WASD, J, Q, E, SPACE.");
    this.emitRuntime();
  }

  applyArchetype(archetypeId) {
    this.selectedArchetype = archetypeId;
    this.registry.set("selectedArchetype", archetypeId);

    const definition = (this.content.classes ?? []).find((entry) => entry.id === archetypeId);
    const moveSpeed = definition?.baseStats?.speed ? 90 + definition.baseStats.speed * 4 : 140;

    if (this.player?.body) {
      this.player.body.maxSpeed = moveSpeed;
    }

    this.playerState = {
      hp: definition?.baseStats?.hp ?? 100,
      maxHp: definition?.baseStats?.hp ?? 100,
      ce: definition?.baseStats?.ce ?? 60,
      maxCe: definition?.baseStats?.ce ?? 60,
      level: 1,
      xp: 0,
      xpToNextLevel: 30,
      attack: definition?.baseStats?.attack ?? 10,
      defense: definition?.baseStats?.defense ?? 8,
      speed: definition?.baseStats?.speed ?? 10,
      pendingStatPoints: 0,
      archetype: definition?.name ?? "Unknown Build",
      combatStyle: definition?.combatStyle ?? "No style loaded"
    };

    this.resetArena();
    this.pushFeed(`${this.playerState.archetype} ready: ${this.playerState.combatStyle}.`);
    this.emitRuntime();
  }

  resetArena() {
    this.enemies?.getChildren().forEach((enemy, index) => {
      enemy.active = true;
      enemy.visible = true;
      enemy.body.enable = true;
      enemy.health = 20 + index * 8;
      enemy.maxHealth = enemy.health;
    });
  }

  pushFeed(message) {
    this.combatFeed = [{ id: this.nextFeedId++, message }, ...this.combatFeed].slice(0, 5);
  }

  emitRuntime() {
    emitRuntimeUpdate({
      player: this.playerState,
      cooldowns: this.cooldowns.map((entry) => ({
        id: entry.id,
        key: entry.key,
        label: entry.label,
        remaining: entry.remaining
      })),
      combatFeed: this.combatFeed,
      encounter: {
        enemiesRemaining: this.getEnemiesRemaining(),
        status:
          this.getEnemiesRemaining() > 0
            ? `${this.getEnemiesRemaining()} curses active`
            : "Arena cleared"
      }
    });
  }

  getEnemiesRemaining() {
    return this.enemies?.getChildren().filter((enemy) => enemy.active).length ?? 0;
  }

  handleEnemyContact(player, enemy) {
    if (!enemy.active || this.contactDamageCooldown > 0) {
      return;
    }

    this.contactDamageCooldown = 0.8;
    const incomingDamage = Math.max(3, 10 - Math.floor(this.playerState.defense / 4));
    this.playerState.hp = Math.max(0, this.playerState.hp - incomingDamage);
    this.pushFeed(
      `You took ${incomingDamage} damage from ${
        enemy.fillColor === 0xc96bff ? "a shrieker" : "a curse"
      }.`
    );
    emitSoundEvent({ type: this.playerState.hp <= this.playerState.maxHp * 0.3 ? "low_resource" : "hit_confirm" });
    this.flashTarget(player, 0xf25f5c);
    this.emitRuntime();
  }

  flashTarget(target, color) {
    const original = target.fillColor;
    target.fillColor = color;
    this.time.delayedCall(90, () => {
      if (target.active !== false) {
        target.fillColor = original;
      }
    });
  }

  getXpThreshold(level) {
    return 30 + (level - 1) * 20;
  }

  gainXp(amount) {
    this.playerState.xp += amount;
    this.playerState.xpToNextLevel = this.getXpThreshold(this.playerState.level);

    while (this.playerState.xp >= this.playerState.xpToNextLevel) {
      this.playerState.xp -= this.playerState.xpToNextLevel;
      this.playerState.level += 1;
      this.playerState.pendingStatPoints += 1;
      this.playerState.maxHp += 8;
      this.playerState.maxCe += 5;
      this.playerState.attack += 2;
      this.playerState.defense += 1;
      this.playerState.speed += 1;
      this.playerState.hp = this.playerState.maxHp;
      this.playerState.ce = this.playerState.maxCe;
      this.playerState.xpToNextLevel = this.getXpThreshold(this.playerState.level);
      this.pushFeed(`Level up. You are now level ${this.playerState.level}.`);
      emitSoundEvent({ type: "enemy_down" });
    }
  }

  triggerAbility(abilityId) {
    const cooldown = this.cooldowns.find((entry) => entry.id === abilityId);
    if (!cooldown || cooldown.remaining > 0) {
      return false;
    }

    if (abilityId !== "basic" && this.playerState.ce < 10) {
      this.pushFeed("Not enough CE. Use basic attacks or wait for regen.");
      emitSoundEvent({ type: "low_resource" });
      this.emitRuntime();
      return false;
    }

    cooldown.remaining = cooldown.duration;

    if (abilityId === "dodge") {
      this.playerState.ce = Math.max(0, this.playerState.ce - 6);
      this.pushFeed("Dodge primed. Reposition through pressure.");
      emitSoundEvent({ type: "dodge" });
    } else {
      if (abilityId !== "basic") {
        this.playerState.ce = Math.max(0, this.playerState.ce - 10);
      }

      const liveEnemy = this.enemies.getChildren().find((enemy) => enemy.active);
      if (!liveEnemy) {
        this.pushFeed("No active curses in range.");
        this.emitRuntime();
        return true;
      }

      const damage =
        (abilityId === "basic" ? 8 : abilityId === "skill_1" ? 16 : 12) +
        this.playerState.attack;
      liveEnemy.health -= damage;
      this.pushFeed(`${cooldown.label} hit for ${damage}.`);
      emitSoundEvent({ type: liveEnemy.health <= 0 ? "enemy_down" : "skill_cast" });
      this.flashTarget(liveEnemy, 0xffffff);

      if (liveEnemy.health <= 0) {
        liveEnemy.active = false;
        liveEnemy.visible = false;
        liveEnemy.body.enable = false;
        this.gainXp(15);
        this.pushFeed("Curse eliminated. XP +15.");
        if (this.getEnemiesRemaining() === 0) {
          this.enemyRespawnCooldown = 2;
        }
      }
    }

    this.emitRuntime();
    return true;
  }

  update(_time, delta) {
    if (!this.player?.body) {
      return;
    }

    const keys = this.actionKeys;
    const deltaSeconds = delta / 1000;
    this.contactDamageCooldown = Math.max(0, this.contactDamageCooldown - deltaSeconds);
    this.enemyRespawnCooldown = Math.max(-1, this.enemyRespawnCooldown - deltaSeconds);
    this.cooldowns.forEach((entry) => {
      entry.remaining = Math.max(0, entry.remaining - deltaSeconds);
    });

    this.playerState.ce = Math.min(this.playerState.maxCe, this.playerState.ce + deltaSeconds * 3);

    if (Phaser.Input.Keyboard.JustDown(this.skillKeys.J)) {
      this.triggerAbility("basic");
    }
    if (Phaser.Input.Keyboard.JustDown(this.skillKeys.Q)) {
      this.triggerAbility("skill_1");
    }
    if (Phaser.Input.Keyboard.JustDown(this.skillKeys.E)) {
      this.triggerAbility("skill_2");
    }

    const dodgeTriggered = Phaser.Input.Keyboard.JustDown(keys.SPACE) && this.triggerAbility("dodge");
    const dodgeMultiplier = dodgeTriggered ? 2.2 : 1;
    const baseSpeed = this.playerState.speed ? 90 + this.playerState.speed * 4 : 140;
    const velocity = baseSpeed * dodgeMultiplier;

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

    if (this.playerState.hp <= 0) {
      this.playerState.hp = this.playerState.maxHp;
      this.playerState.ce = this.playerState.maxCe;
      this.resetArena();
      this.enemyRespawnCooldown = -1;
      this.pushFeed("You were overwhelmed. Arena reset.");
      this.emitRuntime();
    }

    if (this.getEnemiesRemaining() === 0 && this.enemyRespawnCooldown === 0) {
      this.resetArena();
      this.enemyRespawnCooldown = -1;
      this.pushFeed("New curse wave has entered the arena.");
      this.emitRuntime();
    }

    this.lastRuntimeEmit += deltaSeconds;
    if (this.lastRuntimeEmit >= 0.12) {
      this.lastRuntimeEmit = 0;
      this.emitRuntime();
    }
  }
}

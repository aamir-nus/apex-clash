import Phaser from "phaser";
import {
  emitProgressionReward,
  emitRuntimeUpdate,
  emitSceneUpdate,
  emitSoundEvent,
  emitTransitionUpdate
} from "../runtime/runtimeBridge";

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
    this.returnKey = null;
    this.playerProfile = null;
    this.explorationBonus = null;
    this.combatSnapshot = null;
    this.facingVector = new Phaser.Math.Vector2(1, 0);
    this.impactBursts = null;
    this.playerAnimationState = "idle";
    this.stateLockUntil = 0;
    this.activeCast = null;
    this.enemyTelegraphs = null;
    this.floatingTexts = null;
  }

  create() {
    this.content = this.registry.get("content") ?? {};
    this.selectedArchetype = this.registry.get("selectedArchetype") ?? "close_combat";
    this.playerProfile = this.registry.get("playerProfile") ?? null;
    this.explorationBonus = this.registry.get("explorationBonus") ?? null;

    this.add.rectangle(arena.width / 2, arena.height / 2, arena.width, arena.height, 0x102332);
    this.add.rectangle(arena.width / 2, arena.height / 2, 820, 400, 0x0d1b26, 1).setStrokeStyle(2, 0x31556f);

    this.player = this.add.rectangle(180, arena.height / 2, 24, 24, 0x3ddc97);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.setStrokeStyle(2, 0xf6f1df);

    this.enemies = this.physics.add.group();
    this.impactBursts = this.add.group();
    this.enemyTelegraphs = this.add.group();
    this.floatingTexts = this.add.group();
    [
      { x: 580, y: 200, tint: 0xc96bff },
      { x: 700, y: 280, tint: 0xf25f5c },
      { x: 620, y: 360, tint: 0xffc857 }
    ].forEach((spawn) => {
      const enemy = this.add.rectangle(spawn.x, spawn.y, 22, 22, spawn.tint);
      this.physics.add.existing(enemy);
      enemy.body.setDrag(320, 320);
      enemy.body.setMaxVelocity(84, 84);
      enemy.body.setCollideWorldBounds(true);
      this.enemies.add(enemy);
      enemy.attackCooldown = 0.6;
      enemy.attackState = "idle";
      enemy.attackWindupMs = spawn.tint === 0xc96bff ? 520 : spawn.tint === 0xf25f5c ? 440 : 620;
      enemy.attackDamage = spawn.tint === 0xc96bff ? 8 : spawn.tint === 0xf25f5c ? 10 : 12;
      enemy.attackRange = spawn.tint === 0xc96bff ? 118 : 90;
      enemy.aggroRange = 240;
      enemy.enemyType =
        spawn.tint === 0xc96bff ? "Shrieker" : spawn.tint === 0xf25f5c ? "Biter" : "Crusher";
      this.startEnemyIdleTween(enemy);
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.actionKeys = this.input.keyboard.addKeys("W,A,S,D,SPACE");
    this.returnKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);

    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyContact, undefined, this);

    this.cooldowns = [
      { id: "basic", key: "J", label: "Basic Strike", duration: 0.45, remaining: 0 },
      { id: "skill_1", key: "Q", label: "Skill 1", duration: 4, remaining: 0 },
      { id: "skill_2", key: "E", label: "Skill 2", duration: 6, remaining: 0 },
      { id: "dodge", key: "SPACE", label: "Dodge", duration: 1.2, remaining: 0 }
    ];

    this.skillKeys = this.input.keyboard.addKeys("J,Q,E");
    this.applyProfile(this.playerProfile, this.selectedArchetype);
    this.startPlayerIdleTween();
    this.pushFeed("Sandbox live. Use WASD, J, Q, E, SPACE.");
    this.pushFeed("Press H to return to the region.");
    emitSceneUpdate({
      scene: "combat",
      label: "Combat Sandbox"
    });
    this.emitRuntime();
  }

  applyProfile(profile, fallbackArchetypeId) {
    this.playerProfile = profile ?? null;
    const archetypeId = profile?.classType ?? fallbackArchetypeId ?? "close_combat";
    this.selectedArchetype = archetypeId;
    this.registry.set("selectedArchetype", archetypeId);
    this.registry.set("playerProfile", profile ?? null);

    const definition = (this.content.classes ?? []).find((entry) => entry.id === archetypeId);
    const profileStats = profile?.computedStats ?? {};
    const resolvedSpeed = profileStats.speed ?? definition?.baseStats?.speed ?? 10;
    const moveSpeed = 90 + resolvedSpeed * 4;

    if (this.player?.body) {
      this.player.body.maxSpeed = moveSpeed;
    }

    const equippedSkills = profile?.equippedSkills ?? [];
    const skillOne = equippedSkills[0];
    const skillTwo = equippedSkills[1];
    this.cooldowns = this.cooldowns.map((entry) => {
      if (entry.id === "skill_1") {
        return {
          ...entry,
          label: skillOne?.name ?? "Skill 1",
          duration: skillOne?.cooldown ?? 4
        };
      }

      if (entry.id === "skill_2") {
        return {
          ...entry,
          label: skillTwo?.name ?? "Skill 2",
          duration: skillTwo?.cooldown ?? 6
        };
      }

      return entry;
    });

    const explorationBonus = this.registry.get("explorationBonus") ?? this.explorationBonus;
    const baseHp = profileStats.hp ?? definition?.baseStats?.hp ?? 100;
    const baseCe = profileStats.ce ?? definition?.baseStats?.ce ?? 60;
    this.playerState = {
      hp: baseHp + (explorationBonus?.hpBonus ?? 0),
      maxHp: baseHp + (explorationBonus?.hpBonus ?? 0),
      ce: baseCe + (explorationBonus?.ceBonus ?? 0),
      maxCe: baseCe + (explorationBonus?.ceBonus ?? 0),
      level: profile?.level ?? 1,
      xp: 0,
      xpToNextLevel: 30,
      attack: (profileStats.attack ?? definition?.baseStats?.attack ?? 10) + (explorationBonus?.attackBonus ?? 0),
      defense:
        (profileStats.defense ?? definition?.baseStats?.defense ?? 8) + (explorationBonus?.defenseBonus ?? 0),
      speed: (profileStats.speed ?? definition?.baseStats?.speed ?? 10) + (explorationBonus?.speedBonus ?? 0),
      pendingStatPoints: 0,
      archetype: definition?.name ?? "Unknown Build",
      combatStyle: definition?.combatStyle ?? "No style loaded"
    };

    this.combatSnapshot = {
      basicsUsed: 0,
      skillsUsed: 0,
      dodgesUsed: 0,
      damageTaken: 0,
      kills: 0,
      style: "fresh"
    };
    this.playerAnimationState = "idle";
    this.stateLockUntil = 0;
    this.activeCast = null;

    this.resetArena();
    if (explorationBonus?.label) {
      this.pushFeed(`Exploration boon active: ${explorationBonus.label}.`);
    }
    this.pushFeed(`${this.playerState.archetype} ready: ${this.playerState.combatStyle}.`);
    this.emitRuntime();
  }

  syncProfile(profile) {
    if (!profile || !this.playerState) {
      return;
    }

    this.playerProfile = profile;
    this.registry.set("playerProfile", profile);
    const stats = profile.computedStats ?? {};
    this.playerState.level = profile.level ?? this.playerState.level;
    this.playerState.xp = profile.xp ?? this.playerState.xp;
    this.playerState.xpToNextLevel = profile.xpToNextLevel ?? this.playerState.xpToNextLevel;
    this.playerState.pendingStatPoints =
      profile.pendingStatPoints ?? this.playerState.pendingStatPoints;
    this.playerState.maxHp = stats.hp ?? this.playerState.maxHp;
    this.playerState.hp = Math.min(this.playerState.hp, this.playerState.maxHp);
    this.playerState.maxCe = stats.ce ?? this.playerState.maxCe;
    this.playerState.ce = Math.min(this.playerState.ce, this.playerState.maxCe);
    this.playerState.attack = stats.attack ?? this.playerState.attack;
    this.playerState.defense = stats.defense ?? this.playerState.defense;
    this.playerState.speed = stats.speed ?? this.playerState.speed;
    this.emitRuntime();
  }

  resetArena() {
    this.enemies?.getChildren().forEach((enemy, index) => {
      enemy.active = true;
      enemy.visible = true;
      enemy.body.enable = true;
      enemy.setScale(1);
      enemy.setAlpha(1);
      enemy.angle = 0;
      enemy.health = 20 + index * 8;
      enemy.maxHealth = enemy.health;
      enemy.attackCooldown = 0.5 + index * 0.2;
      enemy.attackState = "idle";
      enemy.body.setVelocity(0, 0);
      enemy.telegraphShape?.destroy();
      enemy.telegraphShape = null;
      if (!enemy.idleTween || enemy.idleTween.isDestroyed()) {
        this.startEnemyIdleTween(enemy);
      } else {
        enemy.idleTween.resume();
      }
    });
  }

  startPlayerIdleTween() {
    this.playerIdleTween?.stop();
    this.playerIdleTween = this.tweens.add({
      targets: this.player,
      scaleY: 0.94,
      scaleX: 1.04,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  startEnemyIdleTween(enemy) {
    enemy.idleTween?.stop();
    enemy.idleTween = this.tweens.add({
      targets: enemy,
      y: enemy.y - 6,
      duration: 620 + Math.floor(Math.random() * 180),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  animateMovement(deltaSeconds) {
    const velocity = this.player.body.velocity;
    if (velocity.lengthSq() > 0) {
      this.facingVector = velocity.clone().normalize();
      const intensity = Math.min(1, velocity.length() / 210);
      this.player.setScale(1.04 + intensity * 0.08, 0.94 - intensity * 0.08);
      this.player.angle = Phaser.Math.Linear(this.player.angle, this.facingVector.x * 8, 0.24);
      return;
    }

    this.player.angle = Phaser.Math.Linear(this.player.angle, 0, Math.min(1, deltaSeconds * 10));
    this.player.scaleX = Phaser.Math.Linear(this.player.scaleX, 1, Math.min(1, deltaSeconds * 8));
    this.player.scaleY = Phaser.Math.Linear(this.player.scaleY, 1, Math.min(1, deltaSeconds * 8));
  }

  spawnImpactBurst(x, y, color = 0xffffff, size = 18) {
    const burst = this.add.rectangle(x, y, size, size, color, 0.9);
    burst.angle = 45;
    this.impactBursts.add(burst);
    this.tweens.add({
      targets: burst,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 0.2,
      duration: 140,
      ease: "Quad.easeOut",
      onComplete: () => burst.destroy()
    });
  }

  spawnFloatingText(x, y, text, color = "#f6f1df") {
    const label = this.add.text(x, y, text, {
      color,
      fontFamily: "monospace",
      fontSize: "13px"
    });
    this.floatingTexts.add(label);
    this.tweens.add({
      targets: label,
      y: y - 22,
      alpha: 0,
      duration: 480,
      ease: "Quad.easeOut",
      onComplete: () => label.destroy()
    });
  }

  setPlayerAnimationState(state, lockMs = 0) {
    this.playerAnimationState = state;
    this.stateLockUntil = Math.max(this.stateLockUntil, this.time.now + lockMs);
  }

  getAbilityConfig(abilityId) {
    if (abilityId === "basic") {
      return {
        windupMs: 80,
        recoveryMs: 90,
        baseDamage: 8,
        range: 72,
        telegraphColor: 0xf6f1df,
        castType: "strike"
      };
    }

    if (abilityId === "skill_1") {
      return {
        windupMs: 140,
        recoveryMs: 120,
        baseDamage: 16,
        range: 96,
        telegraphColor: 0xffc857,
        castType: "dash"
      };
    }

    if (abilityId === "skill_2") {
      return {
        windupMs: 180,
        recoveryMs: 100,
        baseDamage: 12,
        range: 260,
        telegraphColor: 0x74c0fc,
        castType: "projectile"
      };
    }

    return null;
  }

  getPrimaryEnemyTarget(maxRange = 9999) {
    const activeEnemies = this.enemies.getChildren().filter((enemy) => enemy.active);
    if (!activeEnemies.length) {
      return null;
    }

    const sorted = activeEnemies
      .map((enemy) => ({
        enemy,
        distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y)
      }))
      .sort((left, right) => left.distance - right.distance);

    return sorted[0].distance <= maxRange ? sorted[0].enemy : null;
  }

  spawnCastTelegraph(target, config) {
    if (!target) {
      return;
    }

    if (config.castType === "projectile") {
      const line = this.add.rectangle(this.player.x, this.player.y, config.range, 4, config.telegraphColor, 0.5);
      line.setOrigin(0, 0.5);
      line.rotation = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
      this.tweens.add({
        targets: line,
        alpha: 0,
        duration: config.windupMs,
        ease: "Sine.easeOut",
        onComplete: () => line.destroy()
      });
      return;
    }

    const circle = this.add.circle(target.x, target.y, config.castType === "dash" ? 24 : 18, config.telegraphColor, 0.2);
    circle.setStrokeStyle(2, config.telegraphColor, 0.9);
    this.tweens.add({
      targets: circle,
      scaleX: 1.45,
      scaleY: 1.45,
      alpha: 0,
      duration: config.windupMs,
      ease: "Quad.easeOut",
      onComplete: () => circle.destroy()
    });
  }

  resolveAbilityHit(abilityId, cooldown, target, config) {
    if (!target?.active) {
      this.pushFeed("No active curses in range.");
      this.emitRuntime();
      return;
    }

    const damage = config.baseDamage + this.playerState.attack;
    target.health -= damage;
    this.pushFeed(`${cooldown.label} hit for ${damage}.`);
    emitSoundEvent({ type: target.health <= 0 ? "enemy_down" : "skill_cast" });
    this.flashTarget(target, 0xffffff);
    this.spawnFloatingText(target.x + 6, target.y - 12, `${damage}`, "#ffd98b");

    if (config.castType === "projectile") {
      this.animateProjectile(target, config.telegraphColor);
    } else {
      this.animatePlayerStrike(target, abilityId === "skill_1" ? "skill" : "basic");
      this.spawnImpactBurst(target.x, target.y, config.telegraphColor, 20);
    }

    this.animateEnemyHit(target, target.health <= 0);

    if (target.health <= 0) {
      this.combatSnapshot.kills += 1;
      target.active = false;
      target.body.enable = false;
      this.animateEnemyDefeat(target);
      this.gainXp(15);
      this.pushFeed("Curse eliminated. XP +15.");
      if (this.getEnemiesRemaining() === 0) {
        this.enemyRespawnCooldown = 2;
      }
    }

    this.time.delayedCall(config.recoveryMs, () => {
      if (this.playerAnimationState !== "down") {
        this.playerAnimationState = "idle";
      }
    });
  }

  spawnAfterImage(color = 0x3ddc97) {
    const ghost = this.add.rectangle(this.player.x, this.player.y, 22, 22, color, 0.45);
    ghost.angle = this.player.angle;
    this.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 0.8,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => ghost.destroy()
    });
  }

  animatePlayerStrike(enemy, tone = "basic") {
    const direction = new Phaser.Math.Vector2(enemy.x - this.player.x, enemy.y - this.player.y).normalize();
    this.facingVector = direction.clone();
    const lift = tone === "skill" ? 14 : 8;
    const slash = this.add.rectangle(
      this.player.x + direction.x * 18,
      this.player.y + direction.y * 18,
      tone === "skill" ? 30 : 22,
      6,
      tone === "skill" ? 0xffc857 : 0xf6f1df,
      0.88
    );
    slash.rotation = direction.angle();

    this.tweens.add({
      targets: this.player,
      x: this.player.x + direction.x * lift,
      y: this.player.y + direction.y * lift,
      angle: direction.x * 10,
      scaleX: 1.16,
      scaleY: 0.84,
      yoyo: true,
      duration: tone === "skill" ? 90 : 70,
      ease: "Quad.easeOut"
    });

    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.8,
      duration: 130,
      ease: "Quad.easeOut",
      onComplete: () => slash.destroy()
    });
  }

  animateProjectile(enemy, color = 0xc77dff) {
    const orb = this.add.circle(this.player.x, this.player.y, 7, color, 0.95);
    this.tweens.add({
      targets: orb,
      x: enemy.x,
      y: enemy.y,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 170,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.spawnImpactBurst(enemy.x, enemy.y, color, 26);
        orb.destroy();
      }
    });
  }

  animateDodge() {
    this.spawnAfterImage();
    this.time.delayedCall(40, () => this.spawnAfterImage(0x74c0fc));
    this.tweens.add({
      targets: this.player,
      alpha: 0.45,
      duration: 70,
      yoyo: true,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.player.alpha = 1;
      }
    });
  }

  animateEnemyHit(enemy, isFinisher = false) {
    enemy.idleTween?.pause();
    this.tweens.add({
      targets: enemy,
      scaleX: isFinisher ? 1.3 : 1.12,
      scaleY: isFinisher ? 0.7 : 0.88,
      angle: Phaser.Math.Between(-12, 12),
      duration: 70,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (enemy.active && enemy.visible) {
          enemy.angle = 0;
          enemy.idleTween?.resume();
        }
      }
    });
  }

  animateEnemyDefeat(enemy) {
    enemy.idleTween?.stop();
    this.spawnImpactBurst(enemy.x, enemy.y, enemy.fillColor, 28);
    this.tweens.add({
      targets: enemy,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 0.1,
      angle: 22,
      duration: 160,
      ease: "Back.easeIn",
      onComplete: () => {
        enemy.setVisible(false);
      }
    });
  }

  pushFeed(message) {
    this.combatFeed = [{ id: this.nextFeedId++, message }, ...this.combatFeed].slice(0, 5);
  }

  getCastRuntimeState() {
    if (!this.activeCast) {
      return {
        phase: this.playerAnimationState === "idle" ? "idle" : this.playerAnimationState,
        label: this.playerAnimationState === "idle" ? "No active cast" : this.playerAnimationState,
        progress: 0
      };
    }

    const now = this.time.now;
    if (now < this.activeCast.releaseAt) {
      const total = Math.max(1, this.activeCast.releaseAt - this.activeCast.startedAt);
      return {
        phase: "windup",
        label: `${this.activeCast.label} windup`,
        progress: (now - this.activeCast.startedAt) / total
      };
    }

    const total = Math.max(1, this.activeCast.recoveryUntil - this.activeCast.releaseAt);
    return {
      phase: "recovery",
      label: `${this.activeCast.label} recovery`,
      progress: (now - this.activeCast.releaseAt) / total
    };
  }

  emitRuntime() {
    const activeEffects = [];
    if (this.explorationBonus?.label) {
      activeEffects.push({
        id: "exploration-bonus",
        label: this.explorationBonus.label,
        detail: "Exploration boon carried into combat",
        tone: "boon"
      });
    }
    if (this.enemies.getChildren().some((enemy) => enemy.attackState === "windup")) {
      activeEffects.push({
        id: "enemy-pressure",
        label: "Incoming attack",
        detail: "At least one curse is winding up",
        tone: "danger"
      });
    }

    emitRuntimeUpdate({
      player: this.playerState,
      controls: [
        { key: "WASD", label: "Move" },
        { key: "J", label: "Basic strike" },
        { key: "Q / E", label: "Skills" },
        { key: "SPACE", label: "Dodge" },
        { key: "H", label: "Back to region" }
      ],
      cooldowns: this.cooldowns.map((entry) => ({
        id: entry.id,
        key: entry.key,
        label: entry.label,
        remaining: entry.remaining
      })),
      castState: this.getCastRuntimeState(),
      activeEffects,
      sessionState: {
        explorationBonus: this.explorationBonus,
        combatSnapshot: this.combatSnapshot
      },
      levelUp: {
        available: this.playerState.pendingStatPoints > 0,
        options: [
          { id: "attack", label: "Attack", detail: "+2 attack, +4 CE burst damage feel" },
          { id: "defense", label: "Defense", detail: "+1 defense, +10 max HP sustain" },
          { id: "speed", label: "Speed", detail: "+1 speed, sharper repositioning" }
        ]
      },
      combatFeed: this.combatFeed,
      encounter: {
        enemiesRemaining: this.getEnemiesRemaining(),
        status:
          this.getEnemiesRemaining() > 0
            ? `${this.getEnemiesRemaining()} curses active${this.enemies.getChildren().some((enemy) => enemy.attackState === "windup") ? " • telegraph live" : ""}`
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
    const baseEnemyDamage = enemy.attackDamage ?? 10;
    const incomingDamage = Math.max(3, baseEnemyDamage - Math.floor(this.playerState.defense / 4));
    this.playerState.hp = Math.max(0, this.playerState.hp - incomingDamage);
    this.combatSnapshot.damageTaken += incomingDamage;
    this.pushFeed(
      `You took ${incomingDamage} damage from ${
        enemy.enemyType ? `a ${enemy.enemyType.toLowerCase()}` : "a curse"
      }.`
    );
    emitSoundEvent({ type: this.playerState.hp <= this.playerState.maxHp * 0.3 ? "low_resource" : "hit_confirm" });
    this.flashTarget(player, 0xf25f5c);
    this.spawnImpactBurst(player.x, player.y, 0xf25f5c, 20);
    this.spawnFloatingText(player.x + 10, player.y - 10, `-${incomingDamage}`, "#ff8f70");
    this.tweens.add({
      targets: this.player,
      x: this.player.x - this.facingVector.x * 8,
      y: this.player.y - this.facingVector.y * 8,
      angle: -this.facingVector.x * 10,
      yoyo: true,
      duration: 70,
      ease: "Quad.easeOut"
    });
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
    if (this.playerProfile?.userId) {
      emitProgressionReward({
        level: this.playerState.level,
        xp: this.playerState.xp,
        pendingStatPoints: this.playerState.pendingStatPoints,
        xpGained: amount,
        source: "combat"
      });
      this.pushFeed(`Gained ${amount} XP. Syncing progression...`);
      this.emitRuntime();
      return;
    }

    this.playerState.xp += amount;
    this.playerState.xpToNextLevel = this.getXpThreshold(this.playerState.level);

    while (this.playerState.xp >= this.playerState.xpToNextLevel) {
      this.playerState.xp -= this.playerState.xpToNextLevel;
      this.playerState.level += 1;
      this.playerState.pendingStatPoints += 1;
      this.playerState.xpToNextLevel = this.getXpThreshold(this.playerState.level);
      this.pushFeed(`Level up. You are now level ${this.playerState.level}.`);
      emitSoundEvent({ type: "enemy_down" });
    }

    this.emitRuntime();
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
      this.combatSnapshot.dodgesUsed += 1;
      this.playerState.ce = Math.max(0, this.playerState.ce - 6);
      this.pushFeed("Dodge primed. Reposition through pressure.");
      emitSoundEvent({ type: "dodge" });
      this.setPlayerAnimationState("dodge", 160);
      this.animateDodge();
    } else {
      const config = this.getAbilityConfig(abilityId);
      const target = this.getPrimaryEnemyTarget(config?.range ?? 9999);

      if (abilityId !== "basic") {
        this.combatSnapshot.skillsUsed += 1;
        this.playerState.ce = Math.max(0, this.playerState.ce - 10);
      } else {
        this.combatSnapshot.basicsUsed += 1;
      }

      if (!target || !config) {
        this.pushFeed("No active curses in range.");
        this.emitRuntime();
        return true;
      }

      this.activeCast = {
        abilityId,
        label: cooldown.label,
        startedAt: this.time.now,
        targetId: target.name ?? `${target.x}-${target.y}`,
        releaseAt: this.time.now + config.windupMs,
        recoveryUntil: this.time.now + config.windupMs + config.recoveryMs
      };
      this.setPlayerAnimationState(abilityId, config.windupMs + config.recoveryMs);
      this.spawnCastTelegraph(target, config);
      this.time.delayedCall(config.windupMs, () => {
        this.resolveAbilityHit(abilityId, cooldown, target, config);
        this.time.delayedCall(config.recoveryMs, () => {
          this.activeCast = null;
        });
      });
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
    this.processEnemyBehavior(deltaSeconds);

    this.playerState.ce = Math.min(this.playerState.maxCe, this.playerState.ce + deltaSeconds * 3);

    const canCast = this.time.now >= this.stateLockUntil || this.playerAnimationState === "idle";

    if (canCast && Phaser.Input.Keyboard.JustDown(this.skillKeys.J)) {
      this.triggerAbility("basic");
    }
    if (canCast && Phaser.Input.Keyboard.JustDown(this.skillKeys.Q)) {
      this.triggerAbility("skill_1");
    }
    if (canCast && Phaser.Input.Keyboard.JustDown(this.skillKeys.E)) {
      this.triggerAbility("skill_2");
    }

    const dodgeTriggered = canCast && Phaser.Input.Keyboard.JustDown(keys.SPACE) && this.triggerAbility("dodge");
    const dodgeMultiplier = dodgeTriggered ? 2.2 : 1;
    const baseSpeed = this.playerState.speed ? 90 + this.playerState.speed * 4 : 140;
    const castSlowMultiplier = this.activeCast ? 0.3 : 1;
    const velocity = baseSpeed * dodgeMultiplier * castSlowMultiplier;

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
    this.animateMovement(deltaSeconds);

    if (this.playerState.hp <= 0) {
      this.setPlayerAnimationState("down", 260);
      this.playerState.hp = this.playerState.maxHp;
      this.playerState.ce = this.playerState.maxCe;
      this.resetArena();
      this.enemyRespawnCooldown = -1;
      this.pushFeed("You were overwhelmed. Arena reset.");
      this.emitRuntime();
    }

    if (Phaser.Input.Keyboard.JustDown(this.returnKey)) {
      this.commitCombatSnapshot();
      emitTransitionUpdate({
        active: true,
        label: "Leaving encounter",
        detail: "Returning combat data to the region..."
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
      return;
    }

    if (this.getEnemiesRemaining() === 0 && this.enemyRespawnCooldown === 0) {
      this.resetArena();
      this.enemyRespawnCooldown = -1;
      this.pushFeed("New curse wave has entered the arena.");
      this.commitCombatSnapshot();
      this.emitRuntime();
    }

    this.lastRuntimeEmit += deltaSeconds;
    if (this.lastRuntimeEmit >= 0.12) {
      this.lastRuntimeEmit = 0;
      this.emitRuntime();
    }
  }

  commitCombatSnapshot() {
    const snapshot = this.combatSnapshot ?? {
      basicsUsed: 0,
      skillsUsed: 0,
      dodgesUsed: 0,
      damageTaken: 0,
      kills: 0
    };
    let style = "balanced";

    if (snapshot.damageTaken >= 18) {
      style = "pressured";
    } else if (snapshot.skillsUsed > snapshot.basicsUsed + 1) {
      style = "technical";
    } else if (snapshot.kills >= 2 || snapshot.basicsUsed >= snapshot.skillsUsed) {
      style = "aggressive";
    }

    this.registry.set("combatSnapshot", {
      ...snapshot,
      style
    });
  }

  processEnemyBehavior(deltaSeconds) {
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || !enemy.body.enable) {
        return;
      }

      enemy.attackCooldown = Math.max(0, (enemy.attackCooldown ?? 0) - deltaSeconds);

      if (enemy.attackState === "windup") {
        enemy.body.setVelocity(0, 0);
        return;
      }

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance <= enemy.aggroRange) {
        this.physics.moveToObject(enemy, this.player, distance <= enemy.attackRange ? 0 : 58);
      } else {
        enemy.body.setVelocity(0, 0);
      }

      if (distance <= enemy.attackRange && enemy.attackCooldown <= 0) {
        this.startEnemyAttackTelegraph(enemy);
      }
    });
  }

  startEnemyAttackTelegraph(enemy) {
    enemy.attackState = "windup";
    enemy.attackCooldown = 1.4;
    enemy.idleTween?.pause();
    enemy.body.setVelocity(0, 0);

    const telegraph =
      enemy.enemyType === "Shrieker"
        ? this.add.circle(enemy.x, enemy.y, 54, 0xc96bff, 0.14).setStrokeStyle(2, 0xc96bff, 0.85)
        : this.add.circle(enemy.x, enemy.y, 28, 0xf25f5c, 0.14).setStrokeStyle(2, 0xf25f5c, 0.85);
    enemy.telegraphShape = telegraph;
    this.enemyTelegraphs.add(telegraph);
    this.tweens.add({
      targets: telegraph,
      scaleX: 1.18,
      scaleY: 1.18,
      alpha: 0.04,
      duration: enemy.attackWindupMs,
      ease: "Quad.easeOut",
      onComplete: () => {
        telegraph.destroy();
        enemy.telegraphShape = null;
      }
    });

    this.pushFeed(`${enemy.enemyType} is winding up.`);
    this.time.delayedCall(enemy.attackWindupMs, () => this.resolveEnemyAttack(enemy));
  }

  resolveEnemyAttack(enemy) {
    if (!enemy.active || enemy.attackState !== "windup") {
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
    enemy.attackState = "idle";
    enemy.idleTween?.resume();

    if (distance > enemy.attackRange + 18) {
      this.pushFeed(`${enemy.enemyType} missed its strike.`);
      return;
    }

    this.spawnImpactBurst(this.player.x, this.player.y, enemy.fillColor, 24);
    this.handleEnemyContact(this.player, enemy);
  }
}

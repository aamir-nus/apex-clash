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
    this.dangerOverlay = null;
    this.enemyFocusMarker = null;
    this.precisionWindowUntil = 0;
    this.burnoutUntil = 0;
    this.surgeMeter = 0;
    this.surgeActiveUntil = 0;
    this.domainCharge = 0;
    this.domainActiveUntil = 0;
    this.feedbackText = null;
    this.waveClearText = null;
  }

  create() {
    this.content = this.registry.get("content") ?? {};
    this.selectedArchetype = this.registry.get("selectedArchetype") ?? "close_combat";
    this.playerProfile = this.registry.get("playerProfile") ?? null;
    this.explorationBonus = this.registry.get("explorationBonus") ?? null;

    this.add.rectangle(arena.width / 2, arena.height / 2, arena.width, arena.height, 0x102332);
    this.add.rectangle(arena.width / 2, arena.height / 2, 820, 400, 0x0d1b26, 1).setStrokeStyle(2, 0x31556f);
    this.dangerOverlay = this.add.rectangle(arena.width / 2, arena.height / 2, 820, 400, 0xf25f5c, 0);
    this.feedbackText = this.add.text(480, 96, "", {
      color: "#f6f1df",
      fontFamily: "monospace",
      fontSize: "15px",
      align: "center"
    }).setOrigin(0.5).setAlpha(0);
    this.waveClearText = this.add.text(480, 250, "", {
      color: "#b8f29b",
      fontFamily: "monospace",
      fontSize: "22px",
      align: "center"
    }).setOrigin(0.5).setAlpha(0);
    this.enemyFocusMarker = this.add.text(0, 0, "v", {
      color: "#ffd98b",
      fontFamily: "monospace",
      fontSize: "28px"
    });
    this.enemyFocusMarker.setVisible(false);
    this.tweens.add({
      targets: this.enemyFocusMarker,
      y: "-=10",
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

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
      enemy.behaviorRole =
        enemy.enemyType === "Shrieker" ? "skirmisher" : enemy.enemyType === "Biter" ? "rushdown" : "bruiser";
      enemy.basePoise = enemy.enemyType === "Crusher" ? 36 : enemy.enemyType === "Biter" ? 22 : 16;
      enemy.poise = enemy.basePoise;
      enemy.staggeredUntil = 0;
      enemy.retreatUntil = 0;
      enemy.phaseShifted = false;
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
      { id: "domain", key: "R", label: "Domain Surge", duration: 18, remaining: 0 },
      { id: "dodge", key: "SPACE", label: "Dodge", duration: 1.2, remaining: 0 }
    ];

    this.skillKeys = this.input.keyboard.addKeys("J,Q,E,R");
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

  buildResolvedPlayerState(profile, fallbackArchetypeId, { preserveResources = false } = {}) {
    const archetypeId = profile?.classType ?? fallbackArchetypeId ?? "close_combat";
    const definition = (this.content.classes ?? []).find((entry) => entry.id === archetypeId);
    const profileStats = profile?.computedStats ?? {};
    const explorationBonus = this.registry.get("explorationBonus") ?? this.explorationBonus;
    const baseHp = (profileStats.hp ?? definition?.baseStats?.hp ?? 100) + (explorationBonus?.hpBonus ?? 0);
    const baseCe = (profileStats.ce ?? definition?.baseStats?.ce ?? 60) + (explorationBonus?.ceBonus ?? 0);
    const previousState = this.playerState;
    const hpRatio =
      preserveResources && previousState?.maxHp ? previousState.hp / previousState.maxHp : 1;
    const ceRatio =
      preserveResources && previousState?.maxCe ? previousState.ce / previousState.maxCe : 1;

    return {
      hp: Math.max(1, Math.round(baseHp * hpRatio)),
      maxHp: baseHp,
      ce: Math.max(0, Math.round(baseCe * ceRatio)),
      maxCe: baseCe,
      level: profile?.level ?? previousState?.level ?? 1,
      xp: profile?.xp ?? previousState?.xp ?? 0,
      xpToNextLevel: profile?.xpToNextLevel ?? previousState?.xpToNextLevel ?? 30,
      attack:
        (profileStats.attack ?? definition?.baseStats?.attack ?? 10) +
        (explorationBonus?.attackBonus ?? 0),
      defense:
        (profileStats.defense ?? definition?.baseStats?.defense ?? 8) +
        (explorationBonus?.defenseBonus ?? 0),
      speed:
        (profileStats.speed ?? definition?.baseStats?.speed ?? 10) +
        (explorationBonus?.speedBonus ?? 0),
      pendingStatPoints: profile?.pendingStatPoints ?? previousState?.pendingStatPoints ?? 0,
      archetype: definition?.name ?? "Unknown Build",
      combatStyle: definition?.combatStyle ?? "No style loaded",
      classType: archetypeId,
      heavenlyRestriction: archetypeId === "heavenly_restriction"
    };
  }

  syncLoadoutState(profile, fallbackArchetypeId, { preserveResources = false } = {}) {
    const archetypeId = profile?.classType ?? fallbackArchetypeId ?? this.selectedArchetype;
    this.selectedArchetype = archetypeId;
    this.registry.set("selectedArchetype", archetypeId);
    this.registry.set("playerProfile", profile ?? null);
    this.playerState = this.buildResolvedPlayerState(profile, archetypeId, {
      preserveResources
    });

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

    if (this.player?.body) {
      this.player.body.maxSpeed = 90 + this.playerState.speed * 4;
    }
  }

  applyProfile(profile, fallbackArchetypeId) {
    this.playerProfile = profile ?? null;
    this.syncLoadoutState(profile, fallbackArchetypeId);

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
    this.precisionWindowUntil = 0;
    this.burnoutUntil = 0;
    this.surgeMeter = 0;
    this.surgeActiveUntil = 0;
    this.domainCharge = 0;
    this.domainActiveUntil = 0;

    this.resetArena();
    const activeExplorationBonus = this.registry.get("explorationBonus") ?? this.explorationBonus;
    if (activeExplorationBonus?.label) {
      this.pushFeed(`Exploration boon active: ${activeExplorationBonus.label}.`);
    }
    this.pushFeed(`${this.playerState.archetype} ready: ${this.playerState.combatStyle}.`);
    this.emitRuntime();
  }

  hasPrecisionWindow() {
    return this.time.now <= this.precisionWindowUntil;
  }

  isBurnedOut() {
    return !this.playerState?.heavenlyRestriction && this.time.now < this.burnoutUntil;
  }

  isSurgeActive() {
    return this.playerState?.heavenlyRestriction && this.time.now < this.surgeActiveUntil;
  }

  isDomainActive() {
    return this.time.now < this.domainActiveUntil;
  }

  openPrecisionWindow(durationMs = 450) {
    this.precisionWindowUntil = Math.max(this.precisionWindowUntil, this.time.now + durationMs);
  }

  addSurgeMeter(amount) {
    if (!this.playerState?.heavenlyRestriction) {
      return;
    }

    this.surgeMeter = Math.min(100, this.surgeMeter + amount);
    if (this.surgeMeter >= 100 && !this.isSurgeActive()) {
      this.surgeMeter = 0;
      this.surgeActiveUntil = this.time.now + 3200;
      this.pushFeed("Predator surge awakened. Commit to close-range pressure.");
      this.spawnFloatingText(this.player.x - 14, this.player.y - 28, "surge", "#9bf6ff");
      this.playSceneFeedback("Predator surge", 0x9bf6ff, "normal");
      emitSoundEvent({ type: "enemy_down" });
    }
  }

  addDomainCharge(amount) {
    this.domainCharge = Math.min(100, this.domainCharge + amount);
  }

  enterBurnout() {
    if (this.playerState?.heavenlyRestriction || this.isBurnedOut()) {
      return;
    }

    this.burnoutUntil = this.time.now + 2800;
    this.pushFeed("Technique burnout. CE control collapsed for a moment.");
    this.spawnFloatingText(this.player.x - 20, this.player.y - 26, "burnout", "#ff8f70");
    this.playSceneFeedback("Technique burnout", 0xc77dff, "normal");
    emitSoundEvent({ type: "danger" });
  }

  getAbilityCost(abilityId) {
    if (abilityId === "domain") {
      return this.playerState?.heavenlyRestriction ? 0 : 24;
    }
    if (abilityId === "dodge") {
      return this.playerState?.heavenlyRestriction ? 0 : 6;
    }
    if (abilityId === "basic") {
      return 0;
    }
    if (this.playerState?.heavenlyRestriction) {
      return abilityId === "skill_2" ? 4 : 0;
    }
    return 10;
  }

  syncProfile(profile) {
    if (!profile || !this.playerState) {
      return;
    }

    this.playerProfile = profile;
    this.syncLoadoutState(profile, profile.classType ?? this.selectedArchetype, {
      preserveResources: true
    });
    this.pushFeed("Loadout sync applied to live combat state.");
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
      enemy.poise = enemy.basePoise;
      enemy.staggeredUntil = 0;
      enemy.retreatUntil = 0;
      enemy.phaseShifted = false;
      enemy.attackDamage =
        enemy.enemyType === "Shrieker" ? 8 : enemy.enemyType === "Biter" ? 10 : 12;
      enemy.attackWindupMs =
        enemy.enemyType === "Shrieker" ? 520 : enemy.enemyType === "Biter" ? 440 : 620;
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

  playSceneFeedback(message, color = 0xf6f1df, emphasis = "normal") {
    if (!this.feedbackText || !this.dangerOverlay) {
      return;
    }

    this.feedbackText.setText(message);
    this.feedbackText.setAlpha(1);
    this.tweens.killTweensOf(this.feedbackText);
    this.tweens.killTweensOf(this.dangerOverlay);
    this.dangerOverlay.setFillStyle(color, emphasis === "heavy" ? 0.14 : 0.08);
    this.tweens.add({
      targets: this.feedbackText,
      y: 82,
      alpha: 0,
      duration: emphasis === "heavy" ? 1500 : 1100,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.feedbackText.setY(96);
      }
    });
    this.tweens.add({
      targets: this.dangerOverlay,
      alpha: 0,
      duration: emphasis === "heavy" ? 720 : 420,
      ease: "Quad.easeOut"
    });
  }

  playWaveClearFeedback() {
    if (!this.waveClearText) {
      return;
    }

    this.waveClearText.setText("Wave Broken");
    this.waveClearText.setAlpha(1);
    this.waveClearText.setScale(0.9);
    this.tweens.killTweensOf(this.waveClearText);
    this.tweens.add({
      targets: this.waveClearText,
      scaleX: 1.08,
      scaleY: 1.08,
      y: 226,
      alpha: 0,
      duration: 950,
      ease: "Back.easeOut",
      onComplete: () => {
        this.waveClearText.setY(250);
      }
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
    if (abilityId === "domain") {
      return {
        windupMs: 220,
        recoveryMs: 120,
        baseDamage: 22,
        range: 220,
        telegraphColor: 0xf28482,
        castType: "burst"
      };
    }

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

    if (config.castType === "burst") {
      const ring = this.add.circle(this.player.x, this.player.y, 36, config.telegraphColor, 0.12);
      ring.setStrokeStyle(3, config.telegraphColor, 0.9);
      this.tweens.add({
        targets: ring,
        scaleX: 3.1,
        scaleY: 3.1,
        alpha: 0,
        duration: config.windupMs,
        ease: "Quad.easeOut",
        onComplete: () => ring.destroy()
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

    const precisionHit = this.hasPrecisionWindow();
    if (
      target.attackState === "windup" &&
      target.counterReady &&
      abilityId !== "domain" &&
      abilityId !== "skill_2" &&
      !precisionHit
    ) {
      this.playerState.hp = Math.max(1, this.playerState.hp - 8);
      this.playerState.ce = Math.max(0, this.playerState.ce - 8);
      this.pushFeed(`${target.enemyType} countered the reckless commit.`);
      this.spawnFloatingText(this.player.x + 10, this.player.y - 18, "countered", "#ff8f70");
      this.playSceneFeedback("Counter punished", 0xff8f70, "heavy");
      emitSoundEvent({ type: "danger" });
      this.emitRuntime();
      return;
    }

    const surgeMultiplier = this.isSurgeActive() ? 1.25 : 1;
    const burnoutMultiplier = this.isBurnedOut() ? 0.7 : 1;
    const precisionMultiplier = precisionHit ? 1.6 : 1;
    const domainMultiplier = this.isDomainActive() ? 1.35 : 1;
    const damage = Math.floor((config.baseDamage + this.playerState.attack) * surgeMultiplier * burnoutMultiplier * precisionMultiplier * domainMultiplier);
    const staggerDamage =
      (abilityId === "basic" ? 8 : abilityId === "skill_1" ? 14 : abilityId === "domain" ? 18 : 10) +
      (precisionHit ? 8 : 0);
    target.health -= damage;
    target.poise = Math.max(0, (target.poise ?? 0) - staggerDamage);
    target.counterReady = false;
    this.pushFeed(
      precisionHit
        ? `${cooldown.label} landed in the precision window for ${damage}.`
        : `${cooldown.label} hit for ${damage}.`
    );
    emitSoundEvent({ type: target.health <= 0 ? "enemy_down" : "skill_cast" });
    this.flashTarget(target, 0xffffff);
    this.spawnFloatingText(
      target.x + 6,
      target.y - 12,
      `${damage}${precisionHit ? " !" : ""}`,
      precisionHit ? "#ffe066" : "#ffd98b"
    );
    if (precisionHit) {
      this.playSceneFeedback("Precision punish", 0xffe066, "normal");
    }

    if (precisionHit) {
      if (this.playerState.heavenlyRestriction) {
        this.addSurgeMeter(35);
      } else {
        this.playerState.ce = Math.min(this.playerState.maxCe, this.playerState.ce + 8);
      }
      this.addDomainCharge(12);
      this.precisionWindowUntil = 0;
    }

    if (config.castType === "projectile") {
      this.animateProjectile(target, config.telegraphColor);
    } else {
      this.animatePlayerStrike(target, abilityId === "skill_1" ? "skill" : "basic");
      this.spawnImpactBurst(target.x, target.y, config.telegraphColor, 20);
    }

    this.animateEnemyHit(target, target.health <= 0);

    if (target.active && target.health > 0 && target.poise === 0) {
      target.attackState = "staggered";
      target.staggeredUntil = this.time.now + 900;
      target.body.setVelocity(0, 0);
      this.pushFeed(`${target.enemyType} is staggered. Commit to the punish window.`);
      emitSoundEvent({ type: "enemy_down" });
      this.spawnFloatingText(target.x + 8, target.y - 26, "stagger", "#9bf6ff");
      this.playSceneFeedback(`${target.enemyType} staggered`, 0x9bf6ff, "normal");
    }

    if (target.health <= 0) {
      this.combatSnapshot.kills += 1;
      this.addSurgeMeter(18);
      this.addDomainCharge(18);
      target.active = false;
      target.body.enable = false;
      this.animateEnemyDefeat(target);
      this.gainXp(15);
      this.pushFeed("Curse eliminated. XP +15.");
      if (this.getEnemiesRemaining() === 0) {
        this.enemyRespawnCooldown = 2;
        this.playWaveClearFeedback();
        this.playSceneFeedback("Arena cleared", 0xb8f29b, "heavy");
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
    if (this.hasPrecisionWindow()) {
      activeEffects.push({
        id: "precision-window",
        label: "Precision window",
        detail: "Follow up now for burst damage and flow gain",
        tone: "boon"
      });
    }
    if (this.isBurnedOut()) {
      activeEffects.push({
        id: "technique-burnout",
        label: "Technique burnout",
        detail: "CE control is unstable and skill output is reduced",
        tone: "danger"
      });
    }
    if (this.playerState?.heavenlyRestriction) {
      activeEffects.push({
        id: "predator-rhythm",
        label: this.isSurgeActive() ? "Predator surge" : "Predator rhythm",
        detail: this.isSurgeActive()
          ? "Weapon pressure and movement are amplified"
          : `Build momentum through close combat (${Math.round(this.surgeMeter)}%)`,
        tone: this.isSurgeActive() ? "boon" : "neutral"
      });
    }
    if (this.isDomainActive()) {
      activeEffects.push({
        id: "domain-surge",
        label: "Domain surge",
        detail: "Technique pressure is amplified and curses are suppressed",
        tone: "boon"
      });
    } else {
      activeEffects.push({
        id: "domain-charge",
        label: "Domain charge",
        detail: `${Math.round(this.domainCharge)}%`,
        tone: this.domainCharge >= 100 ? "boon" : "neutral"
      });
    }
    const staggeredEnemies = this.enemies
      .getChildren()
      .filter((enemy) => enemy.active && enemy.attackState === "staggered").length;
    if (staggeredEnemies > 0) {
      activeEffects.push({
        id: "enemy-stagger",
        label: "Curse stagger",
        detail: `${staggeredEnemies} curse${staggeredEnemies > 1 ? "s" : ""} open to punish`,
        tone: "boon"
      });
    }
    if (this.enemies.getChildren().some((enemy) => enemy.active && enemy.phaseShifted)) {
      activeEffects.push({
        id: "elite-phase",
        label: "Phase shift",
        detail: "A heavy curse has entered an unstable state",
        tone: "danger"
      });
    }
    if (this.enemies.getChildren().some((enemy) => enemy.active && enemy.counterReady)) {
      activeEffects.push({
        id: "enemy-counter",
        label: "Counter-ready curse",
        detail: "A windup can punish reckless melee commits",
        tone: "danger"
      });
    }

    const resumeSource = this.registry.get("resumeSource") ?? "fresh-start";

    emitRuntimeUpdate({
      scene: {
        scene: "combat",
        label: "Combat"
      },
      player: this.playerState,
      controls: [
        { key: "WASD", label: "Move" },
        { key: "J", label: "Basic strike" },
        { key: "Q / E", label: "Skills" },
        { key: "R", label: "Domain surge" },
        { key: "SPACE", label: "Dodge" },
        { key: "H", label: "Back to region" }
      ],
      cooldowns: this.cooldowns.map((entry) => ({
        id: entry.id,
        key: entry.key,
        label: entry.label,
        remaining: entry.remaining
      })),
      resumeSource,
      objective: {
        title: this.getEnemiesRemaining() > 0 ? "Win the encounter" : "Prepare for the next wave",
        detail:
          this.getEnemiesRemaining() > 0
            ? "Exploit precision windows, avoid counters, and build toward Domain Surge."
            : "Reset positioning or return to the region with your combat read.",
        step:
          this.getEnemiesRemaining() > 0
            ? "Use J / Q / E / R with timing discipline"
            : "Press H to leave or wait for the next curse wave"
      },
      castState: this.getCastRuntimeState(),
      activeEffects,
      sessionState: {
        explorationBonus: this.explorationBonus,
        combatSnapshot: this.combatSnapshot,
        precisionWindow: this.hasPrecisionWindow(),
        burnoutActive: this.isBurnedOut(),
        surgeMeter: this.surgeMeter,
        surgeActive: this.isSurgeActive(),
        domainCharge: this.domainCharge,
        domainActive: this.isDomainActive()
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
    this.openPrecisionWindow(380);
    this.addSurgeMeter(12);
    this.addDomainCharge(6);
    this.pushFeed(
      `You took ${incomingDamage} damage from ${
        enemy.enemyType ? `a ${enemy.enemyType.toLowerCase()}` : "a curse"
      }.`
    );
    emitSoundEvent({ type: this.playerState.hp <= this.playerState.maxHp * 0.3 ? "low_resource" : "hit_confirm" });
    this.flashTarget(player, 0xf25f5c);
    this.spawnImpactBurst(player.x, player.y, 0xf25f5c, 20);
    this.spawnFloatingText(player.x + 10, player.y - 10, `-${incomingDamage}`, "#ff8f70");
    if (this.playerState.hp <= this.playerState.maxHp * 0.3) {
      this.playSceneFeedback("Critical condition", 0xf25f5c, "heavy");
    }
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

    const ceCost = this.getAbilityCost(abilityId);
    if (abilityId !== "basic" && this.isBurnedOut()) {
      this.pushFeed("Technique burnout is active. Reposition or use basics.");
      emitSoundEvent({ type: "low_resource" });
      this.emitRuntime();
      return false;
    }

    if (abilityId !== "basic" && this.playerState.ce < ceCost) {
      this.pushFeed("Not enough CE. Use basic attacks or wait for regen.");
      emitSoundEvent({ type: "low_resource" });
      this.emitRuntime();
      return false;
    }

    cooldown.remaining = cooldown.duration;

    if (abilityId === "domain") {
      if (this.domainCharge < 100) {
        this.pushFeed("Domain surge not ready yet.");
        cooldown.remaining = 0;
        this.emitRuntime();
        return false;
      }

      this.domainCharge = 0;
      this.domainActiveUntil = this.time.now + 3400;
      this.playerState.ce = Math.max(0, this.playerState.ce - ceCost);
      this.combatSnapshot.skillsUsed += 1;
      this.pushFeed("Domain surge deployed. Pressure the curses now.");
      this.spawnFloatingText(this.player.x - 18, this.player.y - 30, "domain", "#ffe066");
      this.playSceneFeedback("Domain surge deployed", 0xf28482, "heavy");
      emitSoundEvent({ type: "enemy_down" });
      const target = this.getPrimaryEnemyTarget(9999);
      const config = this.getAbilityConfig("domain");
      this.activeCast = {
        abilityId,
        label: cooldown.label,
        startedAt: this.time.now,
        targetId: target?.name ?? "domain",
        releaseAt: this.time.now + config.windupMs,
        recoveryUntil: this.time.now + config.windupMs + config.recoveryMs
      };
      this.setPlayerAnimationState("domain", config.windupMs + config.recoveryMs);
      this.spawnCastTelegraph(target ?? this.player, config);
      this.time.delayedCall(config.windupMs, () => {
        this.enemies.getChildren().forEach((enemy) => {
          if (enemy.active) {
            this.resolveAbilityHit("domain", cooldown, enemy, config);
          }
        });
        this.time.delayedCall(config.recoveryMs, () => {
          this.activeCast = null;
        });
      });
    } else if (abilityId === "dodge") {
      this.combatSnapshot.dodgesUsed += 1;
      this.playerState.ce = Math.max(0, this.playerState.ce - ceCost);
      this.openPrecisionWindow(520);
      this.addSurgeMeter(16);
      this.pushFeed("Dodge primed. Reposition through pressure.");
      this.playSceneFeedback("Precision dodge", 0x74c0fc, "normal");
      emitSoundEvent({ type: "dodge" });
      this.setPlayerAnimationState("dodge", 160);
      this.animateDodge();
    } else {
      const config = this.getAbilityConfig(abilityId);
      const target = this.getPrimaryEnemyTarget(config?.range ?? 9999);

      if (abilityId !== "basic") {
        this.combatSnapshot.skillsUsed += 1;
        this.playerState.ce = Math.max(0, this.playerState.ce - ceCost);
      } else {
        this.combatSnapshot.basicsUsed += 1;
        this.openPrecisionWindow(320);
        this.addSurgeMeter(10);
      }

      if (!this.playerState.heavenlyRestriction && this.playerState.ce <= Math.max(6, this.playerState.maxCe * 0.12)) {
        this.enterBurnout();
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
    const focusedEnemy = this.getPrimaryEnemyTarget(260);
    if (focusedEnemy?.active) {
      this.enemyFocusMarker.setPosition(focusedEnemy.x - 8, focusedEnemy.y - 34);
      this.enemyFocusMarker.setVisible(true);
      this.enemyFocusMarker.setColor(
        focusedEnemy.attackState === "windup"
          ? "#ff8f70"
          : focusedEnemy.attackState === "staggered"
            ? "#9bf6ff"
            : "#ffd98b"
      );
    } else {
      this.enemyFocusMarker.setVisible(false);
    }
    const lowHpDanger = this.playerState.hp <= this.playerState.maxHp * 0.3;
    const dangerAlpha = this.isBurnedOut()
      ? 0.12
      : lowHpDanger
        ? 0.08
        : this.enemies.getChildren().some((enemy) => enemy.active && enemy.attackState === "windup")
          ? 0.05
          : 0;
    this.dangerOverlay.setAlpha(Phaser.Math.Linear(this.dangerOverlay.alpha, dangerAlpha, 0.18));
    this.dangerOverlay.fillColor = this.isBurnedOut() ? 0xc77dff : 0xf25f5c;

    const ceRegenRate = this.playerState.heavenlyRestriction
      ? 1.4
      : this.isDomainActive()
        ? 4.2
        : this.isBurnedOut()
          ? 0.6
          : 3;
    this.playerState.ce = Math.min(this.playerState.maxCe, this.playerState.ce + deltaSeconds * ceRegenRate);

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
    if (canCast && Phaser.Input.Keyboard.JustDown(this.skillKeys.R)) {
      this.triggerAbility("domain");
    }

    const dodgeTriggered = canCast && Phaser.Input.Keyboard.JustDown(keys.SPACE) && this.triggerAbility("dodge");
    const dodgeMultiplier = dodgeTriggered ? 2.2 : 1;
    const baseSpeed = this.playerState.speed ? 90 + this.playerState.speed * 4 : 140;
    const surgeMultiplier = this.isSurgeActive() ? 1.18 : 1;
    const castSlowMultiplier = this.activeCast ? 0.3 : 1;
    const velocity = baseSpeed * dodgeMultiplier * castSlowMultiplier * surgeMultiplier;

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
    } else if (this.playerState?.heavenlyRestriction && snapshot.basicsUsed >= snapshot.skillsUsed) {
      style = "predatory";
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
      if (enemy.enemyType === "Crusher" && !enemy.phaseShifted && enemy.health <= enemy.maxHealth * 0.5) {
        enemy.phaseShifted = true;
        enemy.attackDamage += 4;
        enemy.attackWindupMs = 420;
        enemy.basePoise += 10;
        enemy.poise = Math.max(enemy.poise, enemy.basePoise);
        this.pushFeed("Crusher phase shift. Its guard thickens and the slam speeds up.");
        emitSoundEvent({ type: "danger" });
      }

      if (enemy.attackState === "windup") {
        enemy.body.setVelocity(0, 0);
        return;
      }

      if (enemy.attackState === "staggered") {
        enemy.body.setVelocity(0, 0);
        if (this.time.now >= enemy.staggeredUntil) {
          enemy.attackState = "idle";
          enemy.poise = enemy.basePoise;
          this.pushFeed(`${enemy.enemyType} recovered its footing.`);
        }
        return;
      }

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance <= enemy.aggroRange) {
        if (enemy.behaviorRole === "skirmisher" && distance < 108 && this.time.now > enemy.retreatUntil) {
          enemy.retreatUntil = this.time.now + 260;
        }

        if (enemy.behaviorRole === "skirmisher" && this.time.now < enemy.retreatUntil) {
          const retreatAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
          enemy.body.setVelocity(Math.cos(retreatAngle) * 76, Math.sin(retreatAngle) * 76);
        } else if (
          enemy.behaviorRole === "bruiser" &&
          (this.hasPrecisionWindow() || this.isSurgeActive())
        ) {
          this.physics.moveToObject(enemy, this.player, distance <= enemy.attackRange ? 24 : 68);
        } else if (
          enemy.behaviorRole === "rushdown" &&
          (this.isBurnedOut() || this.playerState.hp <= this.playerState.maxHp * 0.45)
        ) {
          this.physics.moveToObject(enemy, this.player, 88);
        } else {
          this.physics.moveToObject(enemy, this.player, distance <= enemy.attackRange ? 0 : 58);
        }
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
    enemy.attackCooldown =
      enemy.behaviorRole === "rushdown" && (this.isBurnedOut() || this.playerState.hp <= this.playerState.maxHp * 0.45)
        ? 1.0
        : 1.4;
    enemy.idleTween?.pause();
    enemy.body.setVelocity(0, 0);
    enemy.counterReady = enemy.enemyType !== "Shrieker";

    const telegraph =
      enemy.enemyType === "Shrieker"
        ? this.add.circle(enemy.x, enemy.y, 54, 0xc96bff, 0.14).setStrokeStyle(2, 0xc96bff, 0.85)
        : this.add.circle(enemy.x, enemy.y, 28, 0xf25f5c, 0.14).setStrokeStyle(2, 0xf25f5c, 0.85);
    const label = this.add.text(
      enemy.x - 24,
      enemy.y - 42,
      enemy.enemyType === "Shrieker" ? "beam" : enemy.enemyType === "Crusher" ? "slam" : "lunge",
      {
        color: "#f6f1df",
        fontFamily: "monospace",
        fontSize: "11px"
      }
    );
    enemy.telegraphShape = telegraph;
    enemy.telegraphLabel = label;
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
        label.destroy();
        enemy.telegraphShape = null;
        enemy.telegraphLabel = null;
      }
    });
    this.time.delayedCall(Math.floor(enemy.attackWindupMs * 0.55), () => {
      if (enemy.active && enemy.attackState === "windup") {
        enemy.counterReady = false;
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
    enemy.counterReady = false;
    enemy.idleTween?.resume();
    enemy.telegraphLabel?.destroy();
    enemy.telegraphLabel = null;

    if (distance > enemy.attackRange + 18) {
      this.pushFeed(`${enemy.enemyType} missed its strike.`);
      return;
    }

    this.spawnImpactBurst(this.player.x, this.player.y, enemy.fillColor, 24);
    this.handleEnemyContact(this.player, enemy);
  }
}

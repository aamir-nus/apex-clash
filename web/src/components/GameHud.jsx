import { useEffect, useState } from "react";
import { BINDABLE_SKILL_KEYS } from "../utils/skillBindings";
import { getBuildImpact, getCombatRole, getRoleTone } from "../utils/skillPresentation";

function StatBar({ label, value, max, tone }) {
  const width = max > 0 ? `${Math.max(0, Math.min(100, (value / max) * 100))}%` : "0%";

  return (
    <div className="hud-bar">
      <div className="hud-bar-label">
        <span>{label}</span>
        <strong>
          {value}/{max}
        </strong>
      </div>
      <div className="hud-bar-track">
        <div className={`hud-bar-fill ${tone}`} style={{ width }} />
      </div>
    </div>
  );
}

function CastMeter({ castState }) {
  const width = `${Math.max(0, Math.min(100, (castState?.progress ?? 0) * 100))}%`;
  return (
    <section className="hud-panel">
      <p className="hud-kicker">Cast State</p>
      <div className="cast-meter-card">
        <div className="cast-meter-copy">
          <strong>{castState?.label ?? "No active cast"}</strong>
          <span>{castState?.phase ?? "idle"}</span>
        </div>
        <div className="cast-meter-track">
          <div className="cast-meter-fill" style={{ width }} />
        </div>
      </div>
    </section>
  );
}

function formatDelta(delta) {
  return `${delta > 0 ? "+" : ""}${delta}`;
}

function getGradeDisplay(gradeId) {
  const gradeNames = {
    special_grade: "Special",
    special_grade_candidate: "Candidate",
    grade_1: "1st",
    grade_2: "2nd",
    grade_3: "3rd",
    grade_4: "4th"
  };
  return gradeNames[gradeId] || "4th";
}

export function GameHud({
  runtime,
  latestReward,
  loadoutFeedback,
  profile,
  routeBriefing,
  gradeStatus,
  endgameStatus,
  nextCraftLabel,
  nextUnlockLabel,
  soundEnabled,
  onToggleSound
}) {
  const [activeFeedbackId, setActiveFeedbackId] = useState(null);
  const equippedItems = profile?.equippedItems ?? [];
  const equippedSkills = profile?.equippedSkills ?? [];
  const activeConsumableIds = profile?.activeConsumableIds ?? [];
  const activeConsumables = (profile?.inventoryItems ?? []).filter((item) =>
    activeConsumableIds.includes(item.id)
  );
  const promotionLabel = gradeStatus?.eligible
    ? `Promotion ready: ${gradeStatus?.nextGrade?.name ?? "next grade"}`
    : gradeStatus?.issues?.[0] ?? "Promotion progress pending";
  const masteryLabel = endgameStatus
    ? `${(endgameStatus.techniqueMasteryRank ?? "novice").replace(/_/g, " ")} · ${endgameStatus.techniqueMasteryProgress ?? 0}%`
    : `${(profile?.techniqueMasteryRank ?? "novice").replace(/_/g, " ")} · ${profile?.techniqueMasteryProgress ?? 0}%`;
  const ascensionLabel = endgameStatus
    ? endgameStatus.ascensionComplete
      ? "Ascension complete"
      : endgameStatus.ascensionEligible
        ? "Ascension ready"
        : endgameStatus.ascensionIssues?.[0] ?? "Ascension locked"
    : "Ascension sync pending";
  const anomalyLabel = endgameStatus?.anomalySectorAccess?.length
    ? `${endgameStatus.anomalySectorAccess.length} anomaly sectors available`
    : "No anomaly sectors open";
  const skillBindings = BINDABLE_SKILL_KEYS;
  const feedbackFresh = loadoutFeedback?.createdAt === activeFeedbackId;
  const highlightedCooldownKeys = new Set(
    feedbackFresh && loadoutFeedback?.type === "skills"
      ? (loadoutFeedback.skillBindings ?? []).map((entry) => entry.key)
      : []
  );

  useEffect(() => {
    if (!loadoutFeedback?.createdAt) {
      setActiveFeedbackId(null);
      return undefined;
    }

    setActiveFeedbackId(loadoutFeedback.createdAt);
    const timeoutId = window.setTimeout(() => {
      setActiveFeedbackId((current) =>
        current === loadoutFeedback.createdAt ? null : current
      );
    }, 6000);

    return () => window.clearTimeout(timeoutId);
  }, [loadoutFeedback]);

  return (
    <div className="game-hud">
      <div className="hud-topline">
        <div>
          <p className="hud-kicker">Live Session</p>
          <h3>{runtime.player.archetype}</h3>
          <small className="scene-label">Scene: {runtime.scene.label}</small>
          <small className="scene-label">Resume: {runtime.resumeSource}</small>
        </div>
        <button className="sound-toggle" onClick={onToggleSound} type="button">
          Sound: {soundEnabled ? "On" : "Off"}
        </button>
      </div>

      <section className="controls-strip">
        {runtime.controls.map((control) => (
          <div key={`${control.key}-${control.label}`} className="control-chip">
            <strong>{control.key}</strong>
            <span>{control.label}</span>
          </div>
        ))}
      </section>

      {latestReward ? (
        <section className="reward-banner">
          <strong>Reward secured</strong>
          <div className="reward-banner-copy">
            <span>
              {latestReward.name} · {latestReward.type} · {latestReward.rarity}
            </span>
            {latestReward.type === "scroll" ? (
              <small>
                <span className={`role-chip ${getRoleTone(latestReward)}`}>{getCombatRole(latestReward)}</span>
                <span>{getBuildImpact(latestReward)}</span>
              </small>
            ) : null}
          </div>
        </section>
      ) : null}

      {runtime.objective ? (
        <section className="objective-banner">
          <div>
            <p className="hud-kicker">Now</p>
            <strong>{runtime.objective.title}</strong>
            <span>{runtime.objective.detail}</span>
          </div>
          {runtime.objective.step ? <small className="objective-step">{runtime.objective.step}</small> : null}
        </section>
      ) : null}

      {loadoutFeedback && feedbackFresh ? (
        <section className="loadout-banner">
          <div>
            <strong>{loadoutFeedback.title}</strong>
            <span>{loadoutFeedback.detail}</span>
          </div>
          {loadoutFeedback.statDelta?.length ? (
            <div className="loadout-deltas">
              {loadoutFeedback.statDelta.map((entry) => (
                <span key={`${entry.key}-${entry.delta}`} className="delta-chip">
                  {entry.key.toUpperCase()} {formatDelta(entry.delta)}
                </span>
              ))}
            </div>
          ) : (
            <small>No stat delta, runtime bindings updated.</small>
          )}
        </section>
      ) : null}

      <div className="hud-grid">
        <section className="hud-panel">
          <StatBar label="HP" value={runtime.player.hp} max={runtime.player.maxHp} tone="hp" />
          <StatBar label="CE" value={runtime.player.ce} max={runtime.player.maxCe} tone="ce" />
          <div className="hud-meta">
            <span>Level {runtime.player.level}</span>
            <span>Grade {getGradeDisplay(runtime.player.sorcererGrade)}</span>
            <span>XP {runtime.player.xp}</span>
            <span>Next {runtime.player.xpToNextLevel}</span>
            <span>Pts {runtime.player.pendingStatPoints}</span>
            <span>{runtime.encounter.status}</span>
          </div>
        </section>

        <CastMeter castState={runtime.castState} />

        <section className="hud-panel">
          <p className="hud-kicker">Loadout Sync</p>
          <div className="loadout-summary">
            {equippedItems.length ? (
              equippedItems.map((item) => (
                <div key={item.id} className="loadout-chip">
                  <strong>{item.equipSlot}</strong>
                  <span>{item.name}</span>
                </div>
              ))
            ) : (
              <div className="loadout-chip">
                <strong>gear</strong>
                <span>Login to sync persistent loadout</span>
              </div>
            )}
          </div>
        </section>

        <section className="hud-panel">
          <p className="hud-kicker">Bound Skills</p>
          <div className="loadout-summary">
            {equippedSkills.length ? (
              equippedSkills.map((skill, index) => (
                <div key={skill.id} className="loadout-chip skill-chip">
                  <strong>{skillBindings[index] ?? `S${index + 1}`}</strong>
                  <span>{skill.name}</span>
                  <small>
                    {skill.castType} · CD {skill.cooldown}s · Cost {skill.cost}
                  </small>
                  <div className="hud-skill-role">
                    <span className={`role-chip ${getRoleTone(skill)}`}>{getCombatRole(skill)}</span>
                    <small>{getBuildImpact(skill)}</small>
                  </div>
                  {feedbackFresh && highlightedCooldownKeys.has(skillBindings[index] ?? `S${index + 1}`) ? (
                    <small className="rebound-label">Fresh bind</small>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="loadout-chip skill-chip">
                <strong>skills</strong>
                <span>Bind techniques from the moveset panel</span>
              </div>
            )}
            <div className="loadout-chip skill-chip reserved-chip">
              <strong>R</strong>
              <span>Domain Surge</span>
              <small>Reserved runtime slot</small>
            </div>
          </div>
        </section>

        <section className="hud-panel">
          <p className="hud-kicker">Combat State</p>
          <div className="effect-grid">
            {runtime.activeEffects.length ? (
              runtime.activeEffects.map((effect) => (
                <div key={effect.id} className={`effect-chip ${effect.tone ?? "neutral"}`}>
                  <strong>{effect.label}</strong>
                  <span>{effect.detail}</span>
                </div>
              ))
            ) : (
              <div className="effect-chip neutral">
                <strong>Stable</strong>
                <span>No active combat modifiers</span>
              </div>
            )}
          </div>
        </section>

        <section className="hud-panel">
          <p className="hud-kicker">Route Payoff</p>
          <div className="payoff-grid">
            <div className="effect-chip boon">
              <strong>{routeBriefing?.label ?? "Current route"}</strong>
              <span>{routeBriefing?.reward ?? "Route reward payoff pending"}</span>
            </div>
            <div className="effect-chip neutral">
              <strong>Unlock Track</strong>
              <span>{routeBriefing?.unlock ?? "Unlock path pending"}</span>
            </div>
            <div className="effect-chip danger">
              <strong>Hazard Read</strong>
              <span>{routeBriefing?.hazard ?? "Hazard cadence unresolved"}</span>
            </div>
            <div className="effect-chip neutral">
              <strong>Do Next</strong>
              <span>{nextUnlockLabel ?? "Hold the current route ladder until the next unlock opens."}</span>
            </div>
          </div>
        </section>

        <section className="hud-panel">
          <p className="hud-kicker">Rank Track</p>
          <div className="effect-grid">
            <div className="effect-chip boon">
              <strong>{gradeStatus?.currentGrade?.name ?? `Grade ${getGradeDisplay(runtime.player.sorcererGrade)}`}</strong>
              <span>{promotionLabel}</span>
            </div>
            <div className="effect-chip neutral">
              <strong>Technique Mastery</strong>
              <span>{masteryLabel}</span>
            </div>
            <div className="effect-chip neutral">
              <strong>Trials</strong>
              <span>
                {endgameStatus?.trialCompletion
                  ? `${endgameStatus.trialCompletion.completed}/${endgameStatus.trialCompletion.total} cleared`
                  : `${profile?.firstGradeTrialClears?.length ?? 0} cleared`}
              </span>
            </div>
            <div className="effect-chip danger">
              <strong>Ascension</strong>
              <span>{ascensionLabel}</span>
            </div>
            <div className="effect-chip neutral">
              <strong>Anomaly Access</strong>
              <span>{anomalyLabel}</span>
            </div>
          </div>
        </section>

        <section className="hud-panel">
          <p className="hud-kicker">Active Tonics</p>
          <div className="effect-grid">
            {activeConsumables.length ? (
              activeConsumables.map((item, index) => (
                <div key={item.id} className="effect-chip boon">
                  <strong>{item.name}</strong>
                  <span>
                    {index === 0
                      ? `${item.rarity} tonic is active. Spend this window before the next boss lane closes.`
                      : `${item.rarity} tonic synced into the live route state`}
                  </span>
                </div>
              ))
            ) : (
              <div className="effect-chip neutral">
                <strong>No tonics active</strong>
                <span>
                  {nextCraftLabel
                    ? `Use stash consumables now or craft ${nextCraftLabel} before the next route push.`
                    : "Use stash consumables to push the next route window."}
                </span>
              </div>
            )}
            <div className="effect-chip neutral">
              <strong>Craft Queue</strong>
              <span>{nextCraftLabel ?? "No craft ready. Keep routing materials through the current run."}</span>
            </div>
          </div>
        </section>

        <section className="hud-panel">
          <p className="hud-kicker">Cooldowns</p>
          <div className="cooldown-row">
            {runtime.cooldowns.map((cooldown) => (
              <div
                key={cooldown.id}
                className={
                  highlightedCooldownKeys.has(cooldown.key)
                    ? "cooldown-card rebound"
                    : "cooldown-card"
                }
              >
                <strong>{cooldown.key}</strong>
                <span>{cooldown.label}</span>
                <small>{cooldown.remaining > 0 ? `${cooldown.remaining.toFixed(1)}s` : "Ready"}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="hud-panel">
          <p className="hud-kicker">Combat Feed</p>
          <div className="combat-feed">
            {runtime.combatFeed.map((entry) => (
              <div key={entry.id} className="feed-entry">
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

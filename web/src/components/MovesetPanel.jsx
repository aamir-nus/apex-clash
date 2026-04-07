import { BINDABLE_SKILL_KEYS, buildManualToggleSkillIds } from "../utils/skillBindings";

const slotLabels = BINDABLE_SKILL_KEYS;

export function MovesetPanel({
  skills,
  equippedSkillIds = [],
  latestReward,
  onEquipSkills,
  onQuickBindReward,
  locked
}) {
  const boundSkills = slotLabels.map((slotLabel, index) => {
    const boundSkillId = equippedSkillIds[index];
    const skill = skills.find((entry) => entry.id === boundSkillId) ?? null;
    return {
      slotLabel,
      skill
    };
  });

  return (
    <section className="panel">
      <h2>Moveset</h2>
      {locked ? <p className="hero-text">Login to bind and persist your moveset.</p> : null}
      {latestReward?.type === "scroll" ? (
        <div className="reward-card">
          <strong>New scroll: {latestReward.name}</strong>
          <span>
            {latestReward.castType} · CD {latestReward.cooldown}s
          </span>
          <button className="mini-button" disabled={locked} onClick={onQuickBindReward} type="button">
            Quick bind
          </button>
        </div>
      ) : null}
      <div className="moveset-section">
        <div className="panel-header compact">
          <strong>Bound Slots</strong>
          <small>Live runtime bindings, Domain Surge stays on R</small>
        </div>
        <div className="moveset-slots">
          {boundSkills.map((entry) => (
            <div key={entry.slotLabel} className={entry.skill ? "move-slot active" : "move-slot"}>
              <strong>{entry.slotLabel}</strong>
              <span>{entry.skill?.name ?? "Empty"}</span>
              <small>
                {entry.skill
                  ? `${entry.skill.castType} · CD ${entry.skill.cooldown}s · Cost ${entry.skill.cost}`
                  : "Bind a technique from the library below"}
              </small>
            </div>
          ))}
        </div>
      </div>
      <div className="moveset-section">
        <div className="panel-header compact">
          <strong>Technique Library</strong>
          <small>Click to bind or unbind to Q / E</small>
        </div>
      </div>
      <div className="moveset-grid">
        {skills.map((skill) => (
          <button
            key={skill.id}
            className={equippedSkillIds.includes(skill.id) ? "move-card active" : "move-card"}
            disabled={locked}
            onClick={() => {
              const next = buildManualToggleSkillIds(equippedSkillIds, skill.id);
              onEquipSkills(next);
            }}
            type="button"
          >
            <div className="move-topline">
              <strong>
                {equippedSkillIds.includes(skill.id)
                  ? boundSkills.find((entry) => entry.skill?.id === skill.id)?.slotLabel ?? "Bound"
                  : "Library"}
              </strong>
              <span>{skill.name}</span>
            </div>
            <div className="move-meta">
              <small>{skill.castType}</small>
              <small>Cost {skill.cost}</small>
              <small>CD {skill.cooldown}s</small>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

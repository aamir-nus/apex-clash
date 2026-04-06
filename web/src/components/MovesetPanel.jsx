export function MovesetPanel({ skills, equippedSkillIds = [], onEquipSkills, locked }) {
  return (
    <section className="panel">
      <h2>Moveset</h2>
      {locked ? <p className="hero-text">Login to bind and persist your moveset.</p> : null}
      <div className="moveset-grid">
        {skills.map((skill, index) => (
          <button
            key={skill.id}
            className={equippedSkillIds.includes(skill.id) ? "move-card active" : "move-card"}
            disabled={locked}
            onClick={() => {
              const next = equippedSkillIds.includes(skill.id)
                ? equippedSkillIds.filter((id) => id !== skill.id)
                : [...equippedSkillIds, skill.id].slice(0, 4);
              onEquipSkills(next);
            }}
            type="button"
          >
            <div className="move-topline">
              <strong>{["Q", "W", "E", "R"][index] ?? "P"}</strong>
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

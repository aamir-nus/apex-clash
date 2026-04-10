export const BINDABLE_SKILL_KEYS = ["Q", "E"];

export function normalizeEquippedSkillIds(skillIds = []) {
  return [...new Set(skillIds.filter(Boolean))].slice(0, BINDABLE_SKILL_KEYS.length);
}

export function buildQuickBindSkillIds(equippedSkillIds = [], nextSkillId) {
  const current = normalizeEquippedSkillIds(equippedSkillIds);
  if (!nextSkillId) {
    return current;
  }

  if (current.includes(nextSkillId)) {
    return current;
  }

  if (current.length < BINDABLE_SKILL_KEYS.length) {
    return [...current, nextSkillId];
  }

  return [current[0], nextSkillId];
}

export function buildManualToggleSkillIds(equippedSkillIds = [], skillId) {
  const current = normalizeEquippedSkillIds(equippedSkillIds);
  if (!skillId) {
    return current;
  }

  if (current.includes(skillId)) {
    return current.filter((entry) => entry !== skillId);
  }

  if (current.length < BINDABLE_SKILL_KEYS.length) {
    return [...current, skillId];
  }

  return [current[0], skillId];
}

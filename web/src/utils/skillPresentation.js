export function getCombatRole(skill) {
  if (skill.castType === "dash_attack") {
    return "Gap close and punish";
  }

  if (skill.castType === "projectile") {
    return "Spacing and lane control";
  }

  if (skill.castType === "aoe_burst") {
    return "Break window burst";
  }

  if (skill.castType === "melee_strike") {
    return "Close-range confirm";
  }

  if (skill.castType === "buff") {
    return "Tempo and self-buff";
  }

  return "General combat technique";
}

export function getBuildImpact(skill) {
  if (skill.classRestrictions?.includes("heavenly_restriction")) {
    return "Best when you stay on bodies, surge pressure, and low-CE aggression.";
  }

  if (skill.castType === "projectile") {
    return "Rewards safer spacing and CE-efficient pressure from range.";
  }

  if (skill.castType === "aoe_burst") {
    return "Best as a punish tool when the chamber opens a clean break window.";
  }

  if (skill.castType === "dash_attack") {
    return "Best when you are forcing entries, stagger windows, and route tempo.";
  }

  if (skill.castType === "buff") {
    return "Helps stabilize tempo before a boss lane or pressure spike.";
  }

  return "Supports a balanced route build without overcommitting one lane.";
}

export function getRoleTone(skill) {
  if (skill.castType === "projectile") {
    return "spacing";
  }

  if (skill.castType === "aoe_burst") {
    return "burst";
  }

  if (skill.castType === "dash_attack" || skill.castType === "melee_strike") {
    return "pressure";
  }

  if (skill.castType === "buff") {
    return "tempo";
  }

  return "neutral";
}

import assert from "node:assert/strict";
import {
  buildManualToggleSkillIds,
  buildQuickBindSkillIds,
  normalizeEquippedSkillIds
} from "../web/src/utils/skillBindings.js";

assert.deepEqual(normalizeEquippedSkillIds(["a", "b", "a", null]), ["a", "b"]);
assert.deepEqual(buildQuickBindSkillIds([], "new_scroll"), ["new_scroll"]);
assert.deepEqual(buildQuickBindSkillIds(["q_skill"], "new_scroll"), ["q_skill", "new_scroll"]);
assert.deepEqual(buildQuickBindSkillIds(["q_skill", "e_skill"], "new_scroll"), ["q_skill", "new_scroll"]);
assert.deepEqual(buildQuickBindSkillIds(["q_skill", "e_skill"], "e_skill"), ["q_skill", "e_skill"]);

assert.deepEqual(buildManualToggleSkillIds([], "q_skill"), ["q_skill"]);
assert.deepEqual(buildManualToggleSkillIds(["q_skill"], "e_skill"), ["q_skill", "e_skill"]);
assert.deepEqual(buildManualToggleSkillIds(["q_skill", "e_skill"], "new_skill"), ["q_skill", "new_skill"]);
assert.deepEqual(buildManualToggleSkillIds(["q_skill", "e_skill"], "e_skill"), ["q_skill"]);

console.log("Skill binding contract passed");

import { Router } from "express";
import {
  applyPlayerCombatProgression,
  applyPlayerLevelChoice,
  claimPlayerDungeonReward,
  craftPlayerInventoryReward,
  equipPlayerInventoryItem,
  equipPlayerLoadoutSkills,
  getPlayerProfile,
  usePlayerInventoryConsumable,
  updatePlayerSession,
  updatePlayerClass,
  getGradePromotionStatus,
  promotePlayerGrade,
  recordCombatGradeData,
  // Phase 5: Endgame routes
  getEndgameStatusEndpoint,
  getAnomalySectors,
  getFirstGradeTrials,
  completeFirstGradeTrial,
  getAscensionStatus,
  completeAscensionEncounter
} from "../controllers/playerController.js";

export const playerRoutes = Router();

playerRoutes.get("/player/profile", getPlayerProfile);
playerRoutes.put("/player/profile/class", updatePlayerClass);
playerRoutes.post("/player/rewards/claim", claimPlayerDungeonReward);
playerRoutes.put("/player/session-state", updatePlayerSession);
playerRoutes.put("/player/progression/reward", applyPlayerCombatProgression);
playerRoutes.put("/player/progression/choice", applyPlayerLevelChoice);
playerRoutes.put("/player/loadout/item", equipPlayerInventoryItem);
playerRoutes.put("/player/loadout/skills", equipPlayerLoadoutSkills);
playerRoutes.post("/player/inventory/use", usePlayerInventoryConsumable);
playerRoutes.post("/player/inventory/craft", craftPlayerInventoryReward);
// Phase 4: Grade promotion routes
playerRoutes.get("/player/grade/status", getGradePromotionStatus);
playerRoutes.post("/player/grade/promote", promotePlayerGrade);
playerRoutes.post("/player/grade/record", recordCombatGradeData);
// Phase 5: Endgame routes
playerRoutes.get("/player/endgame/status", getEndgameStatusEndpoint);
playerRoutes.get("/player/endgame/anomaly-sectors", getAnomalySectors);
playerRoutes.get("/player/endgame/trials", getFirstGradeTrials);
playerRoutes.post("/player/endgame/trials/complete", completeFirstGradeTrial);
playerRoutes.get("/player/endgame/ascension/status", getAscensionStatus);
playerRoutes.post("/player/endgame/ascension/complete", completeAscensionEncounter);

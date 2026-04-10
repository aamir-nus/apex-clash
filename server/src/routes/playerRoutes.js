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
  updatePlayerClass
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

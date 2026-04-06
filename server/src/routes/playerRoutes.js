import { Router } from "express";
import {
  equipPlayerInventoryItem,
  equipPlayerLoadoutSkills,
  getPlayerProfile,
  updatePlayerClass
} from "../controllers/playerController.js";

export const playerRoutes = Router();

playerRoutes.get("/player/profile", getPlayerProfile);
playerRoutes.put("/player/profile/class", updatePlayerClass);
playerRoutes.put("/player/loadout/item", equipPlayerInventoryItem);
playerRoutes.put("/player/loadout/skills", equipPlayerLoadoutSkills);

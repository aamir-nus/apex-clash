import { Router } from "express";
import {
  createSaveSlot,
  getSaveSlot,
  listSaveSlots,
  updateSaveSlot
} from "../controllers/saveController.js";

export const saveRoutes = Router();

saveRoutes.get("/save-slots", listSaveSlots);
saveRoutes.post("/save-slots", createSaveSlot);
saveRoutes.get("/save/:slotId", getSaveSlot);
saveRoutes.put("/save/:slotId", updateSaveSlot);

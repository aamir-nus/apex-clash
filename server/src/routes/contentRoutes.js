import { Router } from "express";
import { getContentBootstrap } from "../controllers/contentController.js";

export const contentRoutes = Router();

contentRoutes.get("/bootstrap", getContentBootstrap);

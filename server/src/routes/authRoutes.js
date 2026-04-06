import { Router } from "express";
import { createGuestSession } from "../controllers/authController.js";

export const authRoutes = Router();

authRoutes.post("/guest", createGuestSession);

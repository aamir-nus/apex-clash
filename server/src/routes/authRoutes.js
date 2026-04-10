import { Router } from "express";
import {
  createGuestSession,
  getCurrentSession,
  loginUserSession,
  registerUserSession
} from "../controllers/authController.js";

export const authRoutes = Router();

authRoutes.post("/guest", createGuestSession);
authRoutes.post("/register", registerUserSession);
authRoutes.post("/login", loginUserSession);
authRoutes.get("/me", getCurrentSession);

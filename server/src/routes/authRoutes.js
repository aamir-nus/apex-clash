import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createGuestSession,
  getCurrentSession,
  loginUserSession,
  registerUserSession
} from "../controllers/authController.js";

export const authRoutes = Router();

// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests (don't count them toward the limit)
  skipSuccessfulRequests: false
});

// Stricter rate limiter for login/register (more sensitive operations)
const sensitiveAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many login/register attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to sensitive auth endpoints
authRoutes.post("/register", sensitiveAuthLimiter, registerUserSession);
authRoutes.post("/login", sensitiveAuthLimiter, loginUserSession);
authRoutes.post("/guest", authLimiter, createGuestSession);
authRoutes.get("/me", getCurrentSession);

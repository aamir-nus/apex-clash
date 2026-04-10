import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { getPersistenceStatus } from "./lib/persistenceStatus.js";
import { authSession } from "./middleware/authSession.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { authRoutes } from "./routes/authRoutes.js";
import { contentRoutes } from "./routes/contentRoutes.js";
import { playerRoutes } from "./routes/playerRoutes.js";
import { saveRoutes } from "./routes/saveRoutes.js";

export function createApp() {
  const app = express();

  // Define allowed origins with validation
  const allowedOrigins = [
    env.clientOrigin,
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080"
  ].filter(Boolean); // Remove any undefined values

  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) {
          return callback(null, true);
        }

        // Check if origin is in allowed list
        if (allowedOrigins.indexOf(origin) === -1) {
          const msg = `CORS policy: origin ${origin} is not allowed`;
          console.warn(msg);
          return callback(new Error(msg), false);
        }

        return callback(null, true);
      },
      credentials: true
    })
  );
  app.use(express.json());
  app.use(requestLogger);
  app.use(authSession);

  app.get("/health", (_request, response) => {
    response.json({
      ok: true,
      version: "0.1.0",
      mode: "scaffold",
      persistence: {
        ...getPersistenceStatus(),
        mongodbUriConfigured: Boolean(env.mongodbUri)
      }
    });
  });

  app.use("/auth", authRoutes);
  app.use("/content", contentRoutes);
  app.use("/", playerRoutes);
  app.use("/", saveRoutes);
  app.use(errorHandler);

  return app;
}

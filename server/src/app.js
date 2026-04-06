import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { authRoutes } from "./routes/authRoutes.js";
import { contentRoutes } from "./routes/contentRoutes.js";
import { saveRoutes } from "./routes/saveRoutes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin
    })
  );
  app.use(express.json());
  app.use(requestLogger);

  app.get("/health", (_request, response) => {
    response.json({
      ok: true,
      version: "0.1.0",
      mode: "scaffold"
    });
  });

  app.use("/auth", authRoutes);
  app.use("/content", contentRoutes);
  app.use("/", saveRoutes);
  app.use(errorHandler);

  return app;
}

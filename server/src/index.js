import mongoose from "mongoose";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const app = createApp();

async function startServer() {
  if (env.mongodbUri) {
    try {
      await mongoose.connect(env.mongodbUri, {
        serverSelectionTimeoutMS: 1500
      });
      logger.info("MongoDB connected");
    } catch (error) {
      logger.warn("MongoDB unavailable, continuing with JSON-backed scaffolding", {
        error: error.message
      });
    }
  }

  app.listen(env.port, () => {
    logger.info("Apex Clash server listening", {
      url: `http://localhost:${env.port}`
    });
  });
}

startServer();

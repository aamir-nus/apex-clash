import mongoose from "mongoose";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const app = createApp();

async function startServer() {
  if (env.mongodbUri) {
    const maxAttempts = 5;
    const baseDelayMs = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await mongoose.connect(env.mongodbUri, {
          serverSelectionTimeoutMS: 3000
        });
        logger.info("MongoDB connected");
        break;
      } catch (error) {
        if (attempt === maxAttempts) {
          logger.warn("MongoDB unavailable after retries, continuing with JSON-backed scaffolding", {
            error: error.message
          });
        } else {
          const delayMs = baseDelayMs * attempt;
          logger.warn(`MongoDB connection attempt ${attempt} failed, retrying in ${delayMs}ms`, {
            error: error.message
          });
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
  }

  app.listen(env.port, () => {
    logger.info("Apex Clash server listening", {
      url: `http://localhost:${env.port}`
    });
  });
}

startServer();

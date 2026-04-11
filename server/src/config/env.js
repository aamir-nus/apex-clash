import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try loading .env from server directory (containers), then project root (local dev)
dotenv.config(); // server/
dotenv.config({ path: path.resolve(__dirname, "../../../.env") }); // project root (up 3 levels)

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI ?? ""
};

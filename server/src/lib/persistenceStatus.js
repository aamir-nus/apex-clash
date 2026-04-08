import mongoose from "mongoose";

export function getPersistenceStatus(connectionState = mongoose.connection.readyState) {
  const mongoConnected = connectionState === 1;

  return {
    mode: mongoConnected ? "mongo" : "memory-fallback",
    mongoConnected
  };
}

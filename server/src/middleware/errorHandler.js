import { logger } from "../lib/logger.js";

export function errorHandler(error, request, response, _next) {
  logger.error("Unhandled request error", {
    requestId: request.id,
    method: request.method,
    path: request.originalUrl,
    error: error.message
  });

  response.status(500).json({
    ok: false,
    error: "Internal server error"
  });
}

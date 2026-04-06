import { logger } from "../lib/logger.js";

let requestCounter = 0;

export function requestLogger(request, response, next) {
  const startedAt = Date.now();
  requestCounter += 1;
  request.id = `req-${requestCounter}`;

  logger.info("HTTP request started", {
    requestId: request.id,
    method: request.method,
    path: request.originalUrl
  });

  response.on("finish", () => {
    logger.info("HTTP request completed", {
      requestId: request.id,
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  next();
}

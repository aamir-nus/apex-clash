import { logger } from "../lib/logger.js";
import { getSessionUser, loginUser, registerUser } from "../services/authService.js";

export function createGuestSession(_request, response) {
  response.status(201).json({
    ok: true,
    data: {
      userId: "guest-profile",
      mode: "guest"
    }
  });
}

export async function registerUserSession(request, response) {
  const result = await registerUser(request.body ?? {});
  if (result.error) {
    logger.warn("Rejected register request", {
      requestId: request.id,
      username: request.body?.username
    });
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  response.status(201).json({
    ok: true,
    data: result.user
  });
}

export async function loginUserSession(request, response) {
  const result = await loginUser(request.body ?? {});
  if (result.error) {
    logger.warn("Rejected login request", {
      requestId: request.id,
      username: request.body?.username
    });
    response.status(401).json({ ok: false, error: result.error });
    return;
  }

  response.json({
    ok: true,
    data: result
  });
}

export async function getCurrentSession(request, response) {
  const authorization = request.headers.authorization ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const user = token ? await getSessionUser(token) : null;

  if (!user) {
    response.status(401).json({ ok: false, error: "Not authenticated" });
    return;
  }

  response.json({
    ok: true,
    data: {
      user
    }
  });
}

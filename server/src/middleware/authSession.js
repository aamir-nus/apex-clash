import { getSessionUser } from "../services/authService.js";

export function authSession(request, _response, next) {
  const authorization = request.headers.authorization ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  request.authUser = token ? getSessionUser(token) : null;
  next();
}

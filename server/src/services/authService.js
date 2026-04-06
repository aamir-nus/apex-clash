import crypto from "node:crypto";

const users = [];
const sessions = new Map();
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, passwordHash) {
  const [salt] = passwordHash.split(":");
  return hashPassword(password, salt) === passwordHash;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role ?? "player"
  };
}

function ensureDefaultAdminUser() {
  if (users.some((user) => user.username === DEFAULT_ADMIN_USERNAME)) {
    return;
  }

  users.push({
    id: crypto.randomUUID(),
    username: DEFAULT_ADMIN_USERNAME,
    passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    role: "admin"
  });
}

ensureDefaultAdminUser();

export function registerUser({ username, password }) {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername || password.length < 6) {
    return { error: "Username and password must be valid" };
  }

  if (users.some((user) => user.username === normalizedUsername)) {
    return { error: "Username already exists" };
  }

  const user = {
    id: crypto.randomUUID(),
    username: normalizedUsername,
    passwordHash: hashPassword(password),
    role: "player"
  };

  users.push(user);
  return { user: sanitizeUser(user) };
}

export function loginUser({ username, password }) {
  const normalizedUsername = username.trim().toLowerCase();
  const user = users.find((entry) => entry.username === normalizedUsername);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid credentials" };
  }

  const token = crypto.randomUUID();
  sessions.set(token, user.id);

  return {
    token,
    user: sanitizeUser(user)
  };
}

export function getSessionUser(token) {
  const userId = sessions.get(token);
  if (!userId) {
    return null;
  }

  const user = users.find((entry) => entry.id === userId);
  return user ? sanitizeUser(user) : null;
}

export function getDefaultAdminCredentials() {
  return {
    username: DEFAULT_ADMIN_USERNAME,
    password: DEFAULT_ADMIN_PASSWORD
  };
}

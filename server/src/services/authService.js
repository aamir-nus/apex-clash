import crypto from "node:crypto";
import {
  createUserRecord,
  deleteUserByUsername,
  findUserById,
  findUserByUsername
} from "./userRepository.js";

const sessions = new Map();

// Use environment variables for admin credentials with development-only defaults
const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? null;
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? null;

function hashPassword(password, salt = crypto.randomBytes(32).toString("hex")) {
  // Increased salt to 32 bytes for better security
  const derivedKey = crypto.scryptSync(password, salt, 64, {
    N: 16384, // CPU/memory cost parameter
    r: 8,     // Block size parameter
    p: 1      // Parallelization parameter
  }).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, passwordHash) {
  if (!passwordHash || !passwordHash.includes(":")) {
    return false;
  }

  const [salt] = passwordHash.split(":");

  // Validate salt length (32 bytes = 64 hex chars)
  if (!salt || salt.length < 64) {
    return false;
  }

  return hashPassword(password, salt) === passwordHash;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role ?? "player"
  };
}

async function ensureDefaultAdminUser() {
  // Only create default admin in development with explicit credentials
  if (process.env.NODE_ENV === "production") {
    return;
  }

  // Check environment variables at runtime (not module load time)
  const adminUsername = process.env.ADMIN_USERNAME ?? null;
  const adminPassword = process.env.ADMIN_PASSWORD ?? null;

  // Require explicit environment variables for admin creation
  if (!adminUsername || !adminPassword) {
    return;
  }

  const existingAdmin = await findUserByUsername(adminUsername);

  // Always delete and recreate admin to ensure password matches
  if (existingAdmin) {
    await deleteUserByUsername(adminUsername);
  }

  await createUserRecord({
    id: crypto.randomUUID(),
    username: adminUsername,
    passwordHash: hashPassword(adminPassword),
    role: "admin"
  });
}

export async function registerUser({ username, password }) {
  await ensureDefaultAdminUser();
  if (typeof username !== "string" || typeof password !== "string") {
    return { error: "Username and password must be valid" };
  }

  // Sanitize and validate username
  const normalizedUsername = username.trim().toLowerCase();

  // Validate username format (alphanumeric, underscores, hyphens, 3-20 chars)
  if (!/^[a-z0-9_-]{3,20}$/.test(normalizedUsername)) {
    return { error: "Username must be 3-20 characters (letters, numbers, underscores, hyphens only)" };
  }

  // Validate password strength (min 8 chars, requires letter and number)
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { error: "Password must contain at least one letter and one number" };
  }

  if (await findUserByUsername(normalizedUsername)) {
    return { error: "Username already exists" };
  }

  const user = {
    id: crypto.randomUUID(),
    username: normalizedUsername,
    passwordHash: hashPassword(password),
    role: "player"
  };

  const storedUser = await createUserRecord(user);
  return { user: sanitizeUser(storedUser) };
}

export async function loginUser({ username, password }) {
  await ensureDefaultAdminUser();
  if (typeof username !== "string" || typeof password !== "string") {
    return { error: "Invalid credentials" };
  }

  // Sanitize username to prevent injection
  const normalizedUsername = username.trim().toLowerCase();

  // Validate username format to prevent injection attempts
  if (!/^[a-z0-9_-]{3,20}$/.test(normalizedUsername)) {
    return { error: "Invalid credentials" };
  }

  const user = await findUserByUsername(normalizedUsername);

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

export async function getSessionUser(token) {
  const userId = sessions.get(token);
  if (!userId) {
    return null;
  }

  const user = await findUserById(userId);
  return user ? sanitizeUser(user) : null;
}

export function getDefaultAdminCredentials() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Default admin credentials not available in production");
  }

  // Check at runtime, not module load time
  const adminUsername = process.env.ADMIN_USERNAME ?? null;
  const adminPassword = process.env.ADMIN_PASSWORD ?? null;

  if (!adminUsername || !adminPassword) {
    throw new Error(
      "Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables to use default admin credentials"
    );
  }

  return {
    username: adminUsername,
    password: adminPassword
  };
}

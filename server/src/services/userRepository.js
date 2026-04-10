import mongoose from "mongoose";
import { UserModel } from "../models/User.js";

const users = [];

function clone(value) {
  return structuredClone(value);
}

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function serializeMongoUser(document) {
  return {
    id: document.userId,
    username: document.username,
    passwordHash: document.passwordHash,
    role: document.role ?? "player"
  };
}

export async function listUsers() {
  if (!isMongoReady()) {
    return users.map(clone);
  }

  const documents = await UserModel.find().lean();
  return documents.map(serializeMongoUser);
}

export async function findUserByUsername(username) {
  // Add input validation and sanitization
  if (!username || typeof username !== "string") {
    return null;
  }

  // Sanitize: trim whitespace and convert to lowercase
  const sanitizedUsername = username.trim().toLowerCase();

  // Validate username format (alphanumeric, underscores, hyphens, 3-20 chars)
  if (!/^[a-z0-9_-]{3,20}$/.test(sanitizedUsername)) {
    return null;
  }

  if (!isMongoReady()) {
    const user = users.find((entry) => entry.username === sanitizedUsername);
    return user ? clone(user) : null;
  }

  // Use sanitized username in MongoDB query with additional safety
  const document = await UserModel.findOne({ username: sanitizedUsername }).lean();
  return document ? serializeMongoUser(document) : null;
}

export async function findUserById(userId) {
  // Add input validation
  if (!userId || typeof userId !== "string") {
    return null;
  }

  // Validate UUID format (basic check for UUID v4 format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return null;
  }

  if (!isMongoReady()) {
    const user = users.find((entry) => entry.id === userId);
    return user ? clone(user) : null;
  }

  const document = await UserModel.findOne({ userId }).lean();
  return document ? serializeMongoUser(document) : null;
}

export async function createUserRecord(user) {
  if (!isMongoReady()) {
    users.push(clone(user));
    return clone(user);
  }

  const document = await UserModel.create({
    userId: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    role: user.role ?? "player"
  });

  return serializeMongoUser(document.toObject());
}

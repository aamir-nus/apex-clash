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
  if (!isMongoReady()) {
    const user = users.find((entry) => entry.username === username);
    return user ? clone(user) : null;
  }

  const document = await UserModel.findOne({ username }).lean();
  return document ? serializeMongoUser(document) : null;
}

export async function findUserById(userId) {
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

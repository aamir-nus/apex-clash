import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, default: "player" }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const UserModel = mongoose.models.User || mongoose.model("User", userSchema);

// src/utils/password.js
import bcrypt from "bcryptjs";

export async function hashPassword(pw) {
  if (typeof pw !== "string" || pw.length < 8) {
    throw new Error("password too short");
  }
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pw, salt);
}

export async function verifyPassword(pw, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(pw || ""), String(hash));
}

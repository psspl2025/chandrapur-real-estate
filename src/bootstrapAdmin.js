import User from "./models/User.js";
import { hashPassword } from "./utils/password.js";

/**
 * Ensures a master admin exists. Runs at server start.
 * Only creates if no user with that email exists.
 */
export async function ensureMasterAdmin() {
  const email = process.env.MASTER_ADMIN_EMAIL;
  const pw    = process.env.MASTER_ADMIN_PASSWORD;

  if (!email || !pw) {
    console.log("ⓘ MASTER_ADMIN_EMAIL/PASSWORD not set; skipping admin bootstrap");
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`✓ Master admin present: ${email}`);
    return;
  }

  const passwordHash = await hashPassword(pw);
  await User.create({
    email,
    name: "Master Admin",
    role: "ADMIN",
    status: "ACTIVE",
    passwordHash,
  });
  console.log(`✅ Created master admin: ${email}`);
}

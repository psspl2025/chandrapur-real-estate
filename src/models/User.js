import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import isEmail from "validator/lib/isEmail.js";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
      validate: { validator: isEmail, message: "Invalid email" },
      index: true,
    },
    role: { type: String, enum: ["CLIENT", "EDITOR", "ADMIN"], default: "CLIENT", index: true },
    passwordHash: { type: String, default: null },
    status: { type: String, enum: ["ACTIVE", "DISABLED"], default: "ACTIVE", index: true },

    // require password change on next login (for temp/default pw)
    forcePwChange: { type: Boolean, default: false },

    // Google Drive tokens live here
    gdrive: {
      access_token: { type: String, default: null },
      refresh_token: { type: String, default: null },
      scope: { type: String, default: null },
      token_type: { type: String, default: null },
      expiry_date: { type: Number, default: null }, // ms since epoch
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

UserSchema.methods.setPassword = async function (raw) {
  if (typeof raw !== "string" || raw.length < 8) {
    throw new Error("password too short");
  }
  this.passwordHash = await bcrypt.hash(String(raw), 10);
};

UserSchema.methods.checkPassword = async function (raw) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(String(raw || ""), String(this.passwordHash));
};

export default mongoose.models.User || mongoose.model("User", UserSchema);

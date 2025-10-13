// src/models/Access.js
import mongoose from "mongoose";

const ProjectAccessSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },
    canEdit: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const PropertyAccessSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", index: true },
    canEdit: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ProjectAccess  = mongoose.models.ProjectAccess  || mongoose.model("ProjectAccess", ProjectAccessSchema);
export const PropertyAccess = mongoose.models.PropertyAccess || mongoose.model("PropertyAccess", PropertyAccessSchema);

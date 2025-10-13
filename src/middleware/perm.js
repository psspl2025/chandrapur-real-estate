// src/middleware/perm.js
import { PropertyAccess, ProjectAccess } from "../models/Access.js";

export async function canEditProperty(user, propertyId) {
  if (!user) return false;
  if (user.roles?.includes("ADMIN")) return true;
  if (!propertyId) return false;
  const hasProp = await PropertyAccess.exists({ user: user.id, property: propertyId, canEdit: true });
  if (hasProp) return true;
  const hasProj = await ProjectAccess.exists({ user: user.id, project: { $in: [/* resolved by caller if needed */] }, canEdit: true });
  return !!hasProj;
}

export async function requirePropertyEdit(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "unauthenticated" });
  if (req.user.roles?.includes("ADMIN")) return next();
  const ok = await PropertyAccess.exists({ user: req.user.id, property: req.params.id, canEdit: true });
  if (!ok) return res.status(403).json({ error: "no edit access" });
  next();
}

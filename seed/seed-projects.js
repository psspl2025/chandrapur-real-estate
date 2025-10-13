// seed/seed-projects.js
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Project from "../src/models/Project.js";

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  await mongoose.connect(uri, { autoIndex: true });
  console.log("✅ MongoDB connected");

  const dir = path.resolve("seed", "projects");
  if (!fs.existsSync(dir)) {
    console.log("No seed/projects folder found. Skipping.");
    process.exit(0);
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  if (!files.length) {
    console.log("No JSON files in seed/projects. Skipping.");
    process.exit(0);
  }

  let inserted = 0, updated = 0;
  for (const f of files) {
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
    if (!p.projectId) {
      console.warn(`⚠️  ${f} missing projectId. Skipped.`);
      continue;
    }
    const out = await Project.findOneAndUpdate(
      { projectId: p.projectId },
      { $set: p },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    if (out.createdAt && Math.abs(new Date(out.createdAt) - new Date(out.updatedAt)) < 1000) inserted++;
    else updated++;
    console.log(`✔ ${f} -> ${out._id}`);
  }

  console.log(`Done. Inserted: ${inserted}, Updated: ${updated}`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("❌ Seed failed:", e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

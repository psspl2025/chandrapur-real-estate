// src/models/POI.js
import mongoose from "mongoose";

/**
 * POI = Point of Interest
 * Coordinates are GeoJSON Point: { type: "Point", coordinates: [lng, lat] }
 */
const POISchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    poiType: {
      type: String,
      required: true,
      enum: [
        "HIGHWAY",
        "ROAD_MAJOR",
        "VILLAGE",
        "TALUKA_HQ",
        "DISTRICT_HQ",
        "SCHOOL",
        "COLLEGE",          // NEW
        "INSTITUTE",        // NEW (coaching / educational institute)
        "HOSPITAL",
        "HOSPITAL_GOVT",    // NEW (explicit govt hospital)
        "INDUSTRY",
        "MIDC",             // NEW (industrial area)
        "MARKET",
        "MALL",             // NEW (shopping mall / large mart)
        "RIVER",
        "RAIL_STATION",
        "BUS_STAND",
        "BUS_STOP",         // NEW (nearest bus stop)
        "GOVT_OFFICE",      // NEW (MC, Court, Setu, ZP etc.)
        "TEMPLE",           // NEW (e.g., Mahakali)
        "TOURIST_PLACE",    // NEW (e.g., Tadoba)
      ],
    },

    /** Optional classifier, e.g.:
     *  GOVT_OFFICE subType: "MC", "COURT", "SETU", "ZP"
     *  HOSPITAL_GOVT subType: "PHC", "Civil", etc.
     *  MARKET subType: "MAIN"
     */
    subType: String,

    district: String,
    meta: { type: Object },

    // GeoJSON Point
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
  },
  { timestamps: true }
);

// IMPORTANT: 2dsphere index must be on the *location* field
POISchema.index({ location: "2dsphere" });

// Helpful filter index
POISchema.index({ poiType: 1, district: 1, subType: 1 });

export default mongoose.model("POI", POISchema);

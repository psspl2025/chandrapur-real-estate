// src/models/Property.js
import mongoose from "mongoose";

const AreaSchema = new mongoose.Schema(
  { hectares: Number, acres: Number, square_meters: Number, square_feet: Number },
  { _id: false }
);

const OwnershipSchema = new mongoose.Schema(
  { holder_name: String, holder_name_marathi: String, share: String },
  { _id: false }
);

const GeoSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    // GeoJSON coordinates => [lng, lat]
    coordinates: {
      type: [Number],
      default: undefined,
      validate: [
        {
          validator: (v) => (Array.isArray(v) ? v.length === 2 : v === undefined),
          message: "geo.coordinates must be [lng, lat]",
        },
        {
          validator: (v) =>
            !Array.isArray(v) ||
            (Number.isFinite(v[0]) &&
              Number.isFinite(v[1]) &&
              v[0] >= -180 &&
              v[0] <= 180 &&
              v[1] >= -90 &&
              v[1] <= 90),
          message: "geo.coordinates out of range",
        },
      ],
    },
    geo_source: String,
  },
  { _id: false }
);

const PropertySchema = new mongoose.Schema(
  {
    // 🔗 Which project this property belongs to (for scoping/assignments)
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },

    source: {
      type: { type: String, default: "MAHA_7_12" },
      scan_date: Date,
      mutation_entry_no: String,
      mutation_entry_date: Date,
      file_ref: String,
    },

    location_admin: {
      state: { type: String, default: "Maharashtra" },
      district: String,
      taluka: String,
      village: String,
    },

    parcel: {
      ulpin: { type: String, index: true },
      survey_gat_no: { type: String, index: true },
      area: AreaSchema,
      cultivable_area: AreaSchema,
    },

    ownership: [OwnershipSchema],

    use_and_crop: {
      land_use: {
        type: String,
        enum: ["AGRICULTURE", "NON_AGRICULTURE", "INDUSTRIAL", "RESIDENTIAL", "COMMERCIAL"],
        default: "AGRICULTURE",
      },
      year: String,
      crop_code: String,
      crop_name: String,
    },

    remarks: { notes: String, stamp_text: String },

    // ✅ Proper GeoJSON Point for $geoNear etc.
    geo: GeoSchema,

    integration: {
      district_tag: String,
      taluka_tag: String,
      village_tag: String,
      search_tokens: [String],
    },

    // nearby, distances, precomputed insights (free-form)
    computed: { type: mongoose.Schema.Types.Mixed, default: {} },

    // ✅ Optional: public, read-only link support
    share: {
      isPublic: { type: Boolean, default: false },
      token: { type: String, index: true },
      expiresAt: Date,
      allowedFields: { type: [String], default: ["parcel", "location_admin", "geo", "computed", "createdAt"] },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

/* =========================
 * Indexes
 * ========================= */

// ✅ Single, correct geospatial index on the GeoJSON field
PropertySchema.index({ geo: "2dsphere" });

// Query helpers
PropertySchema.index({
  "location_admin.district": 1,
  "location_admin.taluka": 1,
  "location_admin.village": 1,
});
PropertySchema.index({ "integration.search_tokens": 1 });

// ✅ Partial unique: only when BOTH keys exist (safer than sparse on compound)
PropertySchema.index(
  { "parcel.ulpin": 1, "parcel.survey_gat_no": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "parcel.ulpin": { $type: "string" },
      "parcel.survey_gat_no": { $type: "string" },
    },
  }
);

/* =========================
 * Hooks / helpers
 * ========================= */

// Keep basic search tokens fresh
PropertySchema.pre("save", function maintainTokens(next) {
  try {
    const tok = new Set(this.integration?.search_tokens || []);
    const d = this.location_admin || {};
    const p = this.parcel || {};
    [d.district, d.taluka, d.village, p.ulpin, p.survey_gat_no]
      .filter(Boolean)
      .forEach((s) => tok.add(String(s)));
    this.integration = this.integration || {};
    this.integration.search_tokens = Array.from(tok);
    next();
  } catch (e) {
    next(e);
  }
});

export default mongoose.models.Property || mongoose.model("Property", PropertySchema);

// src/models/Project.js
import mongoose from "mongoose";

const FileInfoSchema = new mongoose.Schema(
  {
    // ---- Local or Drive-agnostic fields (keep for backward compat) ----
    filename: String,
    mimetype: String,
    size: Number,
    url: String,          // we keep storing Drive webViewLink here for compat
    uploadedAt: Date,

    // ---- Google Drive specific (DON'T lose these) ----
    provider: { type: String, enum: ["gdrive"], default: "gdrive" },
    fileId: String,        // Drive file id
    viewLink: String,      // Drive webViewLink (friendly viewer URL)
    downloadLink: String,  // Drive webContentLink (direct-ish download URL)
  },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true },
    status: { type: String, enum: ["APPROVED", "PENDING", "REJECTED"], default: "PENDING" },
    refNo:  String,
    date:   Date,
    file:   FileInfoSchema,
  },
  { _id: false }
);

const PlotSchema = new mongoose.Schema(
  {
    plotNo: { type: String, required: true },
    area_sqm: Number,
    area_sqft: Number,
    hr: Number,
    rate_per_sqft: Number,
    added_tax: Number,
    occupant_names: [String],
    aadhaar_numbers: [String],
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    projectId: { type: String, index: true },
    projectName: { type: String, required: true },
    projectType: { type: String, enum: ["RESIDENTIAL", "COMMERCIAL", "PLOTTING", "MIXED"] },
    status: { type: String, enum: ["ONGOING", "COMPLETED", "ONHOLD"], default: "ONGOING" },
    bookingStatus: String,
    launchDate: Date,
    completionDate: Date,

    locationDetails: {
      address: String,
      mouza: String,
      tehsil: String,
      district: String,
      surveyNo: String,
      warg: String,
    },

    // Reference to properties; do NOT import the Property model here to avoid circular deps
    properties: [{ type: mongoose.Schema.Types.ObjectId, ref: "Property" }],

    plots: [PlotSchema],

    // IMPORTANT: default empty array so it always exists on new docs
    documents: { type: [DocumentSchema], default: [] },

    financials: {
      totalAgreementValue: Number,
      stampDuty: Number,
      registrationFee: Number,
      totalValue: Number,   // we keep this for compatibility (you set totalRegistryValue in route)
      ratePerSqft: Number,
    },

    geo: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], index: "2dsphere" },
    },
  },
  { timestamps: true }
);

// Helpful index for your filters
ProjectSchema.index({ projectName: 1, "locationDetails.district": 1 });

// ✅ Reuse compiled model to avoid OverwriteModelError
export default mongoose.models.Project || mongoose.model("Project", ProjectSchema);

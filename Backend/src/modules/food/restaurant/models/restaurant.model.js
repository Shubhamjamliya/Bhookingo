import mongoose from "mongoose";

const normalizeRatingValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(5, Number(numeric.toFixed(1))));
};

const geoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number], // [lng, lat]
      default: undefined,
      validate: {
        validator(v) {
          return (
            !v ||
            (Array.isArray(v) &&
              v.length === 2 &&
              v.every((n) => typeof n === "number" && Number.isFinite(n)))
          );
        },
        message: "location.coordinates must be [lng, lat]",
      },
    },
    // Address fields stored alongside geo so UI can consume a single object.
    latitude: { type: Number },
    longitude: { type: Number },
    formattedAddress: { type: String, trim: true },
    address: { type: String, trim: true },
    addressLine1: { type: String, trim: true },
    addressLine2: { type: String, trim: true },
    area: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    landmark: { type: String, trim: true },
    roadName: { type: String, trim: true },
    placeId: { type: String, trim: true },
  },
  { _id: false },
);

const facilityRatingSummarySchema = new mongoose.Schema(
  {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
  { _id: false },
);

const facilityDetailSchema = new mongoose.Schema(
  {
    available: { type: Boolean, default: false },
    rating: { type: facilityRatingSummarySchema, default: () => ({}) },
  },
  { _id: false },
);

const restaurantDocumentsSchema = new mongoose.Schema(
  {
    pan: {
      number: { type: String, trim: true, default: "" },
      name: { type: String, trim: true, default: "" },
      image: { type: String, trim: true, default: "" },
    },
    gst: {
      registered: { type: Boolean, default: false },
      number: { type: String, trim: true, default: "" },
      legalName: { type: String, trim: true, default: "" },
      address: { type: String, trim: true, default: "" },
      image: { type: String, trim: true, default: "" },
    },
    fssai: {
      number: { type: String, trim: true, default: "" },
      expiry: { type: Date, default: null },
      image: { type: String, trim: true, default: "" },
    },
  },
  { _id: false },
);

const restaurantSchema = new mongoose.Schema(
  {
    restaurantName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerEmail: {
      type: String,
      trim: true,
    },
    ownerPhone: {
      type: String,
      trim: true,
    },
    // Normalized fields for fast lookup + uniqueness guarantees.
    // These are derived from restaurantName/ownerPhone at write time.
    restaurantNameNormalized: {
      type: String,
      trim: true,
    },
    ownerPhoneDigits: {
      type: String,
      trim: true,
    },
    ownerPhoneLast10: {
      type: String,
      trim: true,
    },
    primaryContactNumber: {
      type: String,
      trim: true,
    },
    pureVegRestaurant: {
      type: Boolean,
      required: true,
      default: false,
    },
    addressLine1: {
      type: String,
    },
    addressLine2: {
      type: String,
    },
    area: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    pincode: {
      type: String,
    },
    landmark: {
      type: String,
    },
    cuisines: {
      type: [String],
      default: [],
    },
    openingTime: {
      type: String,
    },
    closingTime: {
      type: String,
    },
    openDays: {
      type: [String],
      default: [],
    } /**
     * Operational toggle controlled by restaurant dashboard.
     * When false, restaurant is shown as offline / not accepting orders even within open hours.
     */,
    isAcceptingOrders: {
      type: Boolean,
      default: true,
      index: true,
    },
    documents: {
      type: restaurantDocumentsSchema,
      default: () => ({}),
    },
    accountNumber: {
      type: String,
    },
    ifscCode: {
      type: String,
    },
    accountHolderName: {
      type: String,
    },
    accountType: {
      type: String,
    },
    upiId: {
      type: String,
      trim: true,
    },
    upiQrImage: {
      type: String,
      trim: true,
    },
    menuImages: {
      type: [String],
      default: [],
    },
    coverImages: {
      type: [String],
      default: [],
    },
    profileImage: {
      type: String,
    },
    fcmTokens: {
      type: [String],
      default: [],
    },
    fcmTokenMobile: {
      type: [String],
      default: [],
    },
    /** GeoJSON point used for distance queries. */
    location: {
      type: geoPointSchema,
      default: undefined,
    },
    locationSource: {
      type: String,
      enum: ["google_places", "google_maps_link"],
      default: "google_places",
    },

    highwayName: {
      type: String,
      trim: true,
      default: null,
    },
    highwayRef: {
      type: String,
      trim: true,
      default: null,
    },
    restaurantType: {
      type: String,
      enum: ["highway", "normal"],
      default: "normal",
      index: true,
    },
    businessModel: {
      type: String,
      trim: true,
    },
    featuredDish: { type: String },
    featuredPrice: { type: Number },
    offer: { type: String },
    /** Rating fields for filtering/sorting (defaults to 0 if never rated). */
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true,
      set: normalizeRatingValue,
    },
    totalRatings: { type: Number, default: 0, min: 0 },
    diningSettings: {
      isEnabled: { type: Boolean, default: false },
      maxGuests: { type: Number, default: 6 },
      diningType: { type: [String], default: ["family-dining"] },
    },
    takeawaySettings: {
      isEnabled: { type: Boolean, default: true },
    },
    facilities: {
      parking: { type: facilityDetailSchema, default: () => ({}) },
      wifi: { type: facilityDetailSchema, default: () => ({}) },
      familyFriendly: { type: facilityDetailSchema, default: () => ({}) },
      evCharging: { type: facilityDetailSchema, default: () => ({}) },
      washroom: { type: facilityDetailSchema, default: () => ({}) },
      overall: {
        rating: { type: facilityRatingSummarySchema, default: () => ({}) },
      },
    },
    menu: {
      sections: { type: Array, default: [] },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "deleted"],
      default: "pending",
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodAdmin",
    },
    rejectionHistory: [
      {
        reason: { type: String, trim: true },
        rejectedAt: { type: Date },
        rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FoodAdmin" },
        adminName: { type: String, trim: true },
        previousStatus: { type: String, trim: true },
      }
    ],
    deletedAt: {
      type: Date,
    },
    isSeededDemo: {
      type: Boolean,
      default: false,
      index: true,
    },
    seedBatch: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    collection: "food_restaurants",
    timestamps: true,
  },
);

restaurantSchema.pre("validate", function normalizeDerivedFields(next) {
  const name =
    typeof this.restaurantName === "string" ? this.restaurantName : "";
  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, " ");
  this.restaurantNameNormalized = normalizedName || undefined;

  const phoneRaw =
    typeof this.ownerPhone === "string" || typeof this.ownerPhone === "number"
      ? String(this.ownerPhone)
      : "";
  const digits = phoneRaw.replace(/\D/g, "").slice(-15); // guard against country prefixes
  this.ownerPhoneDigits = digits || undefined;
  this.ownerPhoneLast10 = digits ? digits.slice(-10) : undefined;

  if (this.location) {
    // If a location object exists but has no usable geo coordinates,
    // drop location to avoid 2dsphere write errors.
    const hasCoordinates =
      Array.isArray(this.location.coordinates) &&
      this.location.coordinates.length === 2 &&
      this.location.coordinates.every(
        (n) => typeof n === "number" && Number.isFinite(n),
      );
    const hasLatLng =
      typeof this.location.latitude === "number" &&
      Number.isFinite(this.location.latitude) &&
      typeof this.location.longitude === "number" &&
      Number.isFinite(this.location.longitude);
    if (!hasCoordinates && !hasLatLng) {
      this.location = undefined;
    }
  }

  if (this.location) {
    // Sync coords <-> lat/lng
    const lat =
      typeof this.location.latitude === "number"
        ? this.location.latitude
        : undefined;
    const lng =
      typeof this.location.longitude === "number"
        ? this.location.longitude
        : undefined;
    if (
      (!this.location.coordinates || this.location.coordinates.length !== 2) &&
      typeof lng === "number" &&
      typeof lat === "number"
    ) {
      this.location.coordinates = [lng, lat];
    }
    if (
      Array.isArray(this.location.coordinates) &&
      this.location.coordinates.length === 2
    ) {
      const [clng, clat] = this.location.coordinates;
      if (typeof this.location.latitude !== "number" && Number.isFinite(clat))
        this.location.latitude = clat;
      if (typeof this.location.longitude !== "number" && Number.isFinite(clng))
        this.location.longitude = clng;
    }
  }

  const facilityKeys = [
    "parking",
    "wifi",
    "familyFriendly",
    "evCharging",
    "washroom",
  ];
  if (!this.facilities || typeof this.facilities !== "object") {
    this.facilities = {};
  }

  facilityKeys.forEach((key) => {
    const legacyFacilityValue = this.facilities?.[key];
    const normalizedFacility =
      legacyFacilityValue &&
      typeof legacyFacilityValue === "object" &&
      !Array.isArray(legacyFacilityValue)
        ? legacyFacilityValue
        : { available: legacyFacilityValue === true };

    normalizedFacility.available = normalizedFacility.available === true;
    normalizedFacility.rating = {
      average: Number(normalizedFacility.rating?.average ?? 0) || 0,
      count: Number(normalizedFacility.rating?.count ?? 0) || 0,
    };

    this.facilities[key] = normalizedFacility;
  });

  const overallRating =
    this.facilities?.overall?.rating &&
    typeof this.facilities.overall.rating === "object"
      ? this.facilities.overall.rating
      : {};

  this.facilities.overall = {
    rating: {
      average: Number(overallRating.average || 0) || 0,
      count: Number(overallRating.count || 0) || 0,
    },
  };

  if (!this.documents || typeof this.documents !== "object") {
    this.documents = {};
  }

  const pan = this.documents.pan && typeof this.documents.pan === "object" ? this.documents.pan : {};
  const gst = this.documents.gst && typeof this.documents.gst === "object" ? this.documents.gst : {};
  const fssai =
    this.documents.fssai && typeof this.documents.fssai === "object" ? this.documents.fssai : {};

  this.documents.pan = {
    number: typeof pan.number === "string" ? pan.number.trim().toUpperCase() : "",
    name: typeof pan.name === "string" ? pan.name.trim() : "",
    image: typeof pan.image === "string" ? pan.image.trim() : "",
  };

  this.documents.gst = {
    registered: gst.registered === true,
    number: typeof gst.number === "string" ? gst.number.trim().toUpperCase() : "",
    legalName: typeof gst.legalName === "string" ? gst.legalName.trim() : "",
    address: typeof gst.address === "string" ? gst.address.trim() : "",
    image: typeof gst.image === "string" ? gst.image.trim() : "",
  };

  let normalizedFssaiExpiry = null;
  if (fssai.expiry instanceof Date && !Number.isNaN(fssai.expiry.getTime())) {
    normalizedFssaiExpiry = fssai.expiry;
  } else if (fssai.expiry) {
    const parsedExpiry = new Date(fssai.expiry);
    if (!Number.isNaN(parsedExpiry.getTime())) {
      normalizedFssaiExpiry = parsedExpiry;
    }
  }

  this.documents.fssai = {
    number: typeof fssai.number === "string" ? fssai.number.trim() : "",
    expiry: normalizedFssaiExpiry,
    image: typeof fssai.image === "string" ? fssai.image.trim() : "",
  };


  next();
});

restaurantSchema.index({ ownerPhone: 1 });
restaurantSchema.index({ restaurantName: 1 });
restaurantSchema.index({ restaurantNameNormalized: 1 });
restaurantSchema.index({ city: 1 });
restaurantSchema.index({ "location.city": 1 });
restaurantSchema.index({ location: "2dsphere", "takeawaySettings.isEnabled": 1 });
restaurantSchema.index({ location: "2dsphere", "diningSettings.isEnabled": 1 });
restaurantSchema.index({ location: "2dsphere" });
restaurantSchema.index({ restaurantName: 1, ownerPhone: 1 });
// Enforce uniqueness at the database level to avoid race conditions in registration.
// Uses partial filter to avoid blocking older documents that may not yet have normalized fields.
restaurantSchema.index(
  { restaurantNameNormalized: 1, ownerPhoneLast10: 1 },
  {
    unique: true,
    partialFilterExpression: {
      restaurantNameNormalized: { $type: "string" },
      ownerPhoneLast10: { $type: "string" },
    },
  },
);
restaurantSchema.index({ status: 1, createdAt: -1 });
restaurantSchema.index({ status: 1, rating: -1, createdAt: -1 });
restaurantSchema.index({ "takeawaySettings.isEnabled": 1 });
restaurantSchema.index({ "diningSettings.isEnabled": 1 });

restaurantSchema.index({ restaurantType: 1, status: 1 });

export const FoodRestaurant = mongoose.model(
  "FoodRestaurant",
  restaurantSchema,
);

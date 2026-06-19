import mongoose from 'mongoose';

const highwayCoordinateSchema = new mongoose.Schema(
    {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    { _id: false }
);

const boundingBoxSchema = new mongoose.Schema(
    {
        minLat: { type: Number },
        minLng: { type: Number },
        maxLat: { type: Number },
        maxLng: { type: Number }
    },
    { _id: false }
);

const highwaySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        ref: {
            type: String,
            trim: true,
            index: true,
            unique: true,
            sparse: true
        },
        /** Primary polyline for simple map display (longest segment). */
        coordinates: {
            type: [highwayCoordinateSchema],
            required: true,
            validate: {
                validator(v) {
                    return Array.isArray(v) && v.length >= 2;
                },
                message: 'Highway must have at least 2 coordinates.'
            }
        },
        /** All road segments from GeoJSON import (array of coordinate arrays). */
        segments: {
            type: mongoose.Schema.Types.Mixed,
            default: undefined
        },
        boundingBox: {
            type: boundingBoxSchema,
            default: undefined
        },
        totalDistance: {
            type: Number,
            default: 0
        },
        nodeCount: {
            type: Number,
            default: 0
        },
        segmentCount: {
            type: Number,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },
        source: {
            type: String,
            default: 'geojson',
            trim: true
        },
        importedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: 'food_highways',
        timestamps: true
    }
);

highwaySchema.index({ isActive: 1, ref: 1 });
highwaySchema.index({ isActive: 1, 'boundingBox.minLat': 1, 'boundingBox.maxLat': 1 });
highwaySchema.index({ isActive: 1, 'boundingBox.minLng': 1, 'boundingBox.maxLng': 1 });

export const FoodHighway = mongoose.model('FoodHighway', highwaySchema);

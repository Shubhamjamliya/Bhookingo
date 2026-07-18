import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema(
    {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodAdmin',
            required: true
        },
        adminEmail: {
            type: String,
            required: true,
            trim: true
        },
        targetUser: {
            type: String,
            trim: true,
            default: ''
        },
        action: {
            type: String,
            required: true,
            trim: true
        },
        oldValue: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        newValue: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        ip: {
            type: String,
            trim: true,
            default: ''
        },
        userAgent: {
            type: String,
            trim: true,
            default: ''
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: 'food_admin_audit_logs',
        timestamps: true
    }
);

adminAuditLogSchema.index({ adminId: 1, action: 1 });
adminAuditLogSchema.index({ timestamp: -1 });

export const FoodAdminAuditLog = mongoose.model('FoodAdminAuditLog', adminAuditLogSchema);

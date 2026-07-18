import mongoose from 'mongoose';

const adminResetOtpSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true
        },
        phone: {
            type: String,
            trim: true,
            default: ''
        },
        otpHash: {
            type: String,
            required: true
        },
        otpExpiresAt: {
            type: Date,
            required: true
        },
        attempts: {
            type: Number,
            default: 0
        },
        resendAttempts: {
            type: Number,
            default: 0
        },
        lastResentAt: {
            type: Date,
            default: null
        },
        resetToken: {
            type: String,
            default: null,
            index: true
        },
        resetTokenExpiresAt: {
            type: Date,
            default: null
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        lockedUntil: {
            type: Date,
            default: null
        }
    },
    {
        collection: 'food_admin_reset_otps',
        timestamps: true
    }
);

// Auto-delete records after they expire (set TTL on resetTokenExpiresAt or otpExpiresAt fallback)
adminResetOtpSchema.index({ resetTokenExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminResetOtp = mongoose.model('AdminResetOtp', adminResetOtpSchema);

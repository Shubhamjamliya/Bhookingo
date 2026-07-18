import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../../config/env.js';

const adminSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        name: { type: String, trim: true, default: '' },
        firstName: { type: String, trim: true, default: '' },
        lastName: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        profileImage: { type: String, trim: true, default: '' },
        fcmTokens: {
            type: [String],
            default: []
        },
        fcmTokenMobile: {
            type: [String],
            default: []
        },
        role: {
            type: String,
            default: 'ADMIN' // ADMIN or SUB_ADMIN
        },
        roleTitle: {
            type: String,
            trim: true,
            default: ''
        },
        permissions: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'suspended'],
            default: 'active'
        },
        isActive: {
            type: Boolean,
            default: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodAdmin',
            default: null
        },
        lastLogin: {
            type: Date,
            default: null
        },
        passwordResetDate: {
            type: Date,
            default: null
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        notes: {
            type: String,
            trim: true,
            default: ''
        },
        recoveryEmail: {
            type: String,
            lowercase: true,
            trim: true,
            default: ''
        },
        recoveryMobile: {
            type: String,
            trim: true,
            default: ''
        },
        recoveryEmailVerified: {
            type: Boolean,
            default: false
        },
        recoveryMobileVerified: {
            type: Boolean,
            default: false
        },
        recoverySettingsUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodAdmin',
            default: null
        },
        recoverySettingsUpdatedAt: {
            type: Date,
            default: null
        },
        passwordHistory: {
            type: [String],
            default: []
        },
        servicesAccess: {
            type: [String],
            enum: ['food', 'quickCommerce', 'taxi'],
            default: ['food']
        }
    },
    {
        collection: 'food_admins',
        timestamps: true
    }
);

adminSchema.index({ servicesAccess: 1 });

adminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        if (!this.passwordHistory) {
            this.passwordHistory = [];
        }
        // Save existing password hash to history
        if (!this.isNew && this._id) {
            const doc = await mongoose.model('FoodAdmin').findById(this._id).select('password').lean();
            if (doc && doc.password && !this.passwordHistory.includes(doc.password)) {
                this.passwordHistory.push(doc.password);
                if (this.passwordHistory.length > 3) {
                    this.passwordHistory.shift();
                }
            }
        }
    } catch (e) {
        console.error('Error updating password history:', e);
    }

    const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

adminSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

export const FoodAdmin = mongoose.model('FoodAdmin', adminSchema);


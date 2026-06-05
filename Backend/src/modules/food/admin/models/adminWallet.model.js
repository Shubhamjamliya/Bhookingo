import mongoose from 'mongoose';

/**
 * AdminWallet — tracks the platform's overall financial balance.
 * This represents the platform's revenue.
 */
const adminWalletSchema = new mongoose.Schema(
    {
        /** Singleton key — only one admin wallet exists */
        key: { type: String, default: 'platform', unique: true },
        balance: { type: Number, default: 0 },
        /** Lifetime total platform revenue */
        totalRevenue: { type: Number, default: 0, min: 0 },
        totalPayouts: { type: Number, default: 0, min: 0 },
        /** Total refunds issued */
        totalRefunds: { type: Number, default: 0, min: 0 }
    },
    { collection: 'food_admin_wallets', timestamps: true }
);

export const FoodAdminWallet = mongoose.model('FoodAdminWallet', adminWalletSchema);

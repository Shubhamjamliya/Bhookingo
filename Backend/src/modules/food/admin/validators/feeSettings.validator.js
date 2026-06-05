import { z } from 'zod';
import { ValidationError } from '../../../../core/auth/errors.js';

const rangeSchema = z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    fee: z.number().min(0)
});

const feeSettingsUpsertSchema = z.object({
    platformFee: z.number().min(0).nullable().optional(),
    packagingFee: z.number().min(0).nullable().optional(),
    gstRate: z.number().min(0).max(100).nullable().optional(),
    isActive: z.boolean().optional()
});

export const validateFeeSettingsUpsertDto = (body) => {
    const normalized = {

        platformFee:
            body?.platformFee === null ? null : body?.platformFee !== undefined ? Number(body.platformFee) : undefined,
        packagingFee:
            body?.packagingFee === null ? null : body?.packagingFee !== undefined ? Number(body.packagingFee) : undefined,
        gstRate:
            body?.gstRate === null ? null : body?.gstRate !== undefined ? Number(body.gstRate) : undefined,
        isActive: body?.isActive !== undefined ? Boolean(body.isActive) : undefined
    };

    const result = feeSettingsUpsertSchema.safeParse(normalized);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }



    return result.data;
};


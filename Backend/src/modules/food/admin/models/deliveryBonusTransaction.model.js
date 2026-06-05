import mongoose from 'mongoose';

    {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true
        },
        transactionId: { type: String, required: true, trim: true, unique: true, index: true },
        amount: { type: Number, required: true, min: 0 },
        reference: { type: String, trim: true, default: '' },
        createdByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
);




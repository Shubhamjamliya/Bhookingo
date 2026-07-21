import multer from 'multer';
import { ValidationError } from '../core/auth/errors.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const mimeType = String(file.mimetype || '').toLowerCase();
    const originalName = String(file.originalname || '').toLowerCase();
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const isAllowedExtension = originalName.endsWith('.jpg') || originalName.endsWith('.jpeg') || originalName.endsWith('.png') || originalName.endsWith('.webp');

    if (allowedMimeTypes.includes(mimeType) || isAllowedExtension) {
        cb(null, true);
    } else {
        cb(new ValidationError('Only JPG, JPEG, PNG and WebP images are supported.'), false);
    }
};

export const localUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    }
});

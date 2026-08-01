import express from 'express';
import { upload } from '../../../middleware/upload.js';
import { authMiddleware } from '../../../core/auth/auth.middleware.js';
import {
    uploadFileBuffer,
    uploadGenericImage,
    uploadVideoBuffer
} from '../../../services/cloudinary.service.js';

const router = express.Router();

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const getFolder = (req, fallback) => {
    const folder = typeof req.body?.folder === 'string' ? req.body.folder.trim() : '';
    return folder || fallback;
};

router.post('/image', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file?.buffer) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        if (req.file.size > MAX_IMAGE_SIZE) {
            return res.status(400).json({ success: false, message: 'The uploaded image exceeds the maximum size of 15 MB.' });
        }

        const mimeType = String(req.file.mimetype || '').toLowerCase();
        if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
            return res.status(400).json({ success: false, message: 'Only JPG, JPEG, PNG, WEBP and GIF images are supported.' });
        }

        const url = await uploadGenericImage(req.file.buffer, getFolder(req, 'image'));
        return res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                url,
                publicId: url
            }
        });
    } catch (error) {
        next(error);
    }
});

router.post('/file', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file?.buffer) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        if (req.file.size > MAX_FILE_SIZE) {
            return res.status(400).json({ success: false, message: 'The uploaded file exceeds the maximum size of 50 MB.' });
        }

        const originalName = String(req.file.originalname || 'file');
        const extension = originalName.includes('.') ? originalName.split('.').pop() : 'bin';
        const url = await uploadFileBuffer(req.file.buffer, getFolder(req, 'file'), {
            fileName: originalName,
            format: extension
        });

        return res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url,
                publicId: url,
                originalName
            }
        });
    } catch (error) {
        next(error);
    }
});

router.post('/video', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file?.buffer) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        const mimeType = String(req.file.mimetype || '').toLowerCase();
        if (!mimeType.startsWith('video/')) {
            return res.status(400).json({ success: false, message: 'Only video files are allowed' });
        }

        if (req.file.size > MAX_FILE_SIZE) {
            return res.status(400).json({ success: false, message: 'The uploaded video exceeds the maximum size of 50 MB.' });
        }

        const originalName = String(req.file.originalname || 'video.mp4');
        const extension = originalName.includes('.') ? originalName.split('.').pop() : 'mp4';
        const url = await uploadVideoBuffer(req.file.buffer, getFolder(req, 'video'), {
            format: extension
        });

        return res.status(200).json({
            success: true,
            message: 'Video uploaded successfully',
            data: {
                url,
                publicId: url,
                originalName
            }
        });
    } catch (error) {
        next(error);
    }
});

router.post('/single', authMiddleware, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file?.buffer) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        const originalName = String(req.file.originalname || 'file');
        const extension = originalName.includes('.') ? originalName.split('.').pop() : 'bin';
        const url = await uploadFileBuffer(req.file.buffer, getFolder(req, 'file'), {
            fileName: originalName,
            format: extension
        });

        return res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url,
                publicId: url,
                originalName
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;

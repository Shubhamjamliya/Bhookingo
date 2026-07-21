import express from 'express';
import { upload } from '../../../middleware/upload.js';
import { uploadImageBuffer, uploadVideoBuffer } from '../../../services/cloudinary.service.js';

const router = express.Router();

// POST /v1/uploads/image
router.post('/image', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: 'No file provided'
            });
        }

        // Limit size to 15 MB
        const MAX_SIZE = 15 * 1024 * 1024;
        if (req.file.size > MAX_SIZE) {
            return res.status(400).json({
                success: false,
                message: 'The uploaded image exceeds the maximum size of 15 MB.'
            });
        }

        // Validate allowed file types
        const mimeType = String(req.file.mimetype || '').toLowerCase();
        const originalName = String(req.file.originalname || '').toLowerCase();
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const isAllowedExtension = originalName.endsWith('.jpg') || originalName.endsWith('.jpeg') || originalName.endsWith('.png') || originalName.endsWith('.webp');

        if (!allowedMimeTypes.includes(mimeType) && !isAllowedExtension) {
            return res.status(400).json({
                success: false,
                message: 'Only JPG, JPEG, PNG and WebP images are supported.'
            });
        }

        const folder = typeof req.body?.folder === 'string' && req.body.folder.trim()
            ? req.body.folder.trim()
            : 'uploads';

        let url;
        try {
            url = await uploadImageBuffer(req.file.buffer, folder);
        } catch (uploadError) {
            console.error('Image upload buffer error:', uploadError);
            return res.status(400).json({
                success: false,
                message: 'Image processing failed.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                url,
                publicId: null
            }
        });
    } catch (error) {
        next(error);
    }
});


// POST /v1/uploads/video
router.post('/video', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: 'No file provided'
            });
        }

        const mimeType = String(req.file.mimetype || '').toLowerCase();
        if (!mimeType.startsWith('video/')) {
            return res.status(400).json({
                success: false,
                message: 'Only video files are allowed'
            });
        }

        const folder = typeof req.body?.folder === 'string' && req.body.folder.trim()
            ? req.body.folder.trim()
            : 'uploads/videos';

        const url = await uploadVideoBuffer(req.file.buffer, folder);

        return res.status(200).json({
            success: true,
            message: 'Video uploaded successfully',
            data: {
                url,
                publicId: null
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;


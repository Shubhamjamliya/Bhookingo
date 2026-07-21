import { uploadImageBufferDetailed, deleteLocalFile } from '../../../services/cloudinary.service.js';

/**
 * Example controller showing how to upload an image to local VPS storage.
 * 
 * Route setup:
 * router.post('/example-upload', localUpload.single('file'), ExampleUploadController.uploadImage);
 */
export const uploadImage = async (req, res, next) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: 'No file provided'
            });
        }

        // Folder category e.g., 'menu', 'restaurants', 'users'
        const folder = req.body.folder || 'menu';

        // Call the service (which resizes using sharp, converts to WebP, and saves locally)
        const uploadResult = await uploadImageBufferDetailed(req.file.buffer, folder);

        return res.status(200).json({
            success: true,
            message: 'Image uploaded and processed successfully on VPS',
            data: {
                url: uploadResult.secure_url,
                relativePath: uploadResult.public_id,
                bytes: uploadResult.bytes,
                format: uploadResult.format
            }
        });
    } catch (error) {
        console.error('Error in local image upload controller:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Local image upload failed',
            error: error.message
        });
    }
};

/**
 * Example controller showing how to delete an image from local VPS storage.
 * 
 * Route setup:
 * router.delete('/example-delete', ExampleUploadController.deleteImage);
 */
export const deleteImage = async (req, res, next) => {
    try {
        const { imagePath } = req.body; // e.g., '/images/menu/2026/07/uuid.webp' or full URL

        if (!imagePath) {
            return res.status(400).json({
                success: false,
                message: 'imagePath is required'
            });
        }

        const isDeleted = await deleteLocalFile(imagePath);

        if (isDeleted) {
            return res.status(200).json({
                success: true,
                message: 'Image deleted successfully from VPS storage'
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Image file not found or already deleted'
            });
        }
    } catch (error) {
        console.error('Error in local image delete controller:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Local image deletion failed',
            error: error.message
        });
    }
};

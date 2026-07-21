import sharp from 'sharp';

/**
 * Resizes, compresses, and converts an image buffer to WebP format using sharp.
 * 
 * Presets:
 * - menu: Max width 800px
 * - restaurants: Max width 1200px
 * - users: Max width 400px
 * - banners: Max width 1920px
 * - logos: Max width 500px
 * - default: Max width 1000px
 * 
 * @param {Buffer} buffer - Original image buffer
 * @param {string} type - Preset name
 * @returns {Promise<Buffer>} - Processed image buffer in WebP format
 */
export const resizeAndConvertToWebp = async (buffer, type = 'default') => {
    let maxWidth = 1000;
    switch (type.toLowerCase()) {
        case 'menu':
            maxWidth = 800;
            break;
        case 'restaurants':
            maxWidth = 1200;
            break;
        case 'users':
            maxWidth = 400;
            break;
        case 'banners':
            maxWidth = 1920;
            break;
        case 'logos':
            maxWidth = 500;
            break;
        default:
            maxWidth = 1000;
    }

    try {
        const image = sharp(buffer);
        const metadata = await image.metadata();

        let pipeline = image;

        // Resize only if original width exceeds the preset max limit
        if (metadata.width && metadata.width > maxWidth) {
            pipeline = pipeline.resize({
                width: maxWidth,
                withoutEnlargement: true,
                fit: 'inside'
            });
        }

        // Convert to WebP with 80% quality (excellent quality-to-size balance)
        const processedBuffer = await pipeline
            .webp({ quality: 80 })
            .toBuffer();

        return processedBuffer;
    } catch (error) {
        console.error(`[Sharp Utility] Image processing failed for type "${type}":`, error.message);
        throw new Error('Image processing failed.');
    }
};

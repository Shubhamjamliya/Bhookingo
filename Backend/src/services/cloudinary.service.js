import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { resizeAndConvertToWebp } from '../utils/sharp.utils.js';

// Resolve storage root dir (e.g., /var/storage or local ./storage)
const STORAGE_ROOT = path.resolve(config.storageDir);

/**
 * Maps incoming folder category name to standardized local directory category name
 */
function mapFolderToCategory(folder = '') {
    const f = String(folder).toLowerCase();
    if (f.includes('menu') || f.includes('category') || f.includes('categories')) {
        return 'menu';
    }
    if (f.includes('restaurant') || f.includes('outlet') || f.includes('bank') || f.includes('upi-qr')) {
        return 'restaurants';
    }
    if (f.includes('user') || f.includes('admin') || f.includes('customer')) {
        return 'users';
    }
    if (f.includes('banner') || f.includes('advertisement') || f.includes('campaign') || f.includes('under-250') || f.includes('hero') || f.includes('dining')) {
        return 'banners';
    }
    if (f.includes('logo') || f.includes('favicon')) {
        return 'logos';
    }
    return 'uploads';
}

/**
 * Saves a file buffer locally, performing compression and webp conversion.
 */
export const uploadImageBufferDetailed = async (buffer, folder = 'uploads') => {
    if (!buffer) {
        throw new Error('File buffer is required');
    }

    const category = mapFolderToCategory(folder);
    const date = new Date();
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Build directory paths
    const relativeDir = path.join(category, year, month);
    const absoluteDir = path.join(STORAGE_ROOT, relativeDir);

    // Auto-create folders if they do not exist
    if (!fs.existsSync(absoluteDir)) {
        fs.mkdirSync(absoluteDir, { recursive: true });
    }

    // Generate unique UUID filename
    const uuid = crypto.randomUUID();
    const filename = `${uuid}.webp`;
    const absoluteFilePath = path.join(absoluteDir, filename);

    // Process image using sharp
    const webpBuffer = await resizeAndConvertToWebp(buffer, category);

    // Write file
    await fs.promises.writeFile(absoluteFilePath, webpBuffer);

    // Generate URL (e.g., http://localhost:5000/images/menu/2026/07/uuid.webp)
    const publicUrlPath = `/images/${category}/${year}/${month}/${filename}`;
    const secureUrl = `${config.baseUrl}${publicUrlPath}`;

    return {
        secure_url: secureUrl,
        public_id: publicUrlPath, // Maintain public_id property for deleting / references
        url: secureUrl,
        bytes: webpBuffer.length,
        format: 'webp'
    };
};

export const uploadImageBuffer = async (buffer, folder = 'uploads') => {
    const result = await uploadImageBufferDetailed(buffer, folder);
    return result.secure_url;
};

/**
 * Video upload buffer writer.
 */
export const uploadVideoBuffer = async (buffer, folder = 'uploads') => {
    if (!buffer) {
        throw new Error('File buffer is required');
    }

    const category = 'videos';
    const date = new Date();
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const relativeDir = path.join(category, year, month);
    const absoluteDir = path.join(STORAGE_ROOT, relativeDir);

    if (!fs.existsSync(absoluteDir)) {
        fs.mkdirSync(absoluteDir, { recursive: true });
    }

    const uuid = crypto.randomUUID();
    const filename = `${uuid}.mp4`;
    const absoluteFilePath = path.join(absoluteDir, filename);

    await fs.promises.writeFile(absoluteFilePath, buffer);

    const publicUrlPath = `/images/${category}/${year}/${month}/${filename}`;
    return `${config.baseUrl}${publicUrlPath}`;
};

/**
 * Central Delete Utility for local files
 * Deletes file from absolute storage path when given the local relative path or URL.
 */
export const deleteLocalFile = async (filePathOrUrl) => {
    try {
        if (!filePathOrUrl) return;

        let relativePath = '';
        if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
            const urlObj = new URL(filePathOrUrl);
            relativePath = urlObj.pathname.replace(/^\/images\//, '');
        } else if (filePathOrUrl.startsWith('/images/')) {
            relativePath = filePathOrUrl.replace(/^\/images\//, '');
        } else {
            relativePath = filePathOrUrl;
        }

        const absolutePath = path.join(STORAGE_ROOT, relativePath);
        if (fs.existsSync(absolutePath)) {
            await fs.promises.unlink(absolutePath);
            console.log(`[Storage] Successfully deleted local file: ${absolutePath}`);
            return true;
        }
    } catch (err) {
        console.error('[Storage] Local file deletion failed:', err.message);
    }
    return false;
};



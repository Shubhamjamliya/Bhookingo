import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { config } from '../config/env.js';

const STORAGE_ROOT = path.resolve(config.storageDir);
const SUPPORTED_UPLOAD_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.pdf', '.mp4', '.webm', '.mov', '.avi', '.mkv', '.bin'];

const ensureStorageRoot = () => {
    if (!fs.existsSync(STORAGE_ROOT)) {
        fs.mkdirSync(STORAGE_ROOT, { recursive: true });
    }
    return STORAGE_ROOT;
};

const normalizeUploadToken = (value, fallback = 'file') => {
    const normalized = String(value || fallback)
        .trim()
        .replace(/[\\/]+/g, '-')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

    return normalized || fallback;
};

const buildFlatUploadFilename = ({ prefix = 'file', extension = '' }) => {
    const safePrefix = normalizeUploadToken(prefix, 'file');
    const safeExtension = extension ? `.${String(extension).replace(/^\.+/, '').toLowerCase()}` : '';
    return `${safePrefix}_${crypto.randomUUID()}${safeExtension}`;
};

const getStoredPublicPath = (filename) => `/uploads/${filename}`;

const processAndSaveImage = async ({ buffer, prefix, width, height, quality = 85 }) => {
    if (!buffer) {
        throw new Error('File buffer is required');
    }

    const dir = ensureStorageRoot();
    const filename = buildFlatUploadFilename({ prefix, extension: 'webp' });
    const filePath = path.join(dir, filename);

    let pipeline = sharp(buffer).rotate();
    if (width || height) {
        pipeline = pipeline.resize({
            width,
            height,
            fit: 'inside',
            withoutEnlargement: true
        });
    }

    await pipeline.webp({ quality }).toFile(filePath);

    const stats = await fs.promises.stat(filePath);
    return {
        secure_url: getStoredPublicPath(filename),
        public_id: getStoredPublicPath(filename),
        url: getStoredPublicPath(filename),
        bytes: stats.size,
        format: 'webp'
    };
};

const writeBufferFile = async (buffer, { prefix = 'file', extension = 'bin' } = {}) => {
    if (!buffer) {
        throw new Error('File buffer is required');
    }

    const dir = ensureStorageRoot();
    const filename = buildFlatUploadFilename({ prefix, extension });
    const filePath = path.join(dir, filename);
    await fs.promises.writeFile(filePath, buffer);
    return getStoredPublicPath(filename);
};

export const uploadImageBufferDetailed = async (buffer, folder = 'uploads') => {
    return processAndSaveImage({
        buffer,
        prefix: folder,
        quality: 85
    });
};

export const uploadImageBuffer = async (buffer, folder = 'uploads') => {
    const result = await uploadImageBufferDetailed(buffer, folder);
    return result.url;
};

export const uploadFoodImage = async (buffer) => {
    const result = await processAndSaveImage({ buffer, prefix: 'food', width: 800, height: 800, quality: 85 });
    return result.url;
};

export const uploadRestaurantImage = async (buffer) => {
    const result = await processAndSaveImage({ buffer, prefix: 'restaurant', width: 1200, height: 800, quality: 85 });
    return result.url;
};

export const uploadBannerImage = async (buffer) => {
    const result = await processAndSaveImage({ buffer, prefix: 'banner', width: 1600, height: 600, quality: 85 });
    return result.url;
};

export const uploadProfileImage = async (buffer) => {
    const result = await processAndSaveImage({ buffer, prefix: 'profile', width: 400, height: 400, quality: 85 });
    return result.url;
};

export const uploadDeliveryImage = async (buffer) => {
    const result = await processAndSaveImage({ buffer, prefix: 'delivery', width: 800, height: 800, quality: 85 });
    return result.url;
};

export const uploadGenericImage = async (buffer, folder = 'image') => {
    const result = await processAndSaveImage({ buffer, prefix: folder, quality: 85 });
    return result.url;
};

export const uploadFileBuffer = async (buffer, folder = 'file', options = {}) => {
    return writeBufferFile(buffer, {
        prefix: options.fileName ? path.parse(options.fileName).name : folder,
        extension: options.format || 'bin'
    });
};

export const uploadVideoBuffer = async (buffer, folder = 'video', options = {}) => {
    return writeBufferFile(buffer, {
        prefix: folder || 'video',
        extension: options.format || 'mp4'
    });
};

export const deleteLocalFile = async (filePathOrUrl) => {
    try {
        const normalized = normalizeStoredUploadPath(filePathOrUrl);
        if (!normalized || !normalized.startsWith('/uploads/')) {
            return false;
        }

        const filename = path.posix.basename(normalized);
        if (!filename) return false;

        const absolutePath = path.join(STORAGE_ROOT, filename);
        if (!fs.existsSync(absolutePath)) {
            return false;
        }

        await fs.promises.unlink(absolutePath);
        return true;
    } catch (error) {
        console.error('[Storage] Local file deletion failed:', error.message);
        return false;
    }
};

export const normalizeStoredUploadPath = (value) => {
    if (value === null || value === undefined) return '';

    const trimmed = String(value).trim();
    if (!trimmed) return '';

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const url = new URL(trimmed);
            return normalizeStoredUploadPath(url.pathname);
        } catch {
            return trimmed;
        }
    }

    const normalized = trimmed.split('?')[0].split('#')[0].replace(/\\/g, '/');
    const filename = path.posix.basename(normalized);
    if (!filename || filename === '.' || filename === '/') return '';

    return getStoredPublicPath(filename);
};

export const resolveStoredUploadPath = (value) => {
    const normalized = normalizeStoredUploadPath(value);
    if (!normalized) return '';
    if (/^https?:\/\//i.test(String(value || '').trim())) return String(value).trim();

    const filename = path.posix.basename(normalized);
    if (!filename) return normalized;

    const dir = ensureStorageRoot();
    const files = new Map(
        fs.readdirSync(dir, { withFileTypes: true })
            .filter((entry) => entry.isFile())
            .map((entry) => [entry.name.toLowerCase(), entry.name])
    );

    const exact = files.get(filename.toLowerCase());
    if (exact) {
        return getStoredPublicPath(exact);
    }

    const parsed = path.posix.parse(filename);
    const stem = parsed.name.toLowerCase();
    for (const ext of SUPPORTED_UPLOAD_EXTENSIONS) {
        const candidate = files.get(`${stem}${ext}`);
        if (candidate) {
            return getStoredPublicPath(candidate);
        }
    }

    for (const [, actualName] of files) {
        const actualStem = path.posix.parse(actualName).name.toLowerCase();
        if (actualStem === stem || actualStem.startsWith(`${stem}_`)) {
            return getStoredPublicPath(actualName);
        }
    }

    return normalized;
};

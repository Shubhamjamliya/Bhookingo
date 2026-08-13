import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import { config } from '../config/env.js';

const STORAGE_ROOT = path.resolve(config.storageDir);
const SUPPORTED_UPLOAD_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.pdf', '.mp4', '.webm', '.mov', '.avi', '.mkv', '.bin'];
const CLOUDINARY_ENABLED_KEY = 'upload_provider_cloudinary';

let cloudinaryConfigured = false;
let uploadProviderToggleCache = {
    value: null,
    expiresAt: 0
};

if (config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret) {
    cloudinary.config({
        cloud_name: config.cloudinaryCloudName,
        api_key: config.cloudinaryApiKey,
        api_secret: config.cloudinaryApiSecret,
        secure: true
    });
    cloudinaryConfigured = true;
}

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
    return `${safePrefix}_${crypto.randomUUID()}_${Date.now()}${safeExtension}`;
};

const getStoredPublicPath = (filename) => `/uploads/${filename}`;

const getCloudinaryFolder = (folder = 'uploads') =>
    String(folder || 'uploads')
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '')
        .replace(/\/{2,}/g, '/');

const isCloudinaryAsset = (value) => {
    const normalized = String(value || '').trim();
    return /^https?:\/\/res\.cloudinary\.com\//i.test(normalized) || /^cloudinary:/i.test(normalized);
};

const getCloudinaryPublicId = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    if (/^cloudinary:/i.test(normalized)) {
        return normalized.replace(/^cloudinary:/i, '').trim();
    }
    if (/^https?:\/\/res\.cloudinary\.com\//i.test(normalized)) {
        try {
            const url = new URL(normalized);
            const segments = url.pathname.split('/').filter(Boolean);
            const uploadIndex = segments.findIndex((segment) => segment === 'upload');
            if (uploadIndex === -1) return '';
            const publicIdSegments = segments.slice(uploadIndex + 1).filter((segment) => !/^v\d+$/.test(segment));
            if (publicIdSegments.length === 0) return '';
            const last = publicIdSegments[publicIdSegments.length - 1];
            publicIdSegments[publicIdSegments.length - 1] = last.replace(/\.[^.]+$/, '');
            return publicIdSegments.join('/');
        } catch {
            return '';
        }
    }
    return '';
};

const shouldUseCloudinary = async () => {
    if (!cloudinaryConfigured) {
        return false;
    }

    const now = Date.now();
    if (uploadProviderToggleCache.expiresAt > now) {
        return uploadProviderToggleCache.value === true;
    }

    try {
        const FoodSystemConfig = mongoose.models.FoodSystemConfig;
        if (!FoodSystemConfig) {
            uploadProviderToggleCache = { value: false, expiresAt: now + 5000 };
            return false;
        }

        const doc = await FoodSystemConfig.findOne({ key: CLOUDINARY_ENABLED_KEY }).select('value').lean();
        const enabled = doc?.value === true;
        uploadProviderToggleCache = { value: enabled, expiresAt: now + 5000 };
        return enabled;
    } catch (error) {
        console.error('[Storage] Failed to read upload provider setting:', error.message);
        uploadProviderToggleCache = { value: false, expiresAt: now + 5000 };
        return false;
    }
};

const uploadBufferToCloudinary = async (buffer, folder = 'uploads', resourceType = 'image') => {
    const targetFolder = getCloudinaryFolder(folder);
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: targetFolder,
                resource_type: resourceType
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve({
                    secure_url: result.secure_url,
                    public_id: `cloudinary:${result.public_id}`,
                    url: result.secure_url,
                    bytes: result.bytes,
                    format: result.format
                });
            }
        );

        stream.on('error', reject);
        stream.end(buffer);
    });
};

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
    if (await shouldUseCloudinary()) {
        return uploadBufferToCloudinary(buffer, folder, 'image');
    }

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
    if (await shouldUseCloudinary()) {
        const result = await uploadBufferToCloudinary(buffer, folder, 'raw');
        return result.url;
    }

    return writeBufferFile(buffer, {
        prefix: options.fileName ? path.parse(options.fileName).name : folder,
        extension: options.format || 'bin'
    });
};

export const uploadVideoBuffer = async (buffer, folder = 'video', options = {}) => {
    if (await shouldUseCloudinary()) {
        const result = await uploadBufferToCloudinary(buffer, folder, 'video');
        return result.url;
    }

    return writeBufferFile(buffer, {
        prefix: folder || 'video',
        extension: options.format || 'mp4'
    });
};

export const deleteLocalFile = async (filePathOrUrl) => {
    try {
        if (isCloudinaryAsset(filePathOrUrl)) {
            const publicId = getCloudinaryPublicId(filePathOrUrl);
            if (!publicId || !cloudinaryConfigured) return false;
            await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
            return true;
        }

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

import fs from 'fs';
import path from 'path';
import { config } from '../../../../config/env.js';

const HIGHWAY_GEOMETRY_ROOT = path.resolve(config.storageDir, '..', 'highway-geometry');
const geometryCache = new Map();

const ensureGeometryRoot = async () => {
    await fs.promises.mkdir(HIGHWAY_GEOMETRY_ROOT, { recursive: true });
};

const toFileName = (docId) => `${String(docId)}.json`;

export const getHighwayGeometryRoot = () => HIGHWAY_GEOMETRY_ROOT;

export const saveHighwayGeometry = async ({ docId, ref, name, coordinates = [], segments = [] }) => {
    if (!docId) {
        throw new Error('docId is required to persist highway geometry');
    }

    await ensureGeometryRoot();

    const fileName = toFileName(docId);
    const absolutePath = path.join(HIGHWAY_GEOMETRY_ROOT, fileName);
    const payload = {
        ref: ref || null,
        name: name || null,
        coordinates: Array.isArray(coordinates) ? coordinates : [],
        segments: Array.isArray(segments) ? segments : []
    };

    await fs.promises.writeFile(absolutePath, JSON.stringify(payload), 'utf8');
    geometryCache.set(fileName, payload);
    return fileName;
};

export const readHighwayGeometry = async (geometryPath) => {
    if (!geometryPath) return null;

    const fileName = path.basename(String(geometryPath));
    if (!fileName) return null;

    if (geometryCache.has(fileName)) {
        return geometryCache.get(fileName);
    }

    const absolutePath = path.join(HIGHWAY_GEOMETRY_ROOT, fileName);
    const raw = await fs.promises.readFile(absolutePath, 'utf8');
    const parsed = JSON.parse(raw);
    geometryCache.set(fileName, parsed);
    return parsed;
};

export const deleteHighwayGeometry = async (geometryPath) => {
    if (!geometryPath) return false;

    const fileName = path.basename(String(geometryPath));
    if (!fileName) return false;

    const absolutePath = path.join(HIGHWAY_GEOMETRY_ROOT, fileName);
    geometryCache.delete(fileName);

    try {
        await fs.promises.unlink(absolutePath);
        return true;
    } catch (error) {
        if (error?.code === 'ENOENT') {
            return false;
        }
        throw error;
    }
};

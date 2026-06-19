import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    importHighwaysFromGeoJSON,
    listHighways,
    getHighwayById,
    deleteHighway,
    toggleHighwayStatus,
    getHighwayThresholdMeters,
    setHighwayThresholdMeters,
    createHighway,
    updateHighway
} from '../services/highway.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_GEOJSON_PATH = path.resolve(__dirname, '../../../../../data/highways/national-highways.geojson');

/**
 * POST /food/admin/highways/import
 * Bulk import from uploaded GeoJSON file or server-side default path.
 */
export const importHighwaysController = async (req, res, next) => {
    try {
        let geojson;

        if (req.file?.buffer) {
            const raw = req.file.buffer.toString('utf8');
            geojson = JSON.parse(raw);
        } else {
            const filePath = process.env.HIGHWAY_GEOJSON_PATH || DEFAULT_GEOJSON_PATH;
            if (!fs.existsSync(filePath)) {
                throw new ValidationError(
                    `GeoJSON file not found at ${filePath}. Upload a .geojson file or place national-highways.geojson in Backend/data/highways/.`
                );
            }
            geojson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        const result = await importHighwaysFromGeoJSON(geojson);
        return res.status(200).json({
            success: true,
            message: `Highway import complete. ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped.`,
            data: result
        });
    } catch (error) {
        if (error instanceof SyntaxError) {
            return next(new ValidationError('Invalid GeoJSON file — could not parse JSON.'));
        }
        next(error);
    }
};

export const listHighwaysController = async (req, res, next) => {
    try {
        const result = await listHighways(req.query);
        return res.status(200).json({
            success: true,
            message: 'Highways fetched successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getHighwayByIdController = async (req, res, next) => {
    try {
        const highway = await getHighwayById(req.params.id);
        return res.status(200).json({
            success: true,
            message: 'Highway fetched successfully',
            data: { highway }
        });
    } catch (error) {
        next(error);
    }
};

export const createHighwayController = async (req, res, next) => {
    try {
        const highway = await createHighway(req.body);
        return res.status(201).json({
            success: true,
            message: 'Highway created successfully',
            data: { highway }
        });
    } catch (error) {
        next(error);
    }
};

export const updateHighwayController = async (req, res, next) => {
    try {
        const highway = await updateHighway(req.params.id, req.body);
        return res.status(200).json({
            success: true,
            message: 'Highway updated successfully',
            data: { highway }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteHighwayController = async (req, res, next) => {
    try {
        await deleteHighway(req.params.id);
        return res.status(200).json({
            success: true,
            message: 'Highway deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const toggleHighwayStatusController = async (req, res, next) => {
    try {
        const result = await toggleHighwayStatus(req.params.id);
        return res.status(200).json({
            success: true,
            message: `Highway ${result.isActive ? 'activated' : 'deactivated'} successfully`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getHighwaySettingsController = async (req, res, next) => {
    try {
        const thresholdMeters = await getHighwayThresholdMeters();
        return res.status(200).json({
            success: true,
            data: { thresholdMeters }
        });
    } catch (error) {
        next(error);
    }
};

export const updateHighwaySettingsController = async (req, res, next) => {
    try {
        const adminId = req.user?._id;
        const threshold = await setHighwayThresholdMeters(req.body.thresholdMeters, adminId);
        return res.status(200).json({
            success: true,
            message: 'Highway threshold updated successfully',
            data: { thresholdMeters: threshold }
        });
    } catch (error) {
        next(error);
    }
};

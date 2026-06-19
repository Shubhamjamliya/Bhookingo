/**
 * One-time CLI import of National Highway geometry from a static GeoJSON file.
 *
 * Usage:
 *   node scripts/import-highways-from-geojson.js
 *   node scripts/import-highways-from-geojson.js /path/to/national-highways.geojson
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { importHighwaysFromGeoJSON } from '../src/modules/food/admin/services/highway.service.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.resolve(__dirname, '../data/highways/national-highways.geojson');

async function run() {
    const filePath = path.resolve(process.argv[2] || process.env.HIGHWAY_GEOJSON_PATH || DEFAULT_PATH);

    if (!fs.existsSync(filePath)) {
        console.error(`\nGeoJSON file not found: ${filePath}`);
        console.error('Download INDIA_NATIONAL_HIGHWAY.geojson and save it as:');
        console.error(`  ${DEFAULT_PATH}`);
        console.error('See Backend/data/highways/README.md for download links.\n');
        process.exit(1);
    }

    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        console.error('MONGODB_URI is not set.');
        process.exit(1);
    }

    console.log(`Reading: ${filePath}`);
    console.log('Connecting to MongoDB...');

    await mongoose.connect(uri);

    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const geojson = JSON.parse(raw);
        console.log('Importing highways (this may take a few minutes)...');

        const result = await importHighwaysFromGeoJSON(geojson);
        console.log('\nImport complete:');
        console.log(`  Inserted : ${result.inserted}`);
        console.log(`  Updated  : ${result.updated}`);
        console.log(`  Skipped  : ${result.skipped}`);
        console.log(`  Total    : ${result.total}`);
        console.log(`  Unique NH refs: ${result.uniqueRefs}`);
    } finally {
        await mongoose.disconnect();
    }
}

run().catch((err) => {
    console.error('Import failed:', err.message);
    process.exit(1);
});

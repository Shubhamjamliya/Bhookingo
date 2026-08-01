import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { FoodHighway } from '../src/modules/food/admin/models/highway.model.js';
import { hydrateHighwayGeometry } from '../src/modules/food/admin/services/highway.service.js';

dotenv.config();

async function run() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not set.');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);

    try {
        const highways = await FoodHighway.find({}).select('_id ref name geometryPath coordinates segments').lean();
        console.log(`Found ${highways.length} highways to inspect.`);

        let migrated = 0;
        let alreadyFileBacked = 0;
        let skipped = 0;

        for (const highway of highways) {
            const hasGeometryPath = Boolean(highway.geometryPath);
            const hasInlineGeometry =
                (Array.isArray(highway.coordinates) && highway.coordinates.length >= 2) ||
                (Array.isArray(highway.segments) && highway.segments.length > 0);

            if (hasGeometryPath && !hasInlineGeometry) {
                alreadyFileBacked += 1;
                continue;
            }

            if (!hasGeometryPath && !hasInlineGeometry) {
                skipped += 1;
                console.warn(`Skipping ${highway.ref || highway._id}: no geometry available.`);
                continue;
            }

            await hydrateHighwayGeometry(highway, { mergeSegments: false });
            migrated += 1;
            console.log(`Migrated ${highway.ref || highway._id}`);
        }

        console.log('\nHighway geometry migration complete:');
        console.log(`  Migrated          : ${migrated}`);
        console.log(`  Already file-backed: ${alreadyFileBacked}`);
        console.log(`  Skipped           : ${skipped}`);
        console.log(`  Total             : ${highways.length}`);
    } finally {
        await mongoose.disconnect();
    }
}

run().catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});

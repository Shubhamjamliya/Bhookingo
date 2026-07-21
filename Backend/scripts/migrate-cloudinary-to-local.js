import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const DOWNLOADED_ASSETS_DIR = path.resolve(__dirname, '../cloudinary_assets');
const STORAGE_ROOT = path.resolve(process.env.STORAGE_DIR || './uploads');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Ensure Target Root Storage Directory exists
if (!fs.existsSync(STORAGE_ROOT)) {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

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

function parseCloudinaryUrl(url = '') {
    if (typeof url !== 'string') return null;
    // Match structure: res.cloudinary.com/cloud_name/image/upload/v12345/folder/public_id.ext
    const match = url.match(/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+?)\.([a-z0-9]+)$/i);
    if (match) {
        return {
            publicId: match[1],
            format: match[2]
        };
    }
    return null;
}

async function migrateValue(val) {
    if (typeof val !== 'string') return val;
    
    const parsed = parseCloudinaryUrl(val);
    if (!parsed) return val;

    const { publicId, format } = parsed;

    // Check if the file exists in downloaded assets
    const sourceFilePath = path.join(DOWNLOADED_ASSETS_DIR, `${publicId}.${format}`);
    if (!fs.existsSync(sourceFilePath)) {
        console.warn(`⚠️ Downloaded source file not found locally: ${sourceFilePath}. Skipping URL: ${val}`);
        return val;
    }

    const category = mapFolderToCategory(publicId);
    const date = new Date();
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Build absolute and relative directory structure
    const relativeDir = path.join(category, year, month);
    const absoluteDir = path.join(STORAGE_ROOT, relativeDir);

    if (!fs.existsSync(absoluteDir)) {
        fs.mkdirSync(absoluteDir, { recursive: true });
    }

    // Generate new UUID filename
    const uuid = crypto.randomUUID();
    const newFilename = `${uuid}.webp`;
    const absoluteDestPath = path.join(absoluteDir, newFilename);

    try {
        console.log(`Migrating resource: ${publicId}.${format} -> ${category}/${year}/${month}/${newFilename}`);
        
        // Convert JPG/PNG/WebP to compressed WebP using sharp
        const buffer = fs.readFileSync(sourceFilePath);
        let maxWidth = 1000;
        switch (category) {
            case 'menu': maxWidth = 800; break;
            case 'restaurants': maxWidth = 1200; break;
            case 'users': maxWidth = 400; break;
            case 'banners': maxWidth = 1920; break;
            case 'logos': maxWidth = 500; break;
        }

        let pipeline = sharp(buffer);
        const metadata = await pipeline.metadata();

        if (metadata.width && metadata.width > maxWidth) {
            pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true, fit: 'inside' });
        }

        const webpBuffer = await pipeline.webp({ quality: 80 }).toBuffer();
        fs.writeFileSync(absoluteDestPath, webpBuffer);

        const newUrlPath = `/images/${category}/${year}/${month}/${newFilename}`;
        const newUrl = `${BASE_URL}${newUrlPath}`;
        
        return newUrl;
    } catch (err) {
        console.error(`❌ Sharp processing failed for ${publicId}.${format}:`, err.message);
        return val;
    }
}

async function migrateDocument(doc) {
    let hasChanged = false;
    const updatedDoc = { ...doc };

    for (const key of Object.keys(updatedDoc)) {
        const val = updatedDoc[key];
        
        if (typeof val === 'string') {
            const newVal = await migrateValue(val);
            if (newVal !== val) {
                updatedDoc[key] = newVal;
                hasChanged = true;
                
                // If there's an associated publicId field in the schema, update it too
                if (key === 'imageUrl' && updatedDoc.publicId) {
                    const parsedUrl = new URL(newVal);
                    updatedDoc.publicId = parsedUrl.pathname;
                }
                if (key === 'iconUrl' && updatedDoc.publicId) {
                    const parsedUrl = new URL(newVal);
                    updatedDoc.publicId = parsedUrl.pathname;
                }
                if (key === 'profileImage' && updatedDoc.publicId) {
                    const parsedUrl = new URL(newVal);
                    updatedDoc.publicId = parsedUrl.pathname;
                }
            }
        } else if (Array.isArray(val)) {
            // Handle array of strings (like coverImages)
            const newArray = [];
            let arrayChanged = false;
            for (const item of val) {
                if (typeof item === 'string') {
                    const newItem = await migrateValue(item);
                    newArray.push(newItem);
                    if (newItem !== item) {
                        arrayChanged = true;
                    }
                } else {
                    newArray.push(item);
                }
            }
            if (arrayChanged) {
                updatedDoc[key] = newArray;
                hasChanged = true;
            }
        } else if (val && typeof val === 'object' && !mongoose.Types.ObjectId.isValid(val)) {
            // Handle nested object recursively
            const nestedResult = await migrateDocument(val);
            if (nestedResult.hasChanged) {
                updatedDoc[key] = nestedResult.doc;
                hasChanged = true;
            }
        }
    }

    return { hasChanged, doc: updatedDoc };
}

async function main() {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('❌ MONGO_URI env variable is missing.');
        process.exit(1);
    }

    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected.');

    const db = mongoose.connection.db;
    const collections = await db.collections();
    
    console.log(`Found ${collections.length} collections. Starting migration scan...`);

    for (const collection of collections) {
        const name = collection.collectionName;
        
        // Skip system and log collections
        if (name.startsWith('system.') || name.includes('audit') || name.includes('session')) {
            continue;
        }

        console.log(`Scanning collection: ${name}`);
        const cursor = collection.find({});
        
        let count = 0;
        let migratedCount = 0;

        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            count++;
            
            const { hasChanged, doc: migrated } = await migrateDocument(doc);
            if (hasChanged) {
                await collection.updateOne({ _id: doc._id }, { $set: migrated });
                migratedCount++;
            }
        }

        if (migratedCount > 0) {
            console.log(`Finished collection ${name}: scanned ${count} docs, migrated ${migratedCount} docs.`);
        }
    }

    console.log('🎉 Migration completed successfully.');
    await mongoose.disconnect();
}

main();

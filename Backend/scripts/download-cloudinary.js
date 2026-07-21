import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cloudinary Configuration
cloudinary.config({
    cloud_name: 'dvjameabp',
    api_key: '964617315864633',
    api_secret: 'XDZNzO03zdrKiXWRnNqXPLpygzo'
});

const TARGET_DIR = path.resolve(__dirname, '../cloudinary_assets');
const METADATA_FILE = path.join(TARGET_DIR, 'metadata.json');

async function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

async function downloadFile(url, destPath) {
    const writer = fs.createWriteStream(destPath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function fetchAllCloudinaryResources() {
    let resources = [];
    let nextCursor = null;

    console.log('Fetching list of resources from Cloudinary...');
    do {
        try {
            const options = {
                max_results: 500,
                type: 'upload',
                resource_type: 'image'
            };
            if (nextCursor) {
                options.next_cursor = nextCursor;
            }

            const result = await cloudinary.api.resources(options);
            resources = resources.concat(result.resources || []);
            nextCursor = result.next_cursor;
        } catch (err) {
            console.error('Error fetching resources from Cloudinary API:', err.message);
            throw err;
        }
    } while (nextCursor);

    console.log(`Successfully fetched metadata for ${resources.length} resources.`);
    return resources;
}

async function main() {
    try {
        await ensureDirectoryExists(TARGET_DIR);

        const resources = await fetchAllCloudinaryResources();
        const downloadedMetadata = [];

        console.log('Starting download of resources...');
        for (let i = 0; i < resources.length; i++) {
            const resource = resources[i];
            const secureUrl = resource.secure_url;
            const publicId = resource.public_id;
            const format = resource.format || 'jpg';
            const resourceType = resource.resource_type;
            
            // Build target path structure matching the folder hierarchy in Cloudinary
            const localFileName = `${path.basename(publicId)}.${format}`;
            const relativeFolderPath = path.dirname(publicId);
            const absoluteFolderPath = relativeFolderPath === '.' ? TARGET_DIR : path.join(TARGET_DIR, relativeFolderPath);
            
            await ensureDirectoryExists(absoluteFolderPath);
            const localFilePath = path.join(absoluteFolderPath, localFileName);
            const relativeLocalPath = relativeFolderPath === '.' ? localFileName : path.join(relativeFolderPath, localFileName);

            console.log(`[${i + 1}/${resources.length}] Downloading ${publicId} (${resource.bytes} bytes) -> ${relativeLocalPath}`);
            
            try {
                await downloadFile(secureUrl, localFilePath);
                
                downloadedMetadata.push({
                    public_id: publicId,
                    format,
                    resource_type: resourceType,
                    secure_url: secureUrl,
                    local_path: relativeLocalPath.replace(/\\/g, '/'),
                    bytes: resource.bytes,
                    width: resource.width,
                    height: resource.height,
                    created_at: resource.created_at
                });
            } catch (dlErr) {
                console.error(`❌ Failed to download resource ${publicId}:`, dlErr.message);
            }
        }

        // Save metadata file
        fs.writeFileSync(METADATA_FILE, JSON.stringify(downloadedMetadata, null, 2), 'utf-8');
        console.log(`✅ Completed downloading all resources. Metadata written to ${METADATA_FILE}`);
    } catch (error) {
        console.error('Migration failed:', error.message);
    }
}

main();

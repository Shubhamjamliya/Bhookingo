import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const timestamp = Date.now();
  const backupFileName = `migration_backup_${timestamp}.json`;
  const rollbackFileName = `rollback_migration_${timestamp}.js`;
  
  const backupFilePath = path.join(__dirname, '../data', backupFileName);
  const rollbackFilePath = path.join(__dirname, '../scripts', rollbackFileName);

  console.log('====================================================');
  console.log('DATABASE MIGRATION: REMOVE LOCALHOST IMAGE URLS');
  console.log('====================================================');
  console.log('Connecting to MongoDB...');
  
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected successfully!');
    
    const collections = await mongoose.connection.db.collections();
    console.log(`Scanning ${collections.length} collections...\n`);

    let totalCollections = collections.length;
    let totalDocsScanned = 0;
    let totalDocsUpdated = 0;
    let totalFieldsUpdated = 0;
    let totalUrlsReplaced = 0;
    const failures = [];
    const backupData = [];

    for (const col of collections) {
      const colName = col.collectionName;
      let colDocsScanned = 0;
      let colDocsUpdated = 0;
      
      const docs = await col.find({}).toArray();
      colDocsScanned = docs.length;
      totalDocsScanned += colDocsScanned;

      for (const doc of docs) {
        const updates = [];
        // Recursively scan the document fields
        scanDocument(doc, '', updates);

        if (updates.length > 0) {
          colDocsUpdated++;
          totalDocsUpdated++;
          
          const updateObj = {};
          updates.forEach(up => {
            updateObj[up.path] = up.newValue;
            totalFieldsUpdated++;
            totalUrlsReplaced++;
            
            // Log details
            console.log(`[${colName}] [Doc ID: ${doc._id}] [Field: ${up.path}]`);
            console.log(`   Old: "${up.oldValue}"`);
            console.log(`   New: "${up.newValue}"`);

            // Save to field-level backup data
            backupData.push({
              collectionName: colName,
              documentId: doc._id.toString(),
              fieldName: up.path,
              originalValue: up.oldValue
            });
          });

          // Perform atomic update
          try {
            await col.updateOne({ _id: doc._id }, { $set: updateObj });
          } catch (err) {
            console.error(`❌ Failed to update document ${doc._id} in collection ${colName}:`, err.message);
            failures.push({
              collectionName: colName,
              documentId: doc._id.toString(),
              error: err.message
            });
          }
        }
      }

      if (colDocsUpdated > 0) {
        console.log(`--> [${colName}] Scanned: ${colDocsScanned}, Updated Documents: ${colDocsUpdated}\n`);
      }
    }

    // Write backup file if modifications occurred
    if (backupData.length > 0) {
      // Ensure data directory exists
      const dataDir = path.dirname(backupFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
      console.log(`✅ Backup file saved to: ${backupFilePath}`);

      // Write rollback script
      const rollbackContent = generateRollbackScriptContent(backupFileName);
      fs.writeFileSync(rollbackFilePath, rollbackContent, 'utf8');
      console.log(`✅ Rollback script created at: ${rollbackFilePath}`);
    } else {
      console.log('No legacy localhost URLs found. No backup or rollback file needed.');
    }

    // Final Summary Report
    console.log('\n====================================================');
    console.log('MIGRATION SUMMARY');
    console.log('====================================================');
    console.log(`Total Collections Scanned : ${totalCollections}`);
    console.log(`Total Documents Scanned   : ${totalDocsScanned}`);
    console.log(`Total Documents Updated   : ${totalDocsUpdated}`);
    console.log(`Total Fields Updated      : ${totalFieldsUpdated}`);
    console.log(`Total Localhost URLs Fixed: ${totalUrlsReplaced}`);
    console.log(`Total Failures/Errors     : ${failures.length}`);
    
    if (failures.length > 0) {
      console.log('\nFailures details:');
      console.log(JSON.stringify(failures, null, 2));
    }
    console.log('====================================================');

  } catch (err) {
    console.error('Fatal Migration Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

function scanDocument(obj, path, updates) {
  if (obj === null || obj === undefined) return;
  
  if (typeof obj === 'string') {
    if (obj.includes('localhost:5000') || obj.includes('127.0.0.1')) {
      const newValue = obj.replace(/(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/gi, '');
      updates.push({ path, oldValue: obj, newValue });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      scanDocument(item, `${path}.${index}`, updates);
    });
  } else if (typeof obj === 'object') {
    // Skip database system objects/IDs/Buffers
    if (obj instanceof Date || obj instanceof RegExp || mongoose.Types.ObjectId.isValid(obj) || Buffer.isBuffer(obj)) {
      return;
    }
    Object.keys(obj).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      scanDocument(obj[key], currentPath, updates);
    });
  }
}

function generateRollbackScriptContent(backupFileName) {
  return "import mongoose from 'mongoose';\n" +
    "import { config } from '../src/config/env.js';\n" +
    "import fs from 'fs';\n" +
    "import path from 'path';\n" +
    "import { fileURLToPath } from 'url';\n\n" +
    "const __filename = fileURLToPath(import.meta.url);\n" +
    "const __dirname = path.dirname(__filename);\n" +
    "const backupFilePath = path.join(__dirname, '../data', '" + backupFileName + "');\n\n" +
    "async function rollback() {\n" +
    "  console.log('====================================================');\n" +
    "  console.log('DATABASE ROLLBACK: RESTORING ORIGINAL LOCALHOST URLS');\n" +
    "  console.log('====================================================');\n" +
    "  console.log('Connecting to MongoDB...');\n\n" +
    "  try {\n" +
    "    await mongoose.connect(config.mongodbUri);\n" +
    "    console.log('Connected! Loading backup JSON file...');\n\n" +
    "    if (!fs.existsSync(backupFilePath)) {\n" +
    "      console.error('❌ Backup file not found at:', backupFilePath);\n" +
    "      return;\n" +
    "    }\n\n" +
    "    const backup = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));\n" +
    "    console.log('Loaded ' + backup.length + ' fields to restore.');\n\n" +
    "    let successCount = 0;\n" +
    "    let failCount = 0;\n\n" +
    "    // Group updates by collectionName and documentId to optimize updates\n" +
    "    const groups = {};\n" +
    "    backup.forEach(entry => {\n" +
    "      const key = entry.collectionName + '::' + entry.documentId;\n" +
    "      if (!groups[key]) {\n" +
    "        groups[key] = {\n" +
    "          collection: entry.collectionName,\n" +
    "          id: entry.documentId,\n" +
    "          updates: {}\n" +
    "        };\n" +
    "      }\n" +
    "      groups[key].updates[entry.fieldName] = entry.originalValue;\n" +
    "    });\n\n" +
    "    for (const key of Object.keys(groups)) {\n" +
    "      const { collection, id, updates } = groups[key];\n" +
    "      try {\n" +
    "        const col = mongoose.connection.db.collection(collection);\n" +
    "        let queryId = id;\n" +
    "        if (mongoose.Types.ObjectId.isValid(id)) {\n" +
    "          queryId = new mongoose.Types.ObjectId(id);\n" +
    "        }\n\n" +
    "        console.log('Restoring document ' + id + ' in collection [' + collection + ']...');\n" +
    "        const res = await col.updateOne({ _id: queryId }, { $set: updates });\n\n" +
    "        if (res.modifiedCount > 0) {\n" +
    "          successCount += Object.keys(updates).length;\n" +
    "          console.log('   Successfully restored ' + Object.keys(updates).length + ' fields.');\n" +
    "        } else {\n" +
    "          console.log('   Document already matches backup state. No changes applied.');\n" +
    "        }\n" +
    "      } catch (err) {\n" +
    "        failCount += Object.keys(updates).length;\n" +
    "        console.error('❌ Failed to restore document ' + id + ' in collection [' + collection + ']:', err.message);\n" +
    "      }\n" +
    "    }\n\n" +
    "    console.log('====================================================');\n" +
    "    console.log('ROLLBACK COMPLETE');\n" +
    "    console.log('====================================================');\n" +
    "    console.log('Total fields successfully restored: ' + successCount);\n" +
    "    console.log('Total fields failed to restore   : ' + failCount);\n" +
    "    console.log('====================================================');\n\n" +
    "  } catch (err) {\n" +
    "    console.error('Fatal Rollback Error:', err.message);\n" +
    "  } finally {\n" +
    "    await mongoose.disconnect();\n" +
    "    console.log('Database connection closed.');\n" +
    "  }\n" +
    "}\n\n" +
    "rollback();\n";
}

run();

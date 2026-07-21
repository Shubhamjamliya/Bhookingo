import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupFilePath = path.join(__dirname, '../data', 'migration_backup_1784639612683.json');

async function rollback() {
  console.log('====================================================');
  console.log('DATABASE ROLLBACK: RESTORING ORIGINAL LOCALHOST URLS');
  console.log('====================================================');
  console.log('Connecting to MongoDB...');

  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected! Loading backup JSON file...');

    if (!fs.existsSync(backupFilePath)) {
      console.error('❌ Backup file not found at:', backupFilePath);
      return;
    }

    const backup = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    console.log('Loaded ' + backup.length + ' fields to restore.');

    let successCount = 0;
    let failCount = 0;

    // Group updates by collectionName and documentId to optimize updates
    const groups = {};
    backup.forEach(entry => {
      const key = entry.collectionName + '::' + entry.documentId;
      if (!groups[key]) {
        groups[key] = {
          collection: entry.collectionName,
          id: entry.documentId,
          updates: {}
        };
      }
      groups[key].updates[entry.fieldName] = entry.originalValue;
    });

    for (const key of Object.keys(groups)) {
      const { collection, id, updates } = groups[key];
      try {
        const col = mongoose.connection.db.collection(collection);
        let queryId = id;
        if (mongoose.Types.ObjectId.isValid(id)) {
          queryId = new mongoose.Types.ObjectId(id);
        }

        console.log('Restoring document ' + id + ' in collection [' + collection + ']...');
        const res = await col.updateOne({ _id: queryId }, { $set: updates });

        if (res.modifiedCount > 0) {
          successCount += Object.keys(updates).length;
          console.log('   Successfully restored ' + Object.keys(updates).length + ' fields.');
        } else {
          console.log('   Document already matches backup state. No changes applied.');
        }
      } catch (err) {
        failCount += Object.keys(updates).length;
        console.error('❌ Failed to restore document ' + id + ' in collection [' + collection + ']:', err.message);
      }
    }

    console.log('====================================================');
    console.log('ROLLBACK COMPLETE');
    console.log('====================================================');
    console.log('Total fields successfully restored: ' + successCount);
    console.log('Total fields failed to restore   : ' + failCount);
    console.log('====================================================');

  } catch (err) {
    console.error('Fatal Rollback Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

rollback();

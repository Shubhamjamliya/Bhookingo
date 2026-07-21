import mongoose from 'mongoose';
import { config } from '../src/config/env.js';

async function run() {
  console.log('Connecting to database...');
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected! Searching collections for localhost:5000 or 127.0.0.1...');
    
    const collections = await mongoose.connection.db.collections();
    console.log(`Found ${collections.length} collections.`);
    
    for (const col of collections) {
      const name = col.collectionName;
      const docs = await col.find({}).toArray();
      let matchCount = 0;
      
      docs.forEach(doc => {
        const str = JSON.stringify(doc);
        if (str.includes('localhost:5000') || str.includes('127.0.0.1')) {
          matchCount++;
          console.log(`Match in collection [${name}], ID: ${doc._id}`);
          findMatchingFields(doc, '', name);
        }
      });
      
      if (matchCount > 0) {
        console.log(`--> Collection [${name}] has ${matchCount} matches.`);
      }
    }
    
    console.log('Search complete.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

function findMatchingFields(obj, path = '', colName) {
  if (!obj) return;
  if (typeof obj === 'string') {
    if (obj.includes('localhost:5000') || obj.includes('127.0.0.1')) {
      console.log(`   Field: ${path} = "${obj}"`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((val, idx) => findMatchingFields(val, `${path}[${idx}]`, colName));
  } else if (typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      findMatchingFields(obj[key], path ? `${path}.${key}` : key, colName);
    });
  }
}

run();

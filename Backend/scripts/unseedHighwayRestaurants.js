import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { FoodRestaurant } from '../src/modules/food/restaurant/models/restaurant.model.js';
import { FoodItem } from '../src/modules/food/admin/models/food.model.js';

dotenv.config();

const SEED_BATCH = 'highway-demo-v1';
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/Bhookingo';

async function unseed() {
  console.log('🧹 Starting Highway Restaurant Unseeder...');
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB successfully.');

  const delItems = await FoodItem.deleteMany({ seedBatch: SEED_BATCH });
  const delRests = await FoodRestaurant.deleteMany({ seedBatch: SEED_BATCH });

  console.log(`\n✅ Unseed complete!`);
  console.log(`Removed ${delRests.deletedCount} demo restaurants.`);
  console.log(`Removed ${delItems.deletedCount} demo food items.`);

  await mongoose.disconnect();
  process.exit(0);
}

unseed().catch((err) => {
  console.error('❌ Unseeding error:', err);
  process.exit(1);
});

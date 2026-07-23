import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { FoodRestaurant } from '../src/modules/food/restaurant/models/restaurant.model.js';
import { FoodItem } from '../src/modules/food/admin/models/food.model.js';

dotenv.config();

const SEED_BATCH = 'highway-demo-v1';
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/Bhookingo';

// Sample high quality food images
const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=500&q=80'
];

// 1. Indore to Ahmedabad (NH 47 / MP-GJ Highway) ~390km
const INDORE_AHMEDABAD_RESTAURANTS = [
  { name: 'Grand Highway Feast', city: 'Betma', lat: 22.6210, lng: 75.5240, km: 30 },
  { name: 'Dhar Royal Highway Treat', city: 'Dhar', lat: 22.6010, lng: 75.3120, km: 55 },
  { name: 'Rajputana Family Dhaba', city: 'Sardarpur', lat: 22.6580, lng: 75.0210, km: 85 },
  { name: 'Express Food Junction', city: 'Rajgarh', lat: 22.6840, lng: 74.9450, km: 98 },
  { name: 'Malwa Highway Zaika', city: 'Machaliya', lat: 22.7020, lng: 74.7850, km: 115 },
  { name: 'Jhabua Food Plaza', city: 'Jhabua', lat: 22.7690, lng: 74.5950, km: 135 },
  { name: 'Border Express Cafe', city: 'Pitol', lat: 22.7750, lng: 74.4750, km: 152 },
  { name: 'Gujarat Gateway Dhaba', city: 'Dahod', lat: 22.8350, lng: 74.2550, km: 175 },
  { name: 'Limkheda Highway Rest', city: 'Limkheda', lat: 22.8360, lng: 73.9910, km: 202 },
  { name: 'Piplod Traveler Stop', city: 'Piplod', lat: 22.8020, lng: 73.8050, km: 222 },
  { name: 'Godhra Bypass Highway Kitchen', city: 'Godhra', lat: 22.7550, lng: 73.6150, km: 245 },
  { name: 'Vejalpur Food Hub', city: 'Vejalpur', lat: 22.6890, lng: 73.4950, km: 265 },
  { name: 'Derol Express Dhaba', city: 'Derol', lat: 22.6150, lng: 73.3250, km: 285 },
  { name: 'Dakor Route Refreshment', city: 'Thasra', lat: 22.7520, lng: 73.1550, km: 308 },
  { name: 'Kathiawadi Highway Junction', city: 'Ureth', lat: 22.7310, lng: 73.0120, km: 325 },
  { name: 'Nadiad Express Dining', city: 'Nadiad', lat: 22.6910, lng: 72.8630, km: 345 },
  { name: 'Kheda Heritage Dhaba', city: 'Kheda', lat: 22.7520, lng: 72.6850, km: 365 },
  { name: 'Bareja Highway Oasis', city: 'Bareja', lat: 22.8950, lng: 72.5850, km: 382 },
  { name: 'Ahmedabad Highway Gateway', city: 'Aslali', lat: 22.9850, lng: 72.5450, km: 395 }
];

// 2. Indore to Delhi (~830km via Ujjain, Ratlam, Kota, Jaipur, Delhi)
const INDORE_DELHI_RESTAURANTS = [
  { name: 'Sanwer Highway Point', city: 'Sanwer', lat: 22.9750, lng: 75.8250, km: 25 },
  { name: 'Mahakal Highway Palace', city: 'Ujjain', lat: 23.1850, lng: 75.7850, km: 55 },
  { name: 'Unhel Roadside Express', city: 'Unhel', lat: 23.3250, lng: 75.5650, km: 82 },
  { name: 'Nagda Junction Dhaba', city: 'Nagda', lat: 23.4550, lng: 75.4150, km: 110 },
  { name: 'Jaora Highway Refreshment', city: 'Jaora', lat: 23.6350, lng: 75.1350, km: 145 },
  { name: 'Mandsaur Royal Kitchen', city: 'Mandsaur', lat: 24.0750, lng: 75.0650, km: 195 },
  { name: 'Neemuch Border Dhaba', city: 'Neemuch', lat: 24.4550, lng: 74.8750, km: 240 },
  { name: 'Nimbhahera Highway Plaza', city: 'Nimbhahera', lat: 24.6250, lng: 74.6550, km: 275 },
  { name: 'Chittorgarh Fort View Dhaba', city: 'Chittorgarh', lat: 24.8850, lng: 74.6250, km: 305 },
  { name: 'Bhilwara Express Oasis', city: 'Bhilwara', lat: 25.3550, lng: 74.6350, km: 360 },
  { name: 'Gulabpura Travelers Hub', city: 'Gulabpura', lat: 25.9050, lng: 74.6550, km: 420 },
  { name: 'Bijainagar Royal Dhaba', city: 'Bijainagar', lat: 26.2550, lng: 74.7350, km: 460 },
  { name: 'Ajmer Bypass Highway Lounge', city: 'Ajmer', lat: 26.4550, lng: 74.6350, km: 495 },
  { name: 'Kishangarh Marble City Express', city: 'Kishangarh', lat: 26.5750, lng: 74.8650, km: 525 },
  { name: 'Dudu Highway Food Plaza', city: 'Dudu', lat: 26.6850, lng: 75.2350, km: 565 },
  { name: 'Jaipur Outer Ring Highway Rest', city: 'Bagru', lat: 26.8150, lng: 75.5450, km: 600 },
  { name: 'Shahpura Family Highway Dhaba', city: 'Shahpura', lat: 27.3850, lng: 75.9650, km: 660 },
  { name: 'Kotputli Express Highway Kitchen', city: 'Kotputli', lat: 27.7050, lng: 76.2050, km: 700 },
  { name: 'Behror Midway Oasis', city: 'Behror', lat: 27.8850, lng: 76.2850, km: 725 },
  { name: 'Neemrana Fort View Highway Stop', city: 'Neemrana', lat: 27.9850, lng: 76.3850, km: 740 },
  { name: 'Dharuhera Express Food Court', city: 'Dharuhera', lat: 28.2050, lng: 76.7850, km: 780 },
  { name: 'Gurgaon Highway Capital Dining', city: 'Manesar', lat: 28.3550, lng: 76.9350, km: 810 }
];

// 3. Delhi to Dehradun (~250km via Ghaziabad, Meerut, Muzaffarnagar, Roorkee)
const DELHI_DEHRADUN_RESTAURANTS = [
  { name: 'Akshardham Highway Start Point', city: 'Ghaziabad', lat: 28.6450, lng: 77.3450, km: 12 },
  { name: 'Muradnagar Canal Dhaba', city: 'Muradnagar', lat: 28.7750, lng: 77.5050, km: 30 },
  { name: 'Modinagar Sugar Express', city: 'Modinagar', lat: 28.8350, lng: 77.5750, km: 42 },
  { name: 'Meerut Bypass Royal Feast', city: 'Meerut', lat: 28.9850, lng: 77.7050, km: 65 },
  { name: 'Sardhana Route Kitchen', city: 'Sardhana', lat: 29.1250, lng: 77.7150, km: 80 },
  { name: 'Khatauli Cheetal Grand View', city: 'Khatauli', lat: 29.2850, lng: 77.7350, km: 100 },
  { name: 'Muzaffarnagar Highway Junction', city: 'Muzaffarnagar', lat: 29.4750, lng: 77.7050, km: 125 },
  { name: 'Deoband Heritage Dhaba', city: 'Deoband', lat: 29.6950, lng: 77.5850, km: 150 },
  { name: 'Roorkee IIT Highway Stop', city: 'Roorkee', lat: 29.8750, lng: 77.8850, km: 175 },
  { name: 'Ganga Valley Route Kitchen', city: 'Chutmalpur', lat: 30.0350, lng: 77.7550, km: 198 },
  { name: 'Shivalik Foothills Express', city: 'Biharigarh', lat: 30.1750, lng: 77.8550, km: 218 },
  { name: 'Mohand Tunnel View Dhaba', city: 'Mohand', lat: 30.2250, lng: 77.9250, km: 230 },
  { name: 'Clement Town Gateway Restaurant', city: 'Dehradun', lat: 30.2650, lng: 78.0050, km: 242 },
  { name: 'Dehradun Valley Pines Dining', city: 'Dehradun', lat: 30.2950, lng: 78.0350, km: 250 }
];

const MENU_CATEGORIES = [
  'Breakfast Specials',
  'Punjabi Delights',
  'Chinese & Indo-Chinese',
  'South Indian Classics',
  'Highway Snacks & Tandoor',
  'Beverages & Shakes',
  'Desserts & Kulfi'
];

const SAMPLE_ITEMS = [
  { cat: 'Breakfast Specials', name: 'Aloo Paratha with White Butter', price: 120, type: 'Veg', desc: 'Stuffed spiced potato bread served with fresh homemade white butter and curd.' },
  { cat: 'Breakfast Specials', name: 'Paneer Stuffed Paratha', price: 150, type: 'Veg', desc: 'Fresh cottage cheese stuffed whole wheat paratha.' },
  { cat: 'Breakfast Specials', name: 'Poha Jalebi Combo', price: 90, type: 'Veg', desc: 'Indori style flattened rice topped with sev, served with hot jalebis.' },
  { cat: 'Breakfast Specials', name: 'Masala Puri Bhaji', price: 110, type: 'Veg', desc: 'Deep fried fluffy puris served with spicy potato curry.' },

  { cat: 'Punjabi Delights', name: 'Dal Makhani', price: 220, type: 'Veg', desc: 'Slow cooked black lentils with fresh cream and butter.' },
  { cat: 'Punjabi Delights', name: 'Butter Paneer Masala', price: 260, type: 'Veg', desc: 'Cottage cheese cubes in rich tomato and cashew gravy.' },
  { cat: 'Punjabi Delights', name: 'Kadhai Chicken', price: 340, type: 'Non-Veg', desc: 'Tender chicken cooked with capsicum, onion and freshly ground spices.' },
  { cat: 'Punjabi Delights', name: 'Butter Chicken Special', price: 360, type: 'Non-Veg', desc: 'Charcoal grilled chicken in rich creamy tomato butter sauce.' },
  { cat: 'Punjabi Delights', name: 'Amritsari Kulcha with Chole', price: 180, type: 'Veg', desc: 'Crispy stuffed naan baked in tandoor served with spicy chickpeas.' },

  { cat: 'Chinese & Indo-Chinese', name: 'Veg Hakka Noodles', price: 160, type: 'Veg', desc: 'Wok tossed stir fried noodles with fresh crunchy vegetables.' },
  { cat: 'Chinese & Indo-Chinese', name: 'Chilli Paneer Dry', price: 210, type: 'Veg', desc: 'Crispy paneer cubes tossed in garlic, chilli and soy sauce.' },
  { cat: 'Chinese & Indo-Chinese', name: 'Chicken Fried Rice', price: 220, type: 'Non-Veg', desc: 'Aromatic basmati rice tossed with shredded chicken and eggs.' },
  { cat: 'Chinese & Indo-Chinese', name: 'Veg Manchurian Gravy', price: 190, type: 'Veg', desc: 'Vegetable dumplings in savory garlic soy gravy.' },

  { cat: 'South Indian Classics', name: 'Masala Dosa', price: 130, type: 'Veg', desc: 'Crispy rice crepe filled with spiced potato masala, served with sambar and chutneys.' },
  { cat: 'South Indian Classics', name: 'Idli Vada Combo', price: 110, type: 'Veg', desc: 'Steamed rice cakes and crispy lentil donuts served with warm sambar.' },
  { cat: 'South Indian Classics', name: 'Onion Rava Dosa', price: 150, type: 'Veg', desc: 'Crispy semolina crepe loaded with chopped onions and green chillies.' },

  { cat: 'Highway Snacks & Tandoor', name: 'Paneer Tikka Tandoori', price: 240, type: 'Veg', desc: 'Marinated cottage cheese skewered and grilled in clay oven.' },
  { cat: 'Highway Snacks & Tandoor', name: 'Chicken Tandoori Half', price: 310, type: 'Non-Veg', desc: 'Classic yogurt and spice marinated chicken cooked over charcoal.' },
  { cat: 'Highway Snacks & Tandoor', name: 'Crispy Corn Salt & Pepper', price: 170, type: 'Veg', desc: 'Fried sweet corn tossed with capsicum and fresh pepper.' },
  { cat: 'Highway Snacks & Tandoor', name: 'French Fries Masala', price: 110, type: 'Veg', desc: 'Crispy potato fries dusted with peri-peri seasoning.' },

  { cat: 'Beverages & Shakes', name: 'Kulhad Masala Tea', price: 30, type: 'Veg', desc: 'Traditional ginger cardamom tea served in earthen clay cup.' },
  { cat: 'Beverages & Shakes', name: 'Sweet Punjabi Lassi', price: 80, type: 'Veg', desc: 'Thick chilled sweet yogurt drink topped with malai.' },
  { cat: 'Beverages & Shakes', name: 'Cold Coffee with Ice Cream', price: 120, type: 'Veg', desc: 'Blended espresso coffee topped with vanilla scoop.' },
  { cat: 'Beverages & Shakes', name: 'Fresh Lime Soda', price: 60, type: 'Veg', desc: 'Chilled refreshing fizzy lemon drink.' },

  { cat: 'Desserts & Kulfi', name: 'Gulab Jamun (2 Pcs)', price: 70, type: 'Veg', desc: 'Warm milk solid dumplings soaked in cardamom sugar syrup.' },
  { cat: 'Desserts & Kulfi', name: 'Matka Rabdi Kulfi', price: 90, type: 'Veg', desc: 'Traditional saffron pistachio kulfi served in matka.' }
];

async function seed() {
  console.log('🚀 Starting Highway Restaurant Seeder...');
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB successfully.');

  // Delete previously seeded items & restaurants with this batch
  const delItems = await FoodItem.deleteMany({ seedBatch: SEED_BATCH });
  const delRests = await FoodRestaurant.deleteMany({ seedBatch: SEED_BATCH });
  console.log(`🧹 Cleaned old seed data: Removed ${delRests.deletedCount} restaurants & ${delItems.deletedCount} food items.`);

  const allRoutes = [
    { corridorName: 'Indore -> Ahmedabad (NH47)', data: INDORE_AHMEDABAD_RESTAURANTS },
    { corridorName: 'Indore -> Delhi (NH52 / NH48)', data: INDORE_DELHI_RESTAURANTS },
    { corridorName: 'Delhi -> Dehradun (NH307 / Expressway)', data: DELHI_DEHRADUN_RESTAURANTS }
  ];

  let totalRestaurantsCreated = 0;
  let totalItemsCreated = 0;

  for (const route of allRoutes) {
    console.log(`\n📍 Seeding corridor: ${route.corridorName} (${route.data.length} restaurants)...`);

    for (let i = 0; i < route.data.length; i++) {
      const item = route.data[i];
      const isPureVeg = i % 3 === 0;

      const restDoc = new FoodRestaurant({
        restaurantName: item.name,
        ownerName: `Owner of ${item.name}`,
        ownerEmail: `contact@${item.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        ownerPhone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        pureVegRestaurant: isPureVeg,
        addressLine1: `Highway Km ${item.km}, ${item.city} Expressway Bypass`,
        city: item.city,
        state: 'India',
        pincode: '452001',
        cuisines: ['North Indian', 'Punjabi', 'Fast Food', 'Street Food'],
        openingTime: '06:00 AM',
        closingTime: '11:30 PM',
        openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        isAcceptingOrders: true,
        status: 'approved',
        approvedAt: new Date(),
        isHighwayRestaurant: true,
        rating: Number((4.2 + (i % 8) * 0.1).toFixed(1)),
        totalRatings: 150 + i * 25,
        facilities: {
          parking: true,
          washroom: true,
          familyFriendly: true,
          evCharging: i % 3 === 0,
          wifi: i % 2 === 0
        },
        location: {
          type: 'Point',
          coordinates: [item.lng, item.lat],
          latitude: item.lat,
          longitude: item.lng,
          formattedAddress: `NH Expressway Km ${item.km}, near ${item.city}`,
          city: item.city
        },
        coverImages: [FOOD_IMAGES[i % FOOD_IMAGES.length]],
        profileImage: FOOD_IMAGES[(i + 1) % FOOD_IMAGES.length],
        isSeededDemo: true,
        seedBatch: SEED_BATCH
      });

      await restDoc.save();
      totalRestaurantsCreated++;

      // Seed 20-25 Food items per restaurant
      for (let j = 0; j < SAMPLE_ITEMS.length; j++) {
        const sample = SAMPLE_ITEMS[j];
        if (isPureVeg && sample.type === 'Non-Veg') continue;

        const foodItem = new FoodItem({
          restaurantId: restDoc._id,
          categoryName: sample.cat,
          name: sample.name,
          description: sample.desc,
          price: sample.price,
          foodType: sample.type,
          isAvailable: true,
          isRecommended: j % 4 === 0,
          preparationTime: '15-20 mins',
          approvalStatus: 'approved',
          image: FOOD_IMAGES[(j + i) % FOOD_IMAGES.length],
          isSeededDemo: true,
          seedBatch: SEED_BATCH
        });
        await foodItem.save();
        totalItemsCreated++;
      }
    }
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`Total Highway Restaurants Created: ${totalRestaurantsCreated}`);
  console.log(`Total Food Items Created: ${totalItemsCreated}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});

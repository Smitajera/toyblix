require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');

const sampleProducts = [
  { 
    title: "G Patton Die-Cast Off-Road SUV Toy Car with Lights & Sounds", 
    price: 1199, 
    oldPrice: 1999, 
    discount: "[40% OFF]",
    clubPrice: 1139,
    img: "https://images.unsplash.com/photo-1594787317666-41793740284e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    tag: "Diecast",
    category: "Metal Cars",
    countInStock: 15,
    description: "Built for rough terrains and endless imagination. This 1:32 scale G Patton SUV features openable doors, realistic engine sounds, working headlights, and a powerful pull-back action mechanism."
  },
  { 
    title: "AMG G63 G Wagon Die-Cast Metal Car with Openable Doors", 
    price: 2699, 
    oldPrice: 3999, 
    discount: "[33% OFF]",
    clubPrice: 2564,
    img: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    tag: "Trending",
    category: "Metal Cars",
    countInStock: 8,
    description: "Experience luxury in the palm of your hand. Highly detailed interior and exterior, perfect for collectors and kids alike."
  },
  { 
    title: "Rolls Royce Phantom Diecast Car Model | Luxury Series", 
    price: 2599, 
    oldPrice: 3999, 
    discount: "[35% OFF]",
    clubPrice: 2469,
    img: "https://images.unsplash.com/photo-1532974297617-c0f05fe48bff?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    tag: "Exclusive",
    category: "Metal Cars",
    countInStock: 5,
    description: "The ultimate status symbol toy. Features the iconic spirit of ecstasy ornament and suicide doors."
  },
  { 
    title: "Vintage Classic Beetle 1:32 Scale Diecast Pull Back Car", 
    price: 899, 
    oldPrice: 1499, 
    discount: "[40% OFF]",
    clubPrice: 854,
    img: "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    tag: "Classic",
    category: "Metal Cars",
    countInStock: 25,
    description: "Take a trip down memory lane. A beautifully crafted replica of the iconic classic Beetle."
  },
  {
    title: "Ferrari SF90 Stradale Die-Cast Sports Car 1:32",
    price: 1499,
    oldPrice: 2499,
    discount: "[40% OFF]",
    clubPrice: 1424,
    img: "https://images.unsplash.com/photo-1612825173281-9a193378527e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    tag: "Hot Deal",
    category: "Metal Cars",
    countInStock: 12,
    description: "Race into imagination with this stunning Ferrari replica. Features pull-back motor action and detailed interior."
  },
  {
    title: "Lamborghini Urus Die-Cast SUV with Opening Doors",
    price: 1899,
    oldPrice: 2999,
    discount: "[37% OFF]",
    clubPrice: 1804,
    img: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    tag: "Bestseller",
    category: "Metal Cars",
    countInStock: 10,
    description: "The world's most powerful SUV now fits in your pocket. Perfect gift for car enthusiasts of all ages."
  },
  {
    title: "LEGO-Style Creative Building Blocks 500 Pieces STEM Set",
    price: 1299,
    oldPrice: 1999,
    discount: "[35% OFF]",
    clubPrice: 1234,
    img: "https://images.unsplash.com/photo-1555448248-2571daf6344b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    tag: "STEM",
    category: "Building Blocks",
    countInStock: 30,
    description: "500 colorful interlocking blocks that develop creativity, motor skills, and logical thinking. Compatible with major brands."
  },
  {
    title: "Magnetic Tile Building Set 80 Pieces for Kids",
    price: 2199,
    oldPrice: 3499,
    discount: "[37% OFF]",
    clubPrice: 2089,
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    tag: "STEM",
    category: "Building Blocks",
    countInStock: 18,
    description: "80 magnetic tiles in vibrant colors. Build 3D structures, animals, and vehicles with ease. Safe for ages 3+."
  },
  {
    title: "RC Stunt Car 360° Rotating with LED Lights",
    price: 1099,
    oldPrice: 1799,
    discount: "[39% OFF]",
    clubPrice: 1044,
    img: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    tag: "Hot Deal",
    category: "RC Vehicles",
    countInStock: 22,
    description: "Perform insane 360° flips and stunts! 2.4GHz remote control, rechargeable battery, works on all surfaces."
  },
  {
    title: "Deluxe Art & Craft Kit for Kids 150+ Pieces",
    price: 699,
    oldPrice: 1199,
    discount: "[42% OFF]",
    clubPrice: 664,
    img: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    tag: "Creative",
    category: "Arts & Crafts",
    countInStock: 40,
    description: "Complete art set with colored pencils, watercolors, crayons, stencils, and more. Everything a young artist needs."
  },
  {
    title: "Wooden Railway Train Set 45 Pieces with Tracks",
    price: 1599,
    oldPrice: 2499,
    discount: "[36% OFF]",
    clubPrice: 1519,
    img: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    tag: "Eco Friendly",
    category: "Wooden Toys",
    countInStock: 14,
    description: "Sustainably sourced wooden train set with 45 pieces including engine, carriages, bridges, and flexible tracks."
  },
  {
    title: "Soft Plush Teddy Bear 60cm Premium Quality",
    price: 599,
    oldPrice: 999,
    discount: "[40% OFF]",
    clubPrice: 569,
    img: "https://images.unsplash.com/photo-1530325553241-4f6e7690cf27?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    tag: "Bestseller",
    category: "Soft Toys",
    countInStock: 50,
    description: "Ultra-soft premium plush teddy bear. Hypoallergenic filling, machine washable, safe for infants and toddlers."
  }
];

const importData = async () => {
  try {
    await connectDB();

    await Product.deleteMany();
    console.log('Old products cleared...');

    await Product.insertMany(sampleProducts);
    console.log('✅ Magical Toys successfully added to the database!');
    
    process.exit();
  } catch (error) {
    console.error(`❌ Error importing data: ${error.message}`);
    process.exit(1);
  }
};

importData();
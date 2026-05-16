const mongoose = require('mongoose');
const SkuCounter = require('./SkuCounter');

const CATEGORY_SKU_CODES = {
  'Soft Toys': 'SFT',
  'Wooden Wonders': 'WDN',
  'Remote Control Cars': 'RCC',
  'Arts & Crafts': 'ART',
  'Mind Puzzles': 'PUZ',
  'Metal Machines': 'MTL',
  'Outdoor Adventures': 'OUT',
  'Educational Games': 'EDU',
  'Building & STEM': 'STEM',
  'Light & Music': 'MUS',
};

const cleanSkuSegment = (value, fallback) => {
  const cleaned = String(value || '')
    .split(',')[0]
    .trim()
    .toUpperCase()
    .replace(/&/g, 'AND')
    .replace(/\+/g, 'PLUS')
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return cleaned || fallback;
};

const getCategorySkuCode = (tag) => {
  if (CATEGORY_SKU_CODES[tag]) return CATEGORY_SKU_CODES[tag];

  const words = String(tag || '').match(/[A-Za-z0-9]+/g) || [];
  if (words.length > 1) return words.map((word) => word[0]).join('').toUpperCase().slice(0, 5);

  return cleanSkuSegment(tag, 'GEN').slice(0, 5);
};

const getAgeSkuCode = (category) => cleanSkuSegment(category, 'ALL');

const getNextSku = async (product) => {
  const skuKey = `${getCategorySkuCode(product.tag)}-${getAgeSkuCode(product.category)}`;
  const counter = await SkuCounter.findOneAndUpdate(
    { key: skuKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `${skuKey}-${String(counter.seq).padStart(3, '0')}`;
};

const assignProductSkus = async (product) => {
  // Removed the strict requirement for product.tag so SKUs always generate
  if (!product.sku) {
    product.sku = await getNextSku(product);
  }

  // Ensure variants get SKUs based on the parent product
  if (product.sku && product.variants && product.variants.length > 0) {
    product.variants.forEach((variant, idx) => {
      if (!variant.sku) {
        variant.sku = `${product.sku}-V${idx + 1}`;
      }
    });
  }
};

const reviewSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, default: '' },
    images: [{ type: String }],
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const variantSchema = mongoose.Schema({
    sku: { type: String, trim: true },
    color: { type: String },
    size: { type: String },
    description: { type: String },
    price: { type: Number, required: true },
    oldPrice: { type: Number },
    countInStock: { type: Number, required: true, default: 0 },
    images: [{ type: String }]
});

const productSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    sku: { type: String, trim: true },
    title: { type: String, required: true },
    img: { type: String, required: true },
    images: [{ type: String }],
    tag: { type: String },
    
    // UPDATED: Category is now an array to support multiple selections
    category: [{ type: String }], 
    
    description: { type: String, required: true },

    // NEW: Flexible specifications array
    specifications: [
      {
        name: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true }
      }
    ],

    reviews: [reviewSchema],
    rating: { type: Number, required: true, default: 0 },
    numReviews: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true, default: 0 },
    oldPrice: { type: Number, default: 0 },
    countInStock: { type: Number, required: true, default: 0 },
    isPopular: { type: Boolean, default: false },
    isBestSelling: { type: Boolean, default: false },
    isLimitedEdition: { type: Boolean, default: false },
    videoUrl: { type: String, default: '' },
    isDraft: { type: Boolean, default: false },
    allowCod: { type: Boolean, default: true },
    allowPrepaid: { type: Boolean, default: true },
    notifyList: [{ type: String }],
    variants: [variantSchema] 
  },
  { timestamps: true }
);

productSchema.pre('save', async function () {
  await assignProductSkus(this);
});

productSchema.pre('insertMany', async function (next, docs) {
  try {
    for (const doc of docs) {
      await assignProductSkus(doc);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Indexes
productSchema.index({ title: 'text', description: 'text', tag: 'text', category: 'text' });
productSchema.index({ price: 1, rating: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ tag: 1, category: 1 });
productSchema.index({ isPopular: 1 });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });
productSchema.index({ 'variants.sku': 1 }, { unique: true, sparse: true });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
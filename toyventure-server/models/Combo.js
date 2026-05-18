const mongoose = require('mongoose');

const COMBO_AGE_GROUPS = ['0-12 MO', '12-36 MO', '5-7 YRS'];

const comboItemSchema = mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
});

const comboSchema = mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    img: { type: String, required: true },
    ageGroup: {
      type: String,
      required: true,
      enum: COMBO_AGE_GROUPS,
    },
    items: [comboItemSchema],
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, default: 0 },
    countInStock: { type: Number, required: true, default: 0 },
    sortOrder: { type: Number, default: 0 },
    isDraft: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

comboSchema.index({ ageGroup: 1, isDraft: 1, sortOrder: 1 });

module.exports = mongoose.model('Combo', comboSchema);
module.exports.COMBO_AGE_GROUPS = COMBO_AGE_GROUPS;

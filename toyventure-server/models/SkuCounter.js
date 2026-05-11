const mongoose = require('mongoose');

const skuCounterSchema = mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const SkuCounter = mongoose.model('SkuCounter', skuCounterSchema);
module.exports = SkuCounter;

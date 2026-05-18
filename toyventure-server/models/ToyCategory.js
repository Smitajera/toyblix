const mongoose = require('mongoose');

const toyCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    skuCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 5,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ToyCategory', toyCategorySchema);

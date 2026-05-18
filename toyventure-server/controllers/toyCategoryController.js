const ToyCategory = require('../models/ToyCategory');
const Product = require('../models/Product');
const { DEFAULT_TOY_CATEGORIES } = require('../utils/defaultToyCategories');

const seedDefaultCategories = async () => {
  const count = await ToyCategory.countDocuments();
  if (count > 0) return;
  await ToyCategory.insertMany(DEFAULT_TOY_CATEGORIES);
};

// @desc    Get active toy categories (public)
// @route   GET /api/toy-categories
const getToyCategories = async (req, res, next) => {
  try {
    await seedDefaultCategories();
    const categories = await ToyCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all toy categories (admin)
// @route   GET /api/toy-categories/admin
const getAllToyCategories = async (req, res, next) => {
  try {
    await seedDefaultCategories();
    const categories = await ToyCategory.find({}).sort({ sortOrder: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a toy category
// @route   POST /api/toy-categories
const createToyCategory = async (req, res, next) => {
  try {
    const { name, skuCode, sortOrder, isActive } = req.body;

    if (!name || !skuCode) {
      return res.status(400).json({ message: 'Name and SKU code are required.' });
    }

    const trimmedName = name.trim();
    const normalizedSku = String(skuCode).trim().toUpperCase().slice(0, 5);

    if (!/^[A-Z0-9]{2,5}$/.test(normalizedSku)) {
      return res.status(400).json({ message: 'SKU code must be 2–5 uppercase letters or digits.' });
    }

    const existing = await ToyCategory.findOne({ name: trimmedName });
    if (existing) {
      return res.status(400).json({ message: `Category "${trimmedName}" already exists.` });
    }

    const skuTaken = await ToyCategory.findOne({ skuCode: normalizedSku });
    if (skuTaken) {
      return res.status(400).json({ message: `SKU code "${normalizedSku}" is already in use.` });
    }

    const category = await ToyCategory.create({
      name: trimmedName,
      skuCode: normalizedSku,
      sortOrder: Number(sortOrder) || 0,
      isActive: isActive !== false,
    });

    res.status(201).json({ message: 'Toy category created.', category });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a toy category
// @route   PUT /api/toy-categories/:id
const updateToyCategory = async (req, res, next) => {
  try {
    const category = await ToyCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Toy category not found.' });
    }

    const { name, skuCode, sortOrder, isActive } = req.body;
    const oldName = category.name;

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ message: 'Name cannot be empty.' });
      }
      const duplicate = await ToyCategory.findOne({ name: trimmedName, _id: { $ne: category._id } });
      if (duplicate) {
        return res.status(400).json({ message: `Category "${trimmedName}" already exists.` });
      }
      category.name = trimmedName;
    }

    if (skuCode !== undefined) {
      const normalizedSku = String(skuCode).trim().toUpperCase().slice(0, 5);
      if (!/^[A-Z0-9]{2,5}$/.test(normalizedSku)) {
        return res.status(400).json({ message: 'SKU code must be 2–5 uppercase letters or digits.' });
      }
      const skuTaken = await ToyCategory.findOne({ skuCode: normalizedSku, _id: { $ne: category._id } });
      if (skuTaken) {
        return res.status(400).json({ message: `SKU code "${normalizedSku}" is already in use.` });
      }
      category.skuCode = normalizedSku;
    }

    if (sortOrder !== undefined) category.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    if (name !== undefined && oldName !== category.name) {
      const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const products = await Product.find({ tag: { $regex: escaped, $options: 'i' } });
      for (const product of products) {
        const tags = product.tag.split(',').map((t) => t.trim());
        product.tag = tags
          .map((t) => (t.toLowerCase() === oldName.toLowerCase() ? category.name : t))
          .join(', ');
        await product.save();
      }
    }

    res.json({ message: 'Toy category updated.', category });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a toy category
// @route   DELETE /api/toy-categories/:id
const deleteToyCategory = async (req, res, next) => {
  try {
    const category = await ToyCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Toy category not found.' });
    }

    const escaped = category.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const inUse = await Product.countDocuments({ tag: { $regex: escaped, $options: 'i' } });
    if (inUse > 0) {
      return res.status(400).json({
        message: `Cannot delete "${category.name}" — ${inUse} product(s) use this category. Reassign products first.`,
      });
    }

    await category.deleteOne();
    res.json({ message: 'Toy category deleted.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle toy category active/inactive
// @route   PUT /api/toy-categories/:id/toggle
const toggleToyCategory = async (req, res, next) => {
  try {
    const category = await ToyCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Toy category not found.' });
    }
    category.isActive = !category.isActive;
    await category.save();
    res.json({
      message: `Category ${category.isActive ? 'activated' : 'deactivated'}.`,
      category,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getToyCategories,
  getAllToyCategories,
  createToyCategory,
  updateToyCategory,
  deleteToyCategory,
  toggleToyCategory,
};

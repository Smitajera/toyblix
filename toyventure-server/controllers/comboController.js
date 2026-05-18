const Combo = require('../models/Combo');
const Product = require('../models/Product');
const { COMBO_AGE_GROUPS } = require('../models/Combo');

const computeComboStock = async (items) => {
  if (!items?.length) return 0;
  let minAvailable = Infinity;
  for (const row of items) {
    const product = await Product.findById(row.product).select('countInStock variants');
    if (!product) return 0;
    const stock = Number(product.countInStock) || 0;
    const qty = Math.max(1, Number(row.quantity) || 1);
    minAvailable = Math.min(minAvailable, Math.floor(stock / qty));
  }
  return minAvailable === Infinity ? 0 : minAvailable;
};

const populateCombo = (query) =>
  query.populate({
    path: 'items.product',
    select: 'title img price countInStock sku tag category isDraft',
  });

// @route GET /api/combos
const getCombos = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.ageGroup) filter.ageGroup = req.query.ageGroup;
    if (req.query.isAdmin !== 'true') {
      filter.isDraft = { $ne: true };
      filter.isActive = true;
    }
    const combos = await populateCombo(
      Combo.find(filter).sort({ sortOrder: 1, createdAt: -1 })
    );
    res.json(combos);
  } catch (error) {
    next(error);
  }
};

// @route GET /api/combos/:id
const getComboById = async (req, res, next) => {
  try {
    const combo = await populateCombo(Combo.findById(req.params.id));
    if (!combo) return res.status(404).json({ message: 'Combo not found.' });
    if (combo.isDraft && req.query.isAdmin !== 'true') {
      return res.status(404).json({ message: 'Combo not found.' });
    }
    res.json(combo);
  } catch (error) {
    next(error);
  }
};

// @route POST /api/combos
const createCombo = async (req, res, next) => {
  try {
    const { title, description, img, ageGroup, items, price, oldPrice, sortOrder, isDraft, isActive } = req.body;

    if (!title?.trim() || !img || !ageGroup) {
      return res.status(400).json({ message: 'Title, image, and age group are required.' });
    }
    if (!COMBO_AGE_GROUPS.includes(ageGroup)) {
      return res.status(400).json({ message: `Age group must be one of: ${COMBO_AGE_GROUPS.join(', ')}` });
    }
    if (!items?.length) {
      return res.status(400).json({ message: 'Add at least one product to the combo.' });
    }

    const normalizedItems = items.map((row) => ({
      product: row.product,
      quantity: Math.max(1, Number(row.quantity) || 1),
    }));

    const countInStock = await computeComboStock(normalizedItems);

    const combo = await Combo.create({
      title: title.trim(),
      description: description || '',
      img,
      ageGroup,
      items: normalizedItems,
      price: Number(price) || 0,
      oldPrice: Number(oldPrice) || 0,
      countInStock,
      sortOrder: Number(sortOrder) || 0,
      isDraft: isDraft !== false && isDraft !== 'false',
      isActive: isActive !== false && isActive !== 'false',
    });

    const populated = await populateCombo(Combo.findById(combo._id));
    res.status(201).json({ message: 'Combo created.', combo: populated });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/combos/:id
const updateCombo = async (req, res, next) => {
  try {
    const combo = await Combo.findById(req.params.id);
    if (!combo) return res.status(404).json({ message: 'Combo not found.' });

    const { title, description, img, ageGroup, items, price, oldPrice, sortOrder, isDraft, isActive } = req.body;

    if (title !== undefined) combo.title = title.trim();
    if (description !== undefined) combo.description = description;
    if (img !== undefined) combo.img = img;
    if (ageGroup !== undefined) {
      if (!COMBO_AGE_GROUPS.includes(ageGroup)) {
        return res.status(400).json({ message: `Age group must be one of: ${COMBO_AGE_GROUPS.join(', ')}` });
      }
      combo.ageGroup = ageGroup;
    }
    if (items !== undefined) {
      if (!items.length) {
        return res.status(400).json({ message: 'Combo must include at least one product.' });
      }
      combo.items = items.map((row) => ({
        product: row.product,
        quantity: Math.max(1, Number(row.quantity) || 1),
      }));
    }
    if (price !== undefined) combo.price = Number(price) || 0;
    if (oldPrice !== undefined) combo.oldPrice = Number(oldPrice) || 0;
    if (sortOrder !== undefined) combo.sortOrder = Number(sortOrder) || 0;
    if (isDraft !== undefined) combo.isDraft = isDraft === true || isDraft === 'true';
    if (isActive !== undefined) combo.isActive = isActive === true || isActive === 'true';

    combo.countInStock = await computeComboStock(combo.items);
    await combo.save();

    const populated = await populateCombo(Combo.findById(combo._id));
    res.json({ message: 'Combo updated.', combo: populated });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/combos/:id
const deleteCombo = async (req, res, next) => {
  try {
    const combo = await Combo.findById(req.params.id);
    if (!combo) return res.status(404).json({ message: 'Combo not found.' });
    await combo.deleteOne();
    res.json({ message: 'Combo deleted.' });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/combos/meta/age-groups
const getComboAgeGroups = (req, res) => {
  res.json(COMBO_AGE_GROUPS);
};

module.exports = {
  getCombos,
  getComboById,
  createCombo,
  updateCombo,
  deleteCombo,
  getComboAgeGroups,
  COMBO_AGE_GROUPS,
};

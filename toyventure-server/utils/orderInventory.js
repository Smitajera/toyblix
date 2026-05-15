const Product = require('../models/Product');

const getProductId = (item) => item.product || item._id;

const findVariantIndex = (product, variantLabel) => {
  const label = (variantLabel || '').trim();
  if (!label || !product.variants?.length) return -1;
  const parts = label.split(' - ').map((s) => s.trim());
  const color = parts[0];
  const size = parts[1] || '';
  return product.variants.findIndex((v) => {
    const vc = (v.color || '').trim();
    const vs = (v.size || '').toString().trim();
    if (vc !== color) return false;
    if (!size) return !vs;
    return vs === size;
  });
};

const normalizeOrderItems = (orderItems) =>
  orderItems.map((item) => ({
    title: item.title,
    qty: Number(item.qty),
    img: item.img || item.image || item.images?.[0],
    price: Number(item.price),
    variant: item.variant || '',
    _id: getProductId(item),
  }));

const validateOrderPayload = ({ orderItems, shippingDetails, totalPrice }) => {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    throw new Error('No order items provided');
  }

  const requiredShippingFields = ['fullName', 'phone', 'flatNumber', 'street', 'city', 'pincode'];
  const missingShippingField = requiredShippingFields.find((field) => !shippingDetails?.[field]);
  if (missingShippingField) {
    throw new Error(`Missing shipping field: ${missingShippingField}`);
  }

  if (!Number.isFinite(Number(totalPrice)) || Number(totalPrice) < 0) {
    throw new Error('Total price must be a valid number.');
  }
};

/**
 * Loads each product and attaches DB price, title, image, and _variantIndex for inventory.
 */
const enrichOrderItemsFromCatalog = async (orderItems) => {
  const out = [];
  for (const item of orderItems) {
    const product = await Product.findById(getProductId(item));
    if (!product) {
      throw new Error(`Product ${getProductId(item)} not found.`);
    }

    const hasVariants = product.variants?.length > 0;
    const variantLabel = (item.variant || '').trim();

    if (hasVariants && !variantLabel) {
      throw new Error(`Please select a variant for ${product.title}.`);
    }

    const vIdx = findVariantIndex(product, item.variant);
    if (variantLabel && hasVariants && vIdx < 0) {
      throw new Error(`Invalid variant for ${product.title}.`);
    }

    let unitPrice;
    let img;
    let resolvedVariant = variantLabel;
    let variantIndex = -1;

    if (vIdx >= 0) {
      const v = product.variants[vIdx];
      unitPrice = Number(v.price);
      img = (v.images && v.images[0]) || product.img;
      variantIndex = vIdx;
    } else {
      unitPrice = Number(product.price);
      img = item.img || item.image || product.images?.[0] || product.img;
    }

    out.push({
      title: product.title,
      qty: Number(item.qty),
      img,
      price: unitPrice,
      variant: resolvedVariant,
      _id: getProductId(item),
      _variantIndex: variantIndex,
    });
  }
  return out;
};

const toPersistenceOrderItems = (items) =>
  items.map((line) => {
    const { _variantIndex, ...rest } = line;
    return rest;
  });

const stockAvailableForLine = (product, item) => {
  if (item._variantIndex != null && item._variantIndex >= 0) {
    return product.variants[item._variantIndex].countInStock;
  }
  return product.countInStock;
};

const assertInventoryAvailable = async (orderItems) => {
  for (const item of orderItems) {
    const product = await Product.findById(getProductId(item));

    if (!product) {
      throw new Error(`Product ${item.title || getProductId(item)} not found.`);
    }

    if (!Number.isInteger(Number(item.qty)) || Number(item.qty) <= 0) {
      throw new Error(`Invalid quantity provided for ${product.title}.`);
    }

    const available = stockAvailableForLine(product, item);
    if (available < Number(item.qty)) {
      throw new Error(`Insufficient stock for ${product.title}. Only ${available} left.`);
    }
  }
};

const commitInventoryForOrder = async (orderItems) => {
  const committedItems = [];

  try {
    for (const item of orderItems) {
      const productId = getProductId(item);
      const quantity = Number(item.qty);
      const vIdx = item._variantIndex;

      if (vIdx != null && vIdx >= 0) {
        const path = `variants.${vIdx}.countInStock`;
        const updateResult = await Product.updateOne(
          { _id: productId, [path]: { $gte: quantity } },
          { $inc: { [path]: -quantity } }
        );

        if (!updateResult.modifiedCount) {
          throw new Error(`Inventory changed before payment confirmation for ${item.title || productId}.`);
        }

        committedItems.push({ productId, quantity, variantIndex: vIdx });
      } else {
        const updateResult = await Product.updateOne(
          { _id: productId, countInStock: { $gte: quantity } },
          { $inc: { countInStock: -quantity } }
        );

        if (!updateResult.modifiedCount) {
          throw new Error(`Inventory changed before payment confirmation for ${item.title || productId}.`);
        }

        committedItems.push({ productId, quantity, variantIndex: null });
      }
    }

    return { committed: true };
  } catch (error) {
    for (const committedItem of committedItems) {
      if (committedItem.variantIndex != null && committedItem.variantIndex >= 0) {
        const path = `variants.${committedItem.variantIndex}.countInStock`;
        await Product.updateOne({ _id: committedItem.productId }, { $inc: { [path]: committedItem.quantity } });
      } else {
        await Product.updateOne(
          { _id: committedItem.productId },
          { $inc: { countInStock: committedItem.quantity } }
        );
      }
    }

    return {
      committed: false,
      reason: error.message,
    };
  }
};

module.exports = {
  getProductId,
  normalizeOrderItems,
  validateOrderPayload,
  assertInventoryAvailable,
  commitInventoryForOrder,
  enrichOrderItemsFromCatalog,
  toPersistenceOrderItems,
  findVariantIndex,
};

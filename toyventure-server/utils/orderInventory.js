const Product = require('../models/Product');

const getProductId = (item) => item.product || item._id;

const normalizeOrderItems = (orderItems) =>
  orderItems.map((item) => ({
    title: item.title,
    qty: Number(item.qty),
    img: item.img || item.image || item.images?.[0],
    price: Number(item.price),
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

const assertInventoryAvailable = async (orderItems) => {
  for (const item of orderItems) {
    const product = await Product.findById(getProductId(item));

    if (!product) {
      throw new Error(`Product ${item.title || getProductId(item)} not found.`);
    }

    if (!Number.isInteger(Number(item.qty)) || Number(item.qty) <= 0) {
      throw new Error(`Invalid quantity provided for ${product.title}.`);
    }

    if (product.countInStock < Number(item.qty)) {
      throw new Error(`Insufficient stock for ${product.title}. Only ${product.countInStock} left.`);
    }
  }
};

const commitInventoryForOrder = async (orderItems) => {
  const committedItems = [];

  try {
    for (const item of orderItems) {
      const productId = getProductId(item);
      const quantity = Number(item.qty);

      const updateResult = await Product.updateOne(
        { _id: productId, countInStock: { $gte: quantity } },
        { $inc: { countInStock: -quantity } }
      );

      if (!updateResult.modifiedCount) {
        throw new Error(`Inventory changed before payment confirmation for ${item.title || productId}.`);
      }

      committedItems.push({ productId, quantity });
    }

    return { committed: true };
  } catch (error) {
    for (const committedItem of committedItems) {
      await Product.updateOne(
        { _id: committedItem.productId },
        { $inc: { countInStock: committedItem.quantity } }
      );
    }

    return {
      committed: false,
      reason: error.message,
    };
  }
};

module.exports = {
  normalizeOrderItems,
  validateOrderPayload,
  assertInventoryAvailable,
  commitInventoryForOrder,
};

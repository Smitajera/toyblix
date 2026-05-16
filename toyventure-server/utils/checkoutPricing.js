const Coupon = require('../models/Coupon');
const {
  validateOrderPayload,
  enrichOrderItemsFromCatalog,
  assertPaymentMethodsAllowed,
  toPersistenceOrderItems,
} = require('./orderInventory');

const PRICE_TOLERANCE = 2;
const COD_HANDLING_FEE = 29;

const prepaidTierDiscount = (baseForTier) => {
  const b = Math.round(Number(baseForTier));
  if (b >= 1899 && b <= 2499) return 120;
  if (b >= 2500) return 240;
  return 0;
};

const couponDiscountForSubtotal = async (code, subtotal) => {
  if (!code || !String(code).trim()) {
    return { couponDiscount: 0, normalizedCode: null };
  }

  const coupon = await Coupon.findOne({ code: String(code).toUpperCase().trim() });
  if (!coupon || !coupon.isActive) {
    throw new Error('Invalid coupon code.');
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw new Error('This coupon has expired.');
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new Error('This coupon has reached its usage limit.');
  }

  const total = Number(subtotal) || 0;
  if (total < coupon.minOrderAmount) {
    throw new Error(`Minimum order amount for this coupon is Rs ${coupon.minOrderAmount}.`);
  }

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = Math.round((total * coupon.discountValue) / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.discountValue;
  }
  if (discount > total) discount = total;

  return { couponDiscount: discount, normalizedCode: coupon.code };
};

/**
 * Recomputes totals from catalog + coupon rules (mirrors checkout UI).
 * @param {'cod'|'razorpay'|'demo'} mode
 */
const resolveCheckoutTotals = async (body, mode) => {
  const clientTotal = Number(body.totalPrice);
  const clientDiscountAmount = Number(body.discountAmount) || 0;

  validateOrderPayload({ orderItems: body.orderItems, shippingDetails: body.shippingDetails, totalPrice: clientTotal });

  const enrichedItems = await enrichOrderItemsFromCatalog(body.orderItems);
  assertPaymentMethodsAllowed(enrichedItems, mode);
  const subtotal = enrichedItems.reduce((acc, line) => acc + line.price * line.qty, 0);

  const { couponDiscount, normalizedCode } = await couponDiscountForSubtotal(body.couponCode, subtotal);

  if (!body.couponCode && clientDiscountAmount > PRICE_TOLERANCE) {
    throw new Error('Unexpected discount amount for this order.');
  }
  if (body.couponCode && Math.abs(couponDiscount - clientDiscountAmount) > PRICE_TOLERANCE) {
    throw new Error('Coupon discount does not match server validation. Refresh and try again.');
  }

  const baseAfterCoupon = Math.max(0, subtotal - couponDiscount);
  const deliveryFee = baseAfterCoupon < 500 ? 50 : 0;
  const giftWrapFee = body.isGiftWrapped ? 50 : 0;
  const codFee = mode === 'cod' ? COD_HANDLING_FEE : 0;

  const totalBeforePrepaidTier = baseAfterCoupon + deliveryFee + giftWrapFee + codFee;

  let autoDiscount = 0;
  let finalTotal = totalBeforePrepaidTier;

  if (mode === 'razorpay') {
    const baseForTier = subtotal + deliveryFee + giftWrapFee + codFee;
    autoDiscount = prepaidTierDiscount(baseForTier);
    finalTotal = Math.max(0, totalBeforePrepaidTier - autoDiscount);
  }

  if (Math.abs(clientTotal - finalTotal) > PRICE_TOLERANCE) {
    throw new Error(`Order total mismatch. Expected Rs ${finalTotal} (client sent Rs ${clientTotal}).`);
  }

  const discountAmountStored =
    mode === 'razorpay' ? couponDiscount + autoDiscount : couponDiscount;

  return {
    enrichedItems,
    persistenceItems: toPersistenceOrderItems(enrichedItems),
    subtotal,
    couponDiscount,
    couponCode: normalizedCode,
    deliveryFee,
    giftWrapFee,
    codFee,
    autoDiscount,
    discountAmountStored,
    finalTotal,
  };
};

module.exports = {
  resolveCheckoutTotals,
  PRICE_TOLERANCE,
  COD_HANDLING_FEE,
  prepaidTierDiscount,
};

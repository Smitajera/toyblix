const Coupon = require('../models/Coupon');

// @desc    Create a new coupon
// @route   POST /api/coupons
// @access  Private/Admin
const createCoupon = async (req, res, next) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, expiresAt } = req.body;

    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ message: 'Code, discount type, and discount value are required.' });
    }

    if (discountType === 'percentage' && (discountValue < 1 || discountValue > 100)) {
      return res.status(400).json({ message: 'Percentage discount must be between 1 and 100.' });
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ message: `Coupon code "${code}" already exists.` });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      expiresAt: expiresAt || null,
    });

    res.status(201).json({ message: 'Coupon created successfully!', coupon });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private/Admin
const getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found.' });
    }
    await coupon.deleteOne();
    res.json({ message: 'Coupon deleted.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle coupon active/inactive
// @route   PUT /api/coupons/:id/toggle
// @access  Private/Admin
const toggleCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found.' });
    }
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'}.`, coupon });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate a coupon code (customer-facing)
// @route   POST /api/coupons/validate
// @access  Private (logged in user)
const validateCoupon = async (req, res, next) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Please enter a coupon code.' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid coupon code.' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ message: 'This coupon is no longer active.' });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'This coupon has expired.' });
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'This coupon has reached its usage limit.' });
    }

    const total = Number(cartTotal) || 0;
    if (total < coupon.minOrderAmount) {
      return res.status(400).json({ message: `Minimum order amount for this coupon is Rs ${coupon.minOrderAmount}.` });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.round((total * coupon.discountValue) / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    // Don't let discount exceed cart total
    if (discount > total) {
      discount = total;
    }

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
      finalTotal: total - discount,
      message: `Coupon applied! You save Rs ${discount}.`,
      terms: {
        minOrderAmount: coupon.minOrderAmount || 0,
        maxDiscount: coupon.maxDiscount || null,
        expiresAt: coupon.expiresAt || null,
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Increment coupon usage (called internally after successful order)
// @param   {String} code - The coupon code to increment
// @param   {Number} discountAmount - Discount given on this order
// @param   {Number} orderTotal - Total order value (revenue)
const incrementCouponUsage = async (code, discountAmount = 0, orderTotal = 0) => {
  if (!code) return;
  try {
    await Coupon.findOneAndUpdate(
      { code: code.toUpperCase().trim() },
      {
        $inc: {
          usedCount: 1,
          totalDiscountGiven: Number(discountAmount) || 0,
          totalRevenueGenerated: Number(orderTotal) || 0,
        }
      }
    );
  } catch (err) {
    console.error('Failed to increment coupon usage:', err.message);
  }
};

module.exports = { createCoupon, getAllCoupons, deleteCoupon, toggleCoupon, validateCoupon, incrementCouponUsage };

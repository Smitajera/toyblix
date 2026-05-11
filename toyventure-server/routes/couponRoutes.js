const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createCoupon,
  getAllCoupons,
  deleteCoupon,
  toggleCoupon,
  validateCoupon,
} = require('../controllers/couponController');

// Customer-facing: validate a code
router.post('/validate', protect, validateCoupon);

// Admin: CRUD
router.route('/')
  .get(protect, admin, getAllCoupons)
  .post(protect, admin, createCoupon);

router.delete('/:id', protect, admin, deleteCoupon);
router.put('/:id/toggle', protect, admin, toggleCoupon);

module.exports = router;

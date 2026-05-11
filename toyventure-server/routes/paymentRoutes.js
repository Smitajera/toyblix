const express = require('express');
const router = express.Router();
const {
  createRazorpayOrder,
  createDemoOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  processRefund,
} = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/razorpay/order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);
router.post('/razorpay/webhook', handleRazorpayWebhook);
router.post('/refund/:orderId', protect, admin, processRefund);

// NEW: Demo Payment Route for testing bypassing Razorpay
router.post('/demo', protect, createDemoOrder);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  createRazorpayOrder,
  createDemoOrder,
  verifyRazorpayPayment,
  processRefund,
} = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/authMiddleware');

const demoCheckoutGuard = (req, res, next) => {
  if (process.env.ALLOW_DEMO_PAYMENTS === 'true') {
    return next();
  }
  return res.status(403).json({ message: 'Demo checkout is disabled on this server.' });
};

router.post('/razorpay/order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);
// Webhook is mounted in server.js with express.raw() for signature verification
router.post('/refund/:orderId', protect, admin, processRefund);

router.post('/demo', protect, demoCheckoutGuard, createDemoOrder);

module.exports = router;

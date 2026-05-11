const mongoose = require('mongoose');

// Tracks each Razorpay checkout session — whether it was completed or abandoned
const checkoutSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true, unique: true }, // idempotencyKey used as session ID
  stage: {
    type: String,
    enum: ['cart_viewed', 'address_entered', 'payment_attempted', 'payment_success', 'payment_failed'],
    default: 'cart_viewed'
  },
  razorpayOrderId: { type: String },
  localOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  cartSnapshot: [{ type: Object }],    // Items in cart at time of checkout attempt
  cartValue: { type: Number, default: 0 },
  failureReason: { type: String },     // Razorpay error code / message on failure
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { timestamps: true });

checkoutSessionSchema.index({ user: 1, createdAt: -1 });
checkoutSessionSchema.index({ sessionId: 1 }, { unique: true });
checkoutSessionSchema.index({ stage: 1, isCompleted: 1 });

module.exports = mongoose.model('CheckoutSession', checkoutSessionSchema);

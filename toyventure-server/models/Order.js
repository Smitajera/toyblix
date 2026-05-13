const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    // Link the order to the authenticated user
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    orderItems: [
        {
            title: { type: String }, // Make sure this matches your cart item properties
            qty: { type: Number, required: true },
            img: { type: String },
            price: { type: Number, required: true },
            variant: { type: String },

            _id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            }
        }
    ],
    shippingDetails: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        flatNumber: { type: String, required: true },
        street: { type: String, required: true },
        landmark: { type: String }, // Left optional 
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    isGiftWrapped: {
        type: Boolean,
        default: false
    },
    deliveryFee: {
        type: Number,
        default: 0.0
    },
    giftWrapFee: {
        type: Number,
        default: 0.0
    },
    codFee: {
        type: Number,
        default: 0.0
    },
    discountAmount: {
        type: Number,
        default: 0.0
    },
    pointsUsed: {
        type: Number,
        default: 0
    },
    pointsEarned: {
        type: Number,
        default: 0
    },
    pointsGranted: {
        type: Boolean,
        default: false
    },
    currency: {
        type: String,
        default: 'INR'
    },
    paymentMethod: {
        type: String,
        enum: ['razorpay', 'manual', 'demo', 'cod'], // UPDATED TO INCLUDE 'cod'
        default: 'razorpay'
    },
    orderStatus: {
        type: String,
        enum: ['created', 'pending_payment', 'paid', 'confirmed', 'packed', 'dispatched', 'delivered', 'fulfilled', 'refunded', 'cancelled', 'payment_review', 'rto'],
        default: 'created'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    refundStatus: {
        type: String,
        enum: ['none', 'pending', 'processed', 'failed'],
        default: 'none'
    },
    refundId: { type: String },
    refundAmount: { type: Number, default: 0 },
    idempotencyKey: {
        type: String,
        trim: true
    },
    inventoryCommitted: {
        type: Boolean,
        default: false
    },
    couponCode: {
        type: String,
        default: null,
    },
    inventoryIssue: {
        type: String,
        default: null
    },
    isPaid: {
        type: Boolean,
        required: true,
        default: false
    },
    paidAt: {
        type: Date
    },
    paymentFailureReason: {
        type: String,
        default: null
    },
    razorpay: {
        orderId: { type: String },
        paymentId: { type: String },
        signature: { type: String },
        receipt: { type: String },
        refundId: { type: String },
        amount: { type: Number },
        lastWebhookEvent: { type: String },
        lastWebhookAt: { type: Date }
    },
    isDelivered: {
        type: Boolean,
        required: true,
        default: false
    },
    courier: {
        name: { type: String, default: null },
        trackingLink: { type: String, default: null },
    },
    statusTimestamps: {
        confirmedAt: { type: Date },
        packedAt: { type: Date },
        dispatchedAt: { type: Date },
        deliveredAt: { type: Date },
    },
    deliveredAt: {
        type: Date
    }
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });

// FIX APPLIED HERE: Replaced unique/sparse with partialFilterExpression
orderSchema.index(
    { user: 1, idempotencyKey: 1 }, 
    { 
        unique: true, 
        partialFilterExpression: { idempotencyKey: { $type: "string" } } 
    }
);

orderSchema.index({ 'razorpay.orderId': 1 }, { unique: true, sparse: true });
orderSchema.index({ 'razorpay.paymentId': 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Order', orderSchema);
const Order = require('../models/Order');
const sendEmail = require('../utils/sendEmail');
const generateInvoice = require('../utils/generateInvoice');
const crypto = require('crypto');
const { resolveCheckoutTotals } = require('../utils/checkoutPricing');
const { assertInventoryAvailable, commitInventoryForOrder } = require('../utils/orderInventory');
const { incrementCouponUsage } = require('./couponController');

const isClientCheckoutError = (err) => {
    const m = err?.message || '';
    return (
        m.includes('stock') ||
        m.includes('quantity') ||
        m.includes('Missing') ||
        m.includes('mismatch') ||
        m.includes('coupon') ||
        m.includes('Order total') ||
        m.includes('Unexpected discount') ||
        m.includes('variant') ||
        m.includes('Please select a variant') ||
        m.includes('Minimum order') ||
        m.includes('expired') ||
        m.includes('usage limit') ||
        m.includes('not found.')
    );
};

// @desc    Create new order (specifically for COD)
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    try {
        const { shippingDetails, isGiftWrapped, paymentMethod } = req.body;

        if (paymentMethod !== 'cod') {
            return res.status(400).json({
                message: 'Direct order creation is only for Cash on Delivery. Start checkout through Razorpay for online payments.',
            });
        }

        let resolved;
        try {
            resolved = await resolveCheckoutTotals(req.body, 'cod');
        } catch (e) {
            if (isClientCheckoutError(e)) {
                return res.status(400).json({ message: e.message });
            }
            throw e;
        }

        await assertInventoryAvailable(resolved.enrichedItems);
        const inventoryResult = await commitInventoryForOrder(resolved.enrichedItems);
        if (!inventoryResult.committed) {
            return res.status(400).json({ message: inventoryResult.reason });
        }

        const order = new Order({
            user: req.user._id,
            orderItems: resolved.persistenceItems,
            shippingDetails,
            totalPrice: resolved.finalTotal,
            paymentMethod: 'cod',
            orderStatus: 'confirmed',
            paymentStatus: 'pending',
            isPaid: false,
            couponCode: resolved.couponCode,
            inventoryCommitted: true,
            isGiftWrapped: Boolean(isGiftWrapped),
            deliveryFee: resolved.deliveryFee,
            giftWrapFee: resolved.giftWrapFee,
            codFee: resolved.codFee,
            discountAmount: resolved.discountAmountStored,
            idempotencyKey: req.body.idempotencyKey || `cod_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        });

        const createdOrder = await order.save();

        if (resolved.couponCode) {
            incrementCouponUsage(resolved.couponCode, resolved.couponDiscount, resolved.finalTotal).catch((err) =>
                console.error('COD coupon usage increment failed:', err)
            );
        }

        if (req.user && req.user.email) {
            sendEmail({
                email: req.user.email,
                subject: 'Your ToyBlix COD Order is Confirmed! 🎉',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
                        <h2 style="color: #18181b;">Order Confirmed! 🥳</h2>
                        <p style="color: #52525b; font-size: 16px; line-height: 1.5;">
                            Thank you for choosing ToyBlix! Your Cash on Delivery order <strong>#${String(createdOrder._id).slice(-8).toUpperCase()}</strong> has been successfully placed.
                        </p>
                        <p style="color: #52525b; font-size: 16px;">Amount to pay on delivery: <strong style="color:#f97316;">₹${resolved.finalTotal}</strong></p>
                        <p style="color: #52525b; font-size: 16px;">We will notify you once your package is dispatched.</p>
                    </div>
                `,
            }).catch((err) => console.error('Failed to send COD email:', err));
        }

        res.status(201).json(createdOrder);
    } catch (error) {
        if (isClientCheckoutError(error)) {
            return res.status(400).json({ message: error.message });
        }
        console.error('COD Create Order Error:', error);
        res.status(500).json({ message: 'Server error: Failed to create COD order' });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error("Fetch Orders Error:", error);
        res.status(500).json({ message: 'Server error: Failed to fetch orders' });
    }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'name mobileNumber')
            .populate('orderItems._id', 'title img images')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch all orders' });
    }
};

// @desc    Update order status progressively
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email');

        if (order) {
            const { status, courierName, trackingLink } = req.body;
            
            const validStatuses = ['paid', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Invalid order status provided.' });
            }

            const isFreshlyDispatched = status === 'dispatched' && order.orderStatus !== 'dispatched';

            order.orderStatus = status;

            // Record status timestamps
            if (!order.statusTimestamps) order.statusTimestamps = {};
            const timestampMap = {
                confirmed: 'confirmedAt',
                packed: 'packedAt',
                dispatched: 'dispatchedAt',
                delivered: 'deliveredAt',
            };
            if (timestampMap[status]) {
                order.statusTimestamps[timestampMap[status]] = new Date();
            }

            // Save courier details on dispatch
            if (status === 'dispatched' && (courierName || trackingLink)) {
                order.courier = {
                    name: courierName || null,
                    trackingLink: trackingLink || null,
                };
            }

            // Deliver triggers final flags
            if (status === 'delivered') {
                order.isDelivered = true;
                order.deliveredAt = Date.now();
                
                // IF COD, Automatically mark order as officially Paid once delivered
                if (order.paymentMethod === 'cod') {
                    order.isPaid = true;
                    order.paidAt = Date.now();
                    order.paymentStatus = 'paid';
                }
            }

            const updatedOrder = await order.save({ validateBeforeSave: false });

            // SEND DISPATCH EMAIL
            if (isFreshlyDispatched && order.user && order.user.email) {
                const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
                const courierText = order.courier?.name ? `via <strong>${order.courier.name}</strong>` : '';
                const trackingBtn = order.courier?.trackingLink ? `
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${order.courier.trackingLink}" target="_blank" style="background-color: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                            Track Your Order
                        </a>
                    </div>
                ` : '';

                sendEmail({
                    email: order.user.email,
                    subject: `Your ToyBlix Order has been Dispatched! 📦`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
                            <h2 style="color: #18181b;">It's on the way! 📦</h2>
                            <p style="color: #52525b; font-size: 16px; line-height: 1.5;">
                                Hi ${order.user.name}, your order <strong>#${String(order._id).slice(-8).toUpperCase()}</strong> has been dispatched ${courierText}.
                            </p>
                            <p style="color: #52525b; font-size: 16px;">It will be arriving at your doorstep very soon!</p>
                            ${trackingBtn}
                            <div style="text-align: center; margin-top: 20px;">
                                <a href="${clientUrl}/profile" style="color: #f97316; text-decoration: none; font-weight: bold; font-size: 14px;">
                                    View Full Details on ToyBlix
                                </a>
                            </div>
                        </div>
                    `
                }).catch(err => console.error("Failed to send dispatch email:", err));
            }

            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to update order status' });
    }
};

// @desc    Download order invoice PDF
// @route   GET /api/orders/:id/invoice
// @access  Private
const downloadInvoice = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email mobileNumber');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
             return res.status(401).json({ message: 'Not authorized to view this invoice' });
        }

        const pdfBuffer = await generateInvoice(order, req.user);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("Invoice generation error:", error);
        res.status(500).json({ message: 'Failed to generate invoice' });
    }
};

module.exports = { createOrder, getMyOrders, getOrders, updateOrderStatus, downloadInvoice };

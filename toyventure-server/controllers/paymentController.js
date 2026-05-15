const crypto = require('crypto');
const Order = require('../models/Order');
const PaymentEvent = require('../models/PaymentEvent');
const {
  validateOrderPayload,
  assertInventoryAvailable,
  commitInventoryForOrder,
} = require('../utils/orderInventory');
const { resolveCheckoutTotals } = require('../utils/checkoutPricing');
const { getRazorpayClient } = require('../utils/razorpay');
const { incrementCouponUsage } = require('../controllers/couponController');
const sendEmail = require('../utils/sendEmail');
const generateInvoice = require('../utils/generateInvoice');

const formatBadRequest = (message, res) => res.status(400).json({ message });

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

const sendOrderConfirmationAndInvoice = async (orderId) => {
  try {
    const order = await Order.findById(orderId).populate('user', 'name email mobileNumber');
    if (!order || !order.user || !order.user.email) return;

    const pdfBuffer = await generateInvoice(order, order.user);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    await sendEmail({
      email: order.user.email,
      subject: `Order Confirmation - ToyBlix #${String(order._id).slice(-8).toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
          <h2 style="color: #18181b;">Thank you for your order! 🎉</h2>
          <p style="color: #52525b; font-size: 16px; line-height: 1.5;">
            Hi ${order.user.name}, your payment was successful and your order <strong>#${String(order._id).slice(-8).toUpperCase()}</strong> is now being processed.
          </p>
          <p style="color: #52525b; font-size: 16px;">We have securely attached your PDF invoice to this email for your records.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${clientUrl}/profile" style="background-color: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                View Order Status
            </a>
          </div>
        </div>
      `,
      attachments: [{
        filename: `Invoice_${String(order._id).slice(-8).toUpperCase()}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
  } catch (error) {
    console.error('Failed to send invoice email:', error);
  }
};

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(left || '', 'utf8');
  const rightBuffer = Buffer.from(right || '', 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const buildReceipt = (userId) => `tv_${String(userId).slice(-6)}_${Date.now().toString().slice(-8)}`;

const logPaymentEvent = (payload) => {
  console.log(
    JSON.stringify({
      level: 'info',
      type: 'payment',
      ...payload,
    })
  );
};

const serializeRazorpayOrder = (razorpayOrder) => ({
  id: razorpayOrder.id,
  amount: razorpayOrder.amount,
  currency: razorpayOrder.currency,
  receipt: razorpayOrder.receipt,
  status: razorpayOrder.status,
});

const markOrderPaid = async (order, paymentDetails) => {
  if (order.isPaid && order.paymentStatus === 'paid') {
    order.razorpay = {
      ...order.razorpay,
      paymentId: order.razorpay?.paymentId || paymentDetails.paymentId,
      signature: order.razorpay?.signature || paymentDetails.signature || null,
      lastWebhookEvent: paymentDetails.eventType || order.razorpay?.lastWebhookEvent,
      lastWebhookAt: paymentDetails.eventType ? new Date() : order.razorpay?.lastWebhookAt,
    };
    await order.save();

    return {
      order,
      paymentReviewed: order.orderStatus === 'payment_review',
    };
  }

  if (!order.isPaid) {
    const inventoryResult = await commitInventoryForOrder(order.orderItems);
    // #region agent log
    fetch('http://127.0.0.1:7940/ingest/b612bf23-5ec8-4332-a873-59b574d24a82',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6e7f50'},body:JSON.stringify({sessionId:'6e7f50',hypothesisId:'H-B',location:'paymentController.js:markOrderPaid',message:'inventory commit result',data:{orderId:String(order._id),committed:inventoryResult.committed,reason:inventoryResult.reason||null,itemCount:order.orderItems?.length},timestamp:Date.now(),runId:'post-fix'})}).catch(()=>{});
    // #endregion

    if (!inventoryResult.committed) {
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = 'paid';
      order.orderStatus = 'payment_review';
      order.inventoryCommitted = false;
      order.inventoryIssue = inventoryResult.reason;
      order.paymentFailureReason = null;
      order.razorpay = {
        ...order.razorpay,
        paymentId: paymentDetails.paymentId,
        signature: paymentDetails.signature || order.razorpay?.signature,
        lastWebhookEvent: paymentDetails.eventType || order.razorpay?.lastWebhookEvent,
        lastWebhookAt: paymentDetails.eventType ? new Date() : order.razorpay?.lastWebhookAt,
      };
      await order.save();

      return {
        order,
        paymentReviewed: true,
      };
    }
  }

  order.isPaid = true;
  order.paidAt = order.paidAt || new Date();
  order.paymentStatus = 'paid';
  order.orderStatus = order.isDelivered ? 'fulfilled' : 'paid';
  order.inventoryCommitted = true;
  order.inventoryIssue = null;
  order.paymentFailureReason = null;
  order.razorpay = {
    ...order.razorpay,
    paymentId: paymentDetails.paymentId,
    signature: paymentDetails.signature || order.razorpay?.signature,
    lastWebhookEvent: paymentDetails.eventType || order.razorpay?.lastWebhookEvent,
    lastWebhookAt: paymentDetails.eventType ? new Date() : order.razorpay?.lastWebhookAt,
  };

  await order.save();

  return {
    order,
    paymentReviewed: false,
  };
};

const createRazorpayOrder = async (req, res, next) => {
  try {
    const { shippingDetails, isGiftWrapped } = req.body;
    const idempotencyKey = req.get('Idempotency-Key') || req.body.idempotencyKey;

    if (!idempotencyKey) {
      return formatBadRequest('Missing Idempotency-Key for Razorpay checkout.', res);
    }

    const existingOrder = await Order.findOne({ user: req.user._id, idempotencyKey }).sort({ createdAt: -1 });
    if (existingOrder?.razorpay?.orderId) {
      return res.status(existingOrder.isPaid ? 200 : 201).json({
        message: existingOrder.isPaid ? 'Payment already verified for this checkout.' : 'Existing checkout session found.',
        order: existingOrder,
        razorpayOrder: {
          id: existingOrder.razorpay.orderId,
          amount: existingOrder.razorpay.amount,
          currency: existingOrder.currency,
          receipt: existingOrder.razorpay.receipt,
          status: existingOrder.isPaid ? 'paid' : 'created',
        },
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      });
    }

    let resolved;
    try {
      resolved = await resolveCheckoutTotals(req.body, 'razorpay');
    } catch (e) {
      if (isClientCheckoutError(e)) return formatBadRequest(e.message, res);
      throw e;
    }

    await assertInventoryAvailable(resolved.enrichedItems);

    const finalOrderTotal = resolved.finalTotal;

    const razorpay = getRazorpayClient();
    const receipt = buildReceipt(req.user._id);
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(finalOrderTotal * 100),
      currency: 'INR',
      receipt,
      notes: {
        userId: String(req.user._id),
        requestId: req.requestId,
      },
    });

    await req.user.save();

    const localOrder = await Order.create({
      user: req.user._id,
      orderItems: resolved.persistenceItems,
      shippingDetails,
      totalPrice: finalOrderTotal,
      currency: 'INR',
      paymentMethod: 'razorpay',
      orderStatus: 'pending_payment',
      paymentStatus: 'pending',
      idempotencyKey,
      isGiftWrapped: Boolean(isGiftWrapped),
      deliveryFee: resolved.deliveryFee,
      giftWrapFee: resolved.giftWrapFee,
      codFee: resolved.codFee,
      couponCode: resolved.couponCode,
      discountAmount: resolved.discountAmountStored,
      razorpay: {
        orderId: razorpayOrder.id,
        receipt: razorpayOrder.receipt,
        amount: razorpayOrder.amount,
      },
    });

    logPaymentEvent({
      requestId: req.requestId,
      action: 'create_razorpay_order',
      localOrderId: localOrder._id,
      razorpayOrderId: razorpayOrder.id,
    });

    res.status(201).json({
      message: 'Razorpay order created successfully.',
      order: localOrder,
      razorpayOrder: serializeRazorpayOrder(razorpayOrder),
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    if (isClientCheckoutError(error)) {
      return formatBadRequest(error.message, res);
    }

    next(error);
  }
};

const createDemoOrder = async (req, res, next) => {
  try {
    const { shippingDetails, isGiftWrapped } = req.body;
    const idempotencyKey = req.get('Idempotency-Key') || req.body.idempotencyKey;

    if (!idempotencyKey) {
      return formatBadRequest('Missing Idempotency-Key for checkout.', res);
    }

    const existingOrder = await Order.findOne({ user: req.user._id, idempotencyKey }).sort({ createdAt: -1 });
    if (existingOrder) {
      return res.status(existingOrder.isPaid ? 200 : 201).json({
        message: 'Existing demo checkout session found.',
        order: existingOrder,
      });
    }

    let resolved;
    try {
      resolved = await resolveCheckoutTotals(req.body, 'demo');
    } catch (e) {
      if (isClientCheckoutError(e)) return formatBadRequest(e.message, res);
      throw e;
    }

    await assertInventoryAvailable(resolved.enrichedItems);

    const inventoryResult = await commitInventoryForOrder(resolved.enrichedItems);
    if (!inventoryResult.committed) {
      return res.status(400).json({ message: inventoryResult.reason });
    }

    const localOrder = await Order.create({
      user: req.user._id,
      orderItems: resolved.persistenceItems,
      shippingDetails,
      totalPrice: resolved.finalTotal,
      currency: 'INR',
      paymentMethod: 'demo',
      orderStatus: 'paid',
      paymentStatus: 'paid',
      isPaid: true,
      paidAt: new Date(),
      inventoryCommitted: true,
      idempotencyKey,
      couponCode: resolved.couponCode,
      isGiftWrapped: Boolean(isGiftWrapped),
      deliveryFee: resolved.deliveryFee,
      giftWrapFee: resolved.giftWrapFee,
      codFee: resolved.codFee,
      discountAmount: resolved.discountAmountStored,
    });

    if (resolved.couponCode) {
      await incrementCouponUsage(resolved.couponCode, resolved.couponDiscount, resolved.finalTotal);
    }

    logPaymentEvent({
      requestId: req.requestId,
      action: 'create_demo_order',
      localOrderId: localOrder._id,
    });

    // Fire and forget invoice email
    sendOrderConfirmationAndInvoice(localOrder._id).catch(console.error);

    res.status(201).json({
      message: 'Demo order processed successfully.',
      order: localOrder,
    });
  } catch (error) {
    if (isClientCheckoutError(error)) {
      return formatBadRequest(error.message, res);
    }
    next(error);
  }
};

const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const {
      localOrderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body;

    if (!localOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return formatBadRequest('Missing Razorpay verification fields.', res);
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Missing RAZORPAY_KEY_SECRET environment variable');
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (!safeEqual(expectedSignature, razorpaySignature)) {
      logPaymentEvent({
        requestId: req.requestId,
        action: 'signature_mismatch',
        localOrderId,
        razorpayOrderId,
      });

      return res.status(400).json({ message: 'Invalid Razorpay signature.' });
    }

    const order = await Order.findOne({
      _id: localOrderId,
      user: req.user._id,
      'razorpay.orderId': razorpayOrderId,
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found for verification.' });
    }

    const paymentResult = await markOrderPaid(order, {
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    logPaymentEvent({
      requestId: req.requestId,
      action: 'verify_razorpay_payment',
      localOrderId: order._id,
      razorpayOrderId,
      razorpayPaymentId,
      paymentReviewed: paymentResult.paymentReviewed,
    });

    if (!paymentResult.paymentReviewed) {
      sendOrderConfirmationAndInvoice(order._id).catch(console.error);
      if (order.couponCode) {
        incrementCouponUsage(order.couponCode, order.discountAmount, order.totalPrice).catch(console.error);
      }
    }

    res.status(200).json({
      message: paymentResult.paymentReviewed
        ? 'Payment captured, but inventory needs manual review.'
        : 'Payment verified successfully.',
      order: paymentResult.order,
    });
  } catch (error) {
    next(error);
  }
};

const handleRazorpayWebhook = async (req, res, next) => {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      throw new Error('Missing RAZORPAY_WEBHOOK_SECRET environment variable');
    }

    const signature = req.get('x-razorpay-signature');
    const rawBody = req.rawBody;
    // #region agent log
    fetch('http://127.0.0.1:7940/ingest/b612bf23-5ec8-4332-a873-59b574d24a82',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6e7f50'},body:JSON.stringify({sessionId:'6e7f50',hypothesisId:'H-C',location:'paymentController.js:handleRazorpayWebhook',message:'webhook payload check',data:{hasRawBody:!!rawBody,hasSignature:!!signature,bodyType:typeof req.body},timestamp:Date.now(),runId:'post-fix'})}).catch(()=>{});
    // #endregion

    if (!rawBody || !signature) {
      return res.status(400).json({ message: 'Missing webhook signature or payload.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (!safeEqual(expectedSignature, signature)) {
      return res.status(400).json({ message: 'Invalid webhook signature.' });
    }

    const webhookEventId =
      req.get('x-razorpay-event-id') ||
      crypto.createHash('sha256').update(rawBody).digest('hex');

    const existingEvent = await PaymentEvent.findOne({ provider: 'razorpay', eventId: webhookEventId });
    if (existingEvent) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    const eventType = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;
    const refundEntity = req.body.payload?.refund?.entity;

    let order = null;

    if (paymentEntity?.order_id) {
      order = await Order.findOne({ 'razorpay.orderId': paymentEntity.order_id });
    } else if (refundEntity?.payment_id) {
      order = await Order.findOne({ 'razorpay.paymentId': refundEntity.payment_id });
    }

    if (order) {
      if (eventType === 'payment.captured') {
        await markOrderPaid(order, {
          paymentId: paymentEntity.id,
          eventType,
        });
      }

      if (eventType === 'payment.failed') {
        if (order.isPaid) {
          await PaymentEvent.create({
            provider: 'razorpay',
            eventId: webhookEventId,
            eventType,
            order: order._id,
            payloadHash: crypto.createHash('sha256').update(rawBody).digest('hex'),
          });

          return res.status(200).json({ received: true, ignored: true });
        }

        order.paymentStatus = 'failed';
        order.orderStatus = 'pending_payment';
        order.paymentFailureReason = paymentEntity?.error_description || paymentEntity?.error_reason || 'Payment failed';
        order.razorpay = {
          ...order.razorpay,
          paymentId: paymentEntity?.id || order.razorpay?.paymentId,
          lastWebhookEvent: eventType,
          lastWebhookAt: new Date(),
        };
        await order.save();
      }

      if (eventType === 'refund.processed') {
        order.paymentStatus = 'refunded';
        order.orderStatus = 'refunded';
        order.razorpay = {
          ...order.razorpay,
          refundId: refundEntity?.id || order.razorpay?.refundId,
          lastWebhookEvent: eventType,
          lastWebhookAt: new Date(),
        };
        await order.save();
      }
    }

    await PaymentEvent.create({
      provider: 'razorpay',
      eventId: webhookEventId,
      eventType,
      order: order?._id || null,
      payloadHash: crypto.createHash('sha256').update(rawBody).digest('hex'),
    });

    logPaymentEvent({
      requestId: req.requestId,
      action: 'webhook_processed',
      eventType,
      eventId: webhookEventId,
      localOrderId: order?._id || null,
    });

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

const processRefund = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    const paymentId = order.razorpay?.paymentId;

    if (order.paymentStatus !== 'paid' || !paymentId) {
      return res.status(400).json({ message: 'Only successfully paid online orders can be automatically refunded via Razorpay. For COD, process manually.' });
    }

    if (order.refundStatus === 'processed') {
      return res.status(400).json({ message: 'Refund already processed for this order.' });
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) return res.status(500).json({ message: 'Payment gateway not configured' });

    // Assuming full refund for now
    const refund = await razorpay.payments.refund(paymentId, {
      amount: order.totalPrice * 100, // Razorpay takes amount in paise
      notes: { orderId: order._id.toString() }
    });

    order.refundStatus = 'processed';
    order.refundId = refund.id;
    order.refundAmount = order.totalPrice;
    order.orderStatus = 'refunded';
    order.paymentStatus = 'refunded';
    order.razorpay = {
      ...order.razorpay,
      refundId: refund.id,
    };
    await order.save();

    res.status(200).json({ message: 'Refund processed successfully', refund });
  } catch (error) {
    console.error('Refund processing error:', error);
    res.status(500).json({ message: error.error?.description || 'Failed to process refund with payment gateway' });
  }
};

module.exports = {
  createRazorpayOrder,
  createDemoOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  processRefund,
};

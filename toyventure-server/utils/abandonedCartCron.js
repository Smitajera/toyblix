const cron = require('node-cron');
const User = require('../models/User');
const sendEmail = require('./sendEmail');

// WhatsApp utility (already exists in the project)
let sendWhatsAppMessage;
try {
  sendWhatsAppMessage = require('./whatsapp').sendWhatsAppMessage;
} catch (e) {
  sendWhatsAppMessage = null; // gracefully skip if not configured
}

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const ABANDONED_THRESHOLD_MINUTES = 60; // 1 hour

// Set to track notified users this run (avoid re-notifying)
const notifiedThisSession = new Set();

const findAndNotifyAbandonedCarts = async () => {
  console.log('[AbandonedCart] Running abandoned cart check...');
  
  try {
    const cutoff = new Date(Date.now() - ABANDONED_THRESHOLD_MINUTES * 60 * 1000);

    const usersWithAbandonedCarts = await User.find({
      'cart.0': { $exists: true },        // cart is not empty
      cartUpdatedAt: { $lt: cutoff },      // cart hasn't been updated in 1+ hour
      isBanned: false,
    }).select('name email mobileNumber cart cartUpdatedAt');

    console.log(`[AbandonedCart] Found ${usersWithAbandonedCarts.length} abandoned carts.`);

    for (const user of usersWithAbandonedCarts) {
      const userId = user._id.toString();
      
      // Skip if already notified in this cron run
      if (notifiedThisSession.has(userId)) continue;

      const cartTotal = user.cart.reduce((sum, item) => {
        const price = item.price || item.variant?.price || 0;
        return sum + (price * (item.qty || 1));
      }, 0);

      const cartItemCount = user.cart.length;
      const firstName = user.name?.split(' ')[0] || 'there';

      // 1. Send Email (if user has email)
      if (user.email) {
        try {
          await sendEmail({
            email: user.email,
            subject: `🧸 You left some amazing toys behind!`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #7f1d1d;">Hey ${firstName}, your cart misses you! 🎁</h2>
                <p style="color: #52525b; font-size: 16px;">
                  You left <strong>${cartItemCount} item${cartItemCount > 1 ? 's' : ''}</strong> worth <strong>₹${cartTotal.toFixed(0)}</strong> in your cart.
                </p>
                <p style="color: #52525b;">Don't let these amazing toys go out of stock!</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${CLIENT_URL}/cart" style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Complete My Order →
                  </a>
                </div>
                <p style="color: #9ca3af; font-size: 12px;">
                  This is a one-time reminder from ToyBlix. We won't spam you!
                </p>
              </div>
            `,
          });
          console.log(`[AbandonedCart] Recovery email sent to ${user.email}`);
        } catch (emailErr) {
          console.error(`[AbandonedCart] Email failed for ${user.email}:`, emailErr.message);
        }
      }

      // 2. Send WhatsApp (if user has phone and WhatsApp is configured)
      if (user.mobileNumber && sendWhatsAppMessage) {
        try {
          await sendWhatsAppMessage({
            to: `91${user.mobileNumber}`,
            templateName: 'abandoned_cart_recovery',
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: firstName },
                  { type: 'text', text: String(cartItemCount) },
                  { type: 'text', text: `₹${cartTotal.toFixed(0)}` },
                ]
              }
            ]
          });
          console.log(`[AbandonedCart] WhatsApp recovery sent to ${user.mobileNumber}`);
        } catch (waErr) {
          console.error(`[AbandonedCart] WhatsApp failed for ${user.mobileNumber}:`, waErr.message);
        }
      }

      notifiedThisSession.add(userId);
    }
  } catch (err) {
    console.error('[AbandonedCart] Cron job error:', err.message);
  }
};

// Run every 30 minutes
const startAbandonedCartCron = () => {
  cron.schedule('*/30 * * * *', findAndNotifyAbandonedCarts, {
    timezone: 'Asia/Kolkata'
  });
  console.log('[AbandonedCart] Cron job scheduled — runs every 30 minutes (IST).');
};

module.exports = { startAbandonedCartCron, findAndNotifyAbandonedCarts };

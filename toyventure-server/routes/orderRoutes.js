const express = require('express');
const router = express.Router();
const { 
    createOrder, 
    getMyOrders, 
    getOrders, 
    updateOrderStatus, 
    downloadInvoice
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware'); 

// Protect these routes so only logged-in users can access them
// NEW: GET '/' now fetches all orders for the admin
router.route('/')
    .post(protect, createOrder)
    .get(protect, admin, getOrders); 

router.get('/myorders', protect, getMyOrders);

// NEW: Route for downloading order invoice
router.get('/:id/invoice', protect, downloadInvoice);

// NEW: Route for admin to update order status dynamically
router.route('/:id/status').put(protect, admin, updateOrderStatus);

module.exports = router;
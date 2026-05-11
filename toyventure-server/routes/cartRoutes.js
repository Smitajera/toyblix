const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
router.get('/', protect, (req, res) => {
    res.status(200).json({ message: 'Get Cart Route Working' });
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
router.post('/', protect, (req, res) => {
    res.status(200).json({ message: 'Add to Cart Route Working' });
});

module.exports = router;
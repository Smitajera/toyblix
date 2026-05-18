const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getToyCategories,
  getAllToyCategories,
  createToyCategory,
  updateToyCategory,
  deleteToyCategory,
  toggleToyCategory,
} = require('../controllers/toyCategoryController');

router.get('/', getToyCategories);
router.get('/admin', protect, admin, getAllToyCategories);

router.route('/')
  .post(protect, admin, createToyCategory);

router.put('/:id', protect, admin, updateToyCategory);
router.delete('/:id', protect, admin, deleteToyCategory);
router.put('/:id/toggle', protect, admin, toggleToyCategory);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getCombos,
  getComboById,
  createCombo,
  updateCombo,
  deleteCombo,
  getComboAgeGroups,
} = require('../controllers/comboController');

router.get('/meta/age-groups', getComboAgeGroups);
router.get('/', getCombos);
router.get('/:id', getComboById);

router.post('/', protect, admin, createCombo);
router.put('/:id', protect, admin, updateCombo);
router.delete('/:id', protect, admin, deleteCombo);

module.exports = router;

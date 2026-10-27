const express = require('express');
const router = express.Router();
const {
  getItems,
  getItemStats,
  getRecentItems,
  getMyReports,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  updateItemStatus,
  flagItem,
  migrateLegacyReports,
} = require('../controllers/itemController');
const { protect, optionalAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public read routes
router.get('/', getItems);
router.get('/stats', getItemStats);
router.get('/recent', getRecentItems);

// User-specific read routes
router.get('/my-reports', protect, getMyReports);

// Single item read with optional auth for privileged fields
router.get('/:id', optionalAuth, getItemById);

// Create item with optional image file upload
router.post('/', protect, upload.single('image'), createItem);

// Update item (with optional image)
router.put('/:id', protect, upload.single('image'), updateItem);

// Delete item
router.delete('/:id', protect, deleteItem);

// Update item status
router.patch('/:id/status', protect, updateItemStatus);

// Flag report
router.post('/:id/flag', protect, flagItem);

// Migrate legacy localStorage reports
router.post('/migrate-legacy', protect, migrateLegacyReports);

module.exports = router;

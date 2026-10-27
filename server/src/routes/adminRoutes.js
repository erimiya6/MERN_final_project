const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  getModerationItems,
  dismissItemFlags,
  deleteItemByAdmin,
  getAuditLogs,
} = require('../controllers/adminController');
const { getResolvedItems } = require('../controllers/itemController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require authentication and admin/moderator role
router.use(protect);

// Routes accessible by both Admin and Moderator
router.get('/moderation', authorize('admin', 'moderator'), getModerationItems);
router.get('/resolved-items', authorize('admin', 'moderator'), getResolvedItems);
router.patch('/items/:id/dismiss-flags', authorize('admin', 'moderator'), dismissItemFlags);
router.delete('/items/:id', authorize('admin', 'moderator'), deleteItemByAdmin);

// Strict Admin-only routes
router.get('/stats', authorize('admin'), getAdminStats);
router.get('/users', authorize('admin'), getAllUsers);
router.patch('/users/:id/role', authorize('admin'), updateUserRole);
router.patch('/users/:id/status', authorize('admin'), updateUserStatus);
router.get('/audit-logs', authorize('admin'), getAuditLogs);

module.exports = router;

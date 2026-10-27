const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../services/auditService');

// @desc    Get administrative metrics and analytics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getAdminStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalItems,
      totalClaims,
      resolvedItems,
      flaggedCount,
      categoryAgg,
    ] = await Promise.all([
      User.countDocuments(),
      Item.countDocuments(),
      Claim.countDocuments(),
      Item.countDocuments({ status: 'resolved' }),
      Item.countDocuments({ $or: [{ isFlagged: true }, { flagCount: { $gt: 0 } }] }),
      Item.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Calculate recovery percentage
    const recoveryRate = totalItems > 0 ? Math.round((resolvedItems / totalItems) * 100) : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalItems,
        totalClaims,
        resolvedItems,
        flaggedCount,
        recoveryRate,
        categoryBreakdown: categoryAgg,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users with search and pagination
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (search) {
      const escaped = require('../utils/sanitize').escapeRegex(search.trim().slice(0, 100));
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }
    if (role && role !== 'all') query.role = role;
    if (status && status !== 'all') query.status = status;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a user's role (user, moderator, admin)
// @route   PATCH /api/admin/users/:id/role
// @access  Private (Admin only)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified.',
      });
    }

    // Prevent self-demotion if the admin is the sole admin
    if (req.user._id.toString() === req.params.id && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the last remaining administrator.',
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await logAudit({
      actor: req.user._id,
      action: 'ADMIN_UPDATE_ROLE',
      targetModel: 'User',
      targetId: user._id,
      req,
      metadata: { newRole: role, userEmail: user.email },
    });

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a user's status (active, suspended)
// @route   PATCH /api/admin/users/:id/status
// @access  Private (Admin only)
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active or suspended.',
      });
    }

    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot suspend their own account.',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await logAudit({
      actor: req.user._id,
      action: 'ADMIN_UPDATE_USER_STATUS',
      targetModel: 'User',
      targetId: user._id,
      req,
      metadata: { newStatus: status, userEmail: user.email },
    });

    res.status(200).json({
      success: true,
      message: `User status changed to ${status}`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get moderation queue (flagged items)
// @route   GET /api/admin/moderation
// @access  Private (Admin / Moderator)
exports.getModerationItems = async (req, res, next) => {
  try {
    const items = await Item.find({
      $or: [{ isFlagged: true }, { flagCount: { $gt: 0 } }],
    })
      .populate('reporter', 'name email')
      .populate('flagReasons.user', 'name email')
      .sort({ flagCount: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin moderate/dismiss flag on item
// @route   PATCH /api/admin/items/:id/dismiss-flags
// @access  Private (Admin / Moderator)
exports.dismissItemFlags = async (req, res, next) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { isFlagged: false, flagCount: 0, flagReasons: [] },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    await logAudit({
      actor: req.user._id,
      action: 'DISMISS_FLAGS',
      targetModel: 'Item',
      targetId: item._id,
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Flags dismissed. Item returned to normal public status.',
      item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin delete violating item report
// @route   DELETE /api/admin/items/:id
// @access  Private (Admin / Moderator)
exports.deleteItemByAdmin = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    await item.deleteOne();

    await logAudit({
      actor: req.user._id,
      action: 'ADMIN_DELETE_ITEM',
      targetModel: 'Item',
      targetId: req.params.id,
      req,
      metadata: { itemTitle: item.title, reporterId: item.reporter },
    });

    res.status(200).json({
      success: true,
      message: 'Item permanently removed by campus administration.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin only)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 30;
    const skip = (pageNum - 1) * limitNum;

    const total = await AuditLog.countDocuments();
    const logs = await AuditLog.find()
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

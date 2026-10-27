const Item = require('../models/Item');
const { processUploadedFile } = require('../middleware/upload');
const { logAudit } = require('../services/auditService');
const { escapeRegex, sanitizeContactInfo } = require('../utils/sanitize');

// @desc    Get all public items with search, multi-filters, sorting, and pagination
// @route   GET /api/items
// @access  Public
exports.getItems = async (req, res, next) => {
  try {
    const {
      search,
      reportType,
      category,
      status,
      campusZone,
      building,
      startDate,
      endDate,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const query = { publicVisibility: true };

    // Always hide resolved items from public browse — they are admin-only
    query.status = { $ne: 'resolved' };

    // Search term matching title, description, or location (safely escaped)
    if (search && search.trim() !== '') {
      const escaped = escapeRegex(search.trim().slice(0, 100));
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { 'location.building': searchRegex },
        { 'location.room': searchRegex },
      ];
    }

    // Filter by report type (lost / found)
    if (reportType && reportType !== 'all') {
      query.reportType = reportType;
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Further status filter (e.g. pending_claim) — but never allow resolved through public API
    if (status && status !== 'all' && status !== 'resolved') {
      query.status = status;
    }

    // Filter by campus zone
    if (campusZone && campusZone !== 'all') {
      query['location.campusZone'] = campusZone;
    }

    // Filter by specific building (safely escaped)
    if (building && building.trim() !== '') {
      query['location.building'] = new RegExp(escapeRegex(building.trim().slice(0, 100)), 'i');
    }

    // Date range filter
    if (startDate || endDate) {
      query.dateLostFound = {};
      if (startDate) query.dateLostFound.$gte = new Date(startDate);
      if (endDate) query.dateLostFound.$lte = new Date(endDate);
    }

    // Sorting
    let sortOption = { createdAt: -1 }; // Default newest
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'date_desc') {
      sortOption = { dateLostFound: -1 };
    } else if (sort === 'date_asc') {
      sortOption = { dateLostFound: 1 };
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const total = await Item.countDocuments(query);
    const items = await Item.find(query)
      .select('-privateIdentifyingInfo -flagReasons') // Never leak secret marks to public lists
      .populate('reporter', 'name avatar contactPreference')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get summary statistics (total, lost, found, resolved, returned)
// @route   GET /api/items/stats
// @access  Public
exports.getItemStats = async (req, res, next) => {
  try {
    const [totalReports, lostCount, foundCount, resolvedCount] = await Promise.all([
      Item.countDocuments({ publicVisibility: true }),
      Item.countDocuments({ reportType: 'lost', status: 'lost' }),
      Item.countDocuments({ reportType: 'found', status: 'found' }),
      Item.countDocuments({ status: 'resolved' }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalReports,
        lostCount,
        foundCount,
        resolvedCount,
        recoveryRate: totalReports > 0 ? Math.round((resolvedCount / totalReports) * 100) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent 6 items for landing page
// @route   GET /api/items/recent
// @access  Public
exports.getRecentItems = async (req, res, next) => {
  try {
    // Exclude resolved items — those are admin-only
    const items = await Item.find({ publicVisibility: true, status: { $ne: 'resolved' } })
      .select('-privateIdentifyingInfo -flagReasons')
      .populate('reporter', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get resolved items — admin-only archive
// @route   GET /api/items/resolved
// @access  Private (Admin / Moderator only)
exports.getResolvedItems = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 12 } = req.query;

    const query = { status: 'resolved' };

    if (search && search.trim() !== '') {
      const escaped = escapeRegex(search.trim().slice(0, 100));
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const total = await Item.countDocuments(query);
    const items = await Item.find(query)
      .populate('reporter', 'name avatar email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reports created by authenticated user
// @route   GET /api/items/my-reports
// @access  Private
exports.getMyReports = async (req, res, next) => {
  try {
    const items = await Item.find({ reporter: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single item details by ID
// @route   GET /api/items/:id
// @access  Public (Optional Auth for owner / admin privileges)
exports.getItemById = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id).populate(
      'reporter',
      'name avatar email phone contactPreference'
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    const isOwner = req.user && item.reporter && req.user._id.toString() === item.reporter._id.toString();
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'moderator');

    // Visibility safeguard: Resolved items and items with publicVisibility: false
    // are only accessible by their reporter or campus administrators/moderators.
    if ((item.status === 'resolved' || !item.publicVisibility) && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'This report has been resolved or archived and is only accessible by administrators and the reporter.',
      });
    }

    // Convert to plain object to sanitize fields
    const itemObj = item.toObject();

    // Conceal private identifying details from anyone except owner or staff
    if (!isOwner && !isAdmin) {
      delete itemObj.privateIdentifyingInfo;
      delete itemObj.flagReasons;
    }

    // Uniform contact privacy enforcement
    if (itemObj.reporter) {
      itemObj.reporter = sanitizeContactInfo(itemObj.reporter, isOwner || isAdmin);
    }

    // Similar / duplicate suggestion items based on category and campusZone
    const similarItems = await Item.find({
      _id: { $ne: item._id },
      category: item.category,
      publicVisibility: true,
      status: { $ne: 'resolved' },
    })
      .select('title category images location reportType status dateLostFound createdAt')
      .limit(4);

    res.status(200).json({
      success: true,
      item: itemObj,
      isOwner: !!isOwner,
      similarItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Report a new item (with optional image)
// @route   POST /api/items
// @access  Private
exports.createItem = async (req, res, next) => {
  try {
    const {
      title,
      description,
      reportType,
      category,
      location,
      dateLostFound,
      timeLostFound,
      contactPhone,
      contactPreference,
      privateIdentifyingInfo,
    } = req.body;

    if (!title || !description || !reportType) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and report type (lost/found) are required.',
      });
    }

    // Parse location if sent as stringified JSON in multipart forms
    let parsedLocation = { building: 'Campus Ground', room: '', campusZone: 'Central Hub' };
    if (typeof location === 'string') {
      try {
        parsedLocation = JSON.parse(location);
      } catch (e) {
        parsedLocation.building = location;
      }
    } else if (typeof location === 'object' && location !== null) {
      parsedLocation = location;
    }

    // Handle uploaded image if present
    const images = [];
    if (req.file) {
      const uploadResult = await processUploadedFile(req, req.file);
      if (uploadResult) {
        images.push(uploadResult);
      }
    }

    const item = await Item.create({
      title,
      description,
      reportType,
      category: category || 'Other',
      images,
      location: parsedLocation,
      dateLostFound: dateLostFound ? new Date(dateLostFound) : new Date(),
      timeLostFound: timeLostFound || '',
      reporter: req.user._id,
      contactPhone: contactPhone || req.user.phone || '',
      contactPreference: contactPreference || req.user.contactPreference || 'in_app',
      privateIdentifyingInfo: privateIdentifyingInfo || '',
    });

    await logAudit({
      actor: req.user._id,
      action: 'ITEM_REPORTED',
      targetModel: 'Item',
      targetId: item._id,
      req,
      metadata: { title: item.title, reportType: item.reportType, category: item.category },
    });

    // Notify community feed via socket.io
    const io = req.app.get('io');
    if (io) {
      io.to('community_feed').emit('new_item_posted', {
        _id: item._id,
        title: item.title,
        reportType: item.reportType,
        category: item.category,
        location: item.location,
        createdAt: item.createdAt,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Item reported successfully!',
      item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing report
// @route   PUT /api/items/:id
// @access  Private (Owner or Admin)
exports.updateItem = async (req, res, next) => {
  try {
    let item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    // Authorization: User must be reporter or admin
    if (
      item.reporter.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'moderator'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this report.',
      });
    }

    const {
      title,
      description,
      category,
      location,
      dateLostFound,
      timeLostFound,
      contactPhone,
      contactPreference,
      privateIdentifyingInfo,
      status,
    } = req.body;

    const fieldsToUpdate = {};
    if (title) fieldsToUpdate.title = title;
    if (description) fieldsToUpdate.description = description;
    if (category) fieldsToUpdate.category = category;
    if (dateLostFound) fieldsToUpdate.dateLostFound = new Date(dateLostFound);
    if (timeLostFound !== undefined) fieldsToUpdate.timeLostFound = timeLostFound;
    if (contactPhone !== undefined) fieldsToUpdate.contactPhone = contactPhone;
    if (contactPreference) fieldsToUpdate.contactPreference = contactPreference;
    if (privateIdentifyingInfo !== undefined) fieldsToUpdate.privateIdentifyingInfo = privateIdentifyingInfo;
    // Restrict direct status change: Ordinary updates cannot transition an item directly to 'resolved'.
    // Items must be resolved through an approved claim, or via administrative override.
    if (status) {
      const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';
      if (status === 'resolved' && !isAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Items cannot be resolved directly through report edit. Please approve a valid claim to resolve this item.',
        });
      }
      fieldsToUpdate.status = status;
    }

    if (location) {
      if (typeof location === 'string') {
        try {
          fieldsToUpdate.location = JSON.parse(location);
        } catch (e) {
          fieldsToUpdate.location = { ...item.location, building: location };
        }
      } else {
        fieldsToUpdate.location = location;
      }
    }

    // Handle new uploaded image
    if (req.file) {
      const uploadResult = await processUploadedFile(req, req.file);
      if (uploadResult) {
        fieldsToUpdate.images = [uploadResult];
      }
    }

    item = await Item.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    await logAudit({
      actor: req.user._id,
      action: 'ITEM_UPDATED',
      targetModel: 'Item',
      targetId: item._id,
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an item report
// @route   DELETE /api/items/:id
// @access  Private (Owner or Admin)
exports.deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    // Authorization: User must be reporter or admin
    if (
      item.reporter.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'moderator'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this report.',
      });
    }

    await item.deleteOne();

    await logAudit({
      actor: req.user._id,
      action: 'ITEM_DELETED',
      targetModel: 'Item',
      targetId: req.params.id,
      req,
      metadata: { title: item.title },
    });

    res.status(200).json({
      success: true,
      message: 'Item report deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark item as Resolved or change status
// @route   PATCH /api/items/:id/status
// @access  Private (Owner or Admin)
exports.updateItemStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['lost', 'found', 'pending_claim', 'resolved', 'archived'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    if (
      item.reporter.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'moderator'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to change this item status.',
      });
    }

    // Resolving an item directly without approved claim is restricted to campus staff/admin
    if (status === 'resolved' && req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(400).json({
        success: false,
        message: 'Reports can only be marked as resolved through the verified ownership claim approval workflow.',
      });
    }

    item.status = status;
    await item.save();

    await logAudit({
      actor: req.user._id,
      action: 'ITEM_STATUS_CHANGED',
      targetModel: 'Item',
      targetId: item._id,
      req,
      metadata: { newStatus: status },
    });

    res.status(200).json({
      success: true,
      message: `Item marked as ${status}`,
      item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Flag an item for inappropriate content or moderation
// @route   POST /api/items/:id/flag
// @access  Private
exports.flagItem = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    // Check if user already flagged this item
    const alreadyFlagged = item.flagReasons.some(
      (f) => f.user && f.user.toString() === req.user._id.toString()
    );

    if (alreadyFlagged) {
      return res.status(400).json({
        success: false,
        message: 'You have already flagged this item for review.',
      });
    }

    item.flagReasons.push({
      user: req.user._id,
      reason: reason || 'Inappropriate or misleading content',
    });
    item.flagCount += 1;

    // Automatically mark as flagged if multiple users report it
    if (item.flagCount >= 2) {
      item.isFlagged = true;
    }

    await item.save();

    res.status(200).json({
      success: true,
      message: 'Thank you for your report. Campus moderators have been notified.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Migrate legacy LocalStorage reports into user account
// @route   POST /api/items/migrate-legacy
// @access  Private
exports.migrateLegacyReports = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of legacy items to migrate.',
      });
    }

    const createdItems = [];

    for (const legacy of items) {
      if (!legacy.name && !legacy.title) continue;

      const reportType = (legacy.type || legacy.reportType || 'lost').toLowerCase();
      const validReportType = ['lost', 'found'].includes(reportType) ? reportType : 'lost';

      const created = await Item.create({
        title: legacy.name || legacy.title,
        description: legacy.description || 'Migrated report from legacy LocalStorage system.',
        reportType: validReportType,
        category: legacy.category || 'Other',
        location: {
          building: legacy.location || 'Campus Center',
          room: '',
          campusZone: 'Central Hub',
        },
        contactPhone: legacy.contact || legacy.phone || req.user.phone || '',
        dateLostFound: legacy.date ? new Date(legacy.date) : new Date(),
        reporter: req.user._id,
      });

      createdItems.push(created);
    }

    await logAudit({
      actor: req.user._id,
      action: 'LEGACY_MIGRATION',
      targetModel: 'Item',
      targetId: req.user._id,
      req,
      metadata: { count: createdItems.length },
    });

    res.status(201).json({
      success: true,
      message: `Successfully migrated ${createdItems.length} legacy items to your account!`,
      items: createdItems,
    });
  } catch (error) {
    next(error);
  }
};

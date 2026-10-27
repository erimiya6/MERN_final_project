const Claim = require('../models/Claim');
const Item = require('../models/Item');
const { createNotification } = require('../services/notificationService');
const { logAudit } = require('../services/auditService');

// @desc    Submit a claim for an item
// @route   POST /api/claims
// @access  Private
exports.submitClaim = async (req, res, next) => {
  try {
    const { itemId, privateMessage, proofDetails } = req.body;

    if (!itemId || !privateMessage || !proofDetails) {
      return res.status(400).json({
        success: false,
        message: 'Item ID, message, and proof of ownership are required.',
      });
    }

    const item = await Item.findById(itemId).populate('reporter', 'name email');
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    if (item.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'This item has already been resolved and returned to its owner.',
      });
    }

    // Reporter cannot claim their own item
    if (item.reporter._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot submit a claim for an item you reported yourself.',
      });
    }

    // Check if user already submitted a pending claim for this item
    const existingClaim = await Claim.findOne({
      item: itemId,
      claimant: req.user._id,
      claimStatus: { $in: ['pending', 'under_review'] },
    });

    if (existingClaim) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active claim pending review for this item.',
      });
    }

    const claim = await Claim.create({
      item: itemId,
      claimant: req.user._id,
      privateMessage,
      proofDetails,
    });

    // Update item status to pending_claim if not already
    if (item.status !== 'pending_claim') {
      item.status = 'pending_claim';
      await item.save();
    }

    // Send in-app notification to item reporter
    await createNotification({
      app: req.app,
      recipient: item.reporter._id,
      actor: req.user._id,
      type: 'claim_received',
      title: 'New Ownership Claim Received',
      message: `${req.user.name} submitted a claim request for "${item.title}". Review the provided proof.`,
      relatedItem: item._id,
      relatedClaim: claim._id,
    });

    await logAudit({
      actor: req.user._id,
      action: 'CLAIM_SUBMITTED',
      targetModel: 'Claim',
      targetId: claim._id,
      req,
      metadata: { itemId: item._id, itemTitle: item.title },
    });

    res.status(201).json({
      success: true,
      message: 'Claim submitted successfully. The finder has been notified.',
      claim,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all claims submitted by the logged-in user
// @route   GET /api/claims/my-claims
// @access  Private
exports.getMyClaims = async (req, res, next) => {
  try {
    const claims = await Claim.find({ claimant: req.user._id })
      .populate({
        path: 'item',
        select: 'title category images location status reportType dateLostFound',
        populate: { path: 'reporter', select: 'name email phone contactPreference' },
      })
      .sort({ createdAt: -1 });

    const { sanitizeContactInfo } = require('../utils/sanitize');
    const sanitizedClaims = claims.map((c) => {
      const cObj = c.toObject();
      if (cObj.item && cObj.item.reporter) {
        cObj.item.reporter = sanitizeContactInfo(cObj.item.reporter, false);
      }
      return cObj;
    });

    res.status(200).json({
      success: true,
      count: sanitizedClaims.length,
      claims: sanitizedClaims,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all claims submitted on an item (Reporter or Admin only)
// @route   GET /api/claims/item/:itemId
// @access  Private
exports.getItemClaims = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    const isReporter = item.reporter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';

    if (!isReporter && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review claims for this item.',
      });
    }

    const claims = await Claim.find({ item: req.params.itemId })
      .populate('claimant', 'name email phone avatar contactPreference')
      .sort({ createdAt: -1 });

    const { sanitizeContactInfo } = require('../utils/sanitize');
    const sanitizedClaims = claims.map((c) => {
      const cObj = c.toObject();
      if (cObj.claimant) {
        cObj.claimant = sanitizeContactInfo(cObj.claimant, isReporter || isAdmin);
      }
      return cObj;
    });

    res.status(200).json({
      success: true,
      count: sanitizedClaims.length,
      itemTitle: item.title,
      privateIdentifyingInfo: item.privateIdentifyingInfo, // Displayed to reporter to verify against proof
      claims: sanitizedClaims,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Review a claim (approve or reject)
// @route   PATCH /api/claims/:id/review
// @access  Private (Reporter or Admin)
exports.reviewClaim = async (req, res, next) => {
  try {
    const { status, reviewNotes } = req.body;

    if (!['approved', 'rejected', 'under_review'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, rejected, or under_review.',
      });
    }

    const claim = await Claim.findById(req.params.id)
      .populate('item')
      .populate('claimant', 'name email');

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found',
      });
    }

    const item = await Item.findById(claim.item._id);
    const isReporter = item.reporter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';

    if (!isReporter && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this claim.',
      });
    }

    claim.claimStatus = status;
    claim.reviewer = req.user._id;
    claim.reviewNotes = reviewNotes || '';

    if (status === 'approved') {
      claim.resolvedAt = new Date();
      await claim.save();

      // Mark the item as resolved
      item.status = 'resolved';
      await item.save();

      // Reject all other pending claims on this item
      await Claim.updateMany(
        { item: item._id, _id: { $ne: claim._id }, claimStatus: 'pending' },
        {
          claimStatus: 'rejected',
          reviewer: req.user._id,
          reviewNotes: 'Another verified claim was approved for this item.',
          resolvedAt: new Date(),
        }
      );

      // Notify claimant of approval
      await createNotification({
        app: req.app,
        recipient: claim.claimant._id,
        actor: req.user._id,
        type: 'claim_approved',
        title: 'Claim Approved! 🎉',
        message: `Your claim for "${item.title}" was approved! Check item details to coordinate recovery.`,
        relatedItem: item._id,
        relatedClaim: claim._id,
      });
    } else if (status === 'rejected') {
      claim.resolvedAt = new Date();
      await claim.save();

      // Check if there are remaining pending claims
      const remainingPending = await Claim.countDocuments({
        item: item._id,
        claimStatus: 'pending',
      });

      if (remainingPending === 0) {
        item.status = item.reportType === 'lost' ? 'lost' : 'found';
        await item.save();
      }

      // Notify claimant of rejection
      await createNotification({
        app: req.app,
        recipient: claim.claimant._id,
        actor: req.user._id,
        type: 'claim_rejected',
        title: 'Claim Request Update',
        message: `Your claim for "${item.title}" could not be verified. Note: ${reviewNotes || 'Proof did not match item characteristics.'}`,
        relatedItem: item._id,
        relatedClaim: claim._id,
      });
    } else {
      await claim.save();
    }

    await logAudit({
      actor: req.user._id,
      action: `CLAIM_${status.toUpperCase()}`,
      targetModel: 'Claim',
      targetId: claim._id,
      req,
      metadata: { itemId: item._id, status },
    });

    res.status(200).json({
      success: true,
      message: `Claim successfully marked as ${status}.`,
      claim,
    });
  } catch (error) {
    next(error);
  }
};

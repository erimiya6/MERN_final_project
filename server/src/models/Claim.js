const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'Claim must reference an item'],
    },
    claimant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Claim must have a claimant'],
    },
    privateMessage: {
      type: String,
      required: [true, 'Please explain your claim to the reporter'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    proofDetails: {
      type: String,
      required: [true, 'Please describe unique proof of ownership (e.g. serial number, wallpaper, scratches)'],
      maxlength: [2000, 'Proof details cannot exceed 2000 characters'],
    },
    proofAttachments: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
      },
    ],
    claimStatus: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewNotes: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ClaimSchema.index({ item: 1, claimant: 1 });
ClaimSchema.index({ claimant: 1, createdAt: -1 });

module.exports = mongoose.model('Claim', ClaimSchema);

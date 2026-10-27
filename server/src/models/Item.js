const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an item title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide an item description'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    reportType: {
      type: String,
      required: [true, 'Specify whether this item is lost or found'],
      enum: ['lost', 'found'],
    },
    category: {
      type: String,
      required: [true, 'Please choose a category'],
      enum: [
        'Electronics',
        'ID Cards',
        'Books',
        'Clothing',
        'Accessories',
        'Keys & Wallets',
        'Bottles & Bags',
        'Other',
      ],
      default: 'Other',
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
      },
    ],
    location: {
      building: {
        type: String,
        required: [true, 'Building or campus landmark is required'],
        trim: true,
      },
      room: {
        type: String,
        trim: true,
        default: '',
      },
      campusZone: {
        type: String,
        enum: ['North Campus', 'South Campus', 'Central Hub', 'Sports Complex', 'Hostels', 'Library Zone', 'Other'],
        default: 'Central Hub',
      },
    },
    dateLostFound: {
      type: Date,
      required: [true, 'Please provide the approximate date lost or found'],
      default: Date.now,
    },
    timeLostFound: {
      type: String,
      default: '',
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '',
    },
    contactPreference: {
      type: String,
      enum: ['in_app', 'email', 'phone'],
      default: 'in_app',
    },
    status: {
      type: String,
      enum: ['lost', 'found', 'pending_claim', 'resolved', 'archived'],
      default: function () {
        return this.reportType === 'lost' ? 'lost' : 'found';
      },
    },
    // Secret identifying marks hidden from public view (used to verify claim proof without fraud)
    privateIdentifyingInfo: {
      type: String,
      maxlength: [1000, 'Secret details cannot exceed 1000 characters'],
      default: '',
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagCount: {
      type: Number,
      default: 0,
    },
    flagReasons: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    publicVisibility: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for fast searching, filtering, and sorting
ItemSchema.index({
  title: 'text',
  description: 'text',
  'location.building': 'text',
  'location.room': 'text',
});

ItemSchema.index({ reportType: 1, status: 1, category: 1, createdAt: -1 });
ItemSchema.index({ reporter: 1, createdAt: -1 });

module.exports = mongoose.model('Item', ItemSchema);

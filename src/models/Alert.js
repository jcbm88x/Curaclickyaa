const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    minDiscount: {
      type: Number,
      default: 10,
      min: 1,
      max: 95,
    },
    channels: {
      type: [String],
      enum: ['inapp', 'email'],
      default: ['inapp'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastNotifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

alertSchema.index({ user: 1, createdAt: -1 });
alertSchema.index({ product: 1, isActive: 1 });
alertSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('Alert', alertSchema);

const mongoose = require('mongoose');

const priceSnapshotSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    promotion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promotion',
      default: null,
    },
    finalPriceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    source: {
      type: String,
      enum: ['promotion', 'manual', 'seed'],
      default: 'promotion',
    },
    capturedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false },
);

priceSnapshotSchema.index({ product: 1, capturedAt: -1 });

module.exports = mongoose.model('PriceSnapshot', priceSnapshotSchema);

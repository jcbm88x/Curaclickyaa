const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'El producto es obligatorio'],
      index: true,
    },
    type: {
      type: String,
      enum: ['percent', 'fixed', 'final'],
      required: true,
    },
    // percent: valor 0-100. fixed: descuento en centavos. final: precio final en centavos.
    value: {
      type: Number,
      required: [true, 'El valor de la promocion es obligatorio'],
      min: 0,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 120,
      default: 'Oferta extraordinaria',
    },
    startAt: {
      type: Date,
      required: true,
      index: true,
    },
    endAt: {
      type: Date,
      required: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'expired', 'paused'],
      default: 'scheduled',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

promotionSchema.index({ product: 1, isActive: 1, startAt: 1, endAt: 1 });
promotionSchema.index({ status: 1, endAt: 1 });

promotionSchema.pre('validate', function validateDates() {
  if (this.startAt && this.endAt && new Date(this.endAt) <= new Date(this.startAt)) {
    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
  }
});

module.exports = mongoose.model('Promotion', promotionSchema);

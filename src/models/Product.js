const mongoose = require('mongoose');

const specSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del producto es obligatorio'],
      trim: true,
      maxlength: 160,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    brand: {
      type: String,
      required: [true, 'La marca es obligatoria'],
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'La categoria es obligatoria'],
      index: true,
    },
    basePriceCents: {
      type: Number,
      required: [true, 'El precio base es obligatorio'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'COP',
      uppercase: true,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (value) => value.length <= 6,
        message: 'Maximo 6 imagenes por producto',
      },
    },
    qualityTier: {
      type: String,
      enum: ['select', 'premium', 'exclusive'],
      default: 'premium',
    },
    specs: {
      type: [specSchema],
      default: [],
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 4.8,
    },
    reviewCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

productSchema.index({ name: 'text', brand: 'text', description: 'text' });
productSchema.index({ category: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);

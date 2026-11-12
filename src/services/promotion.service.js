const Alert = require('../models/Alert');
const Favorite = require('../models/Favorite');
const PriceSnapshot = require('../models/PriceSnapshot');
const Product = require('../models/Product');
const Promotion = require('../models/Promotion');
const notificationService = require('./notification.service');
const { emitCatalog, emitProduct } = require('../sockets');
const { calculatePricing, pickBestPromotion } = require('../utils/pricing');
const ApiError = require('../utils/ApiError');

function resolveStatus(promotion, now = new Date()) {
  if (!promotion.isActive) return 'paused';
  if (now < new Date(promotion.startAt)) return 'scheduled';
  if (now >= new Date(promotion.endAt)) return 'expired';
  return 'active';
}

function serializePromotion(promotion, product = null) {
  const item = promotion.toObject ? promotion.toObject() : promotion;
  return {
    id: item._id.toString(),
    type: item.type,
    value: item.value,
    label: item.label,
    startAt: item.startAt,
    endAt: item.endAt,
    priority: item.priority,
    isActive: item.isActive,
    status: resolveStatus(item),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    product: product
      ? {
          id: product._id.toString(),
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          images: product.images,
          basePriceCents: product.basePriceCents,
          isActive: product.isActive,
          category: product.category
            ? {
                id: product.category._id?.toString() || product.category.toString(),
                name: product.category.name,
                slug: product.category.slug,
              }
            : null,
        }
      : item.product
        ? item.product.toString()
        : null,
  };
}

function decorateProduct(product, promotions = [], options = {}) {
  const raw = product.toObject ? product.toObject() : product;
  const now = options.now || new Date();
  const best = pickBestPromotion(raw.basePriceCents, promotions, now);
  const pricing = best
    ? best.pricing
    : calculatePricing(raw.basePriceCents, null);

  const category =
    raw.category && typeof raw.category === 'object' && raw.category.name
      ? {
          id: raw.category._id.toString(),
          name: raw.category.name,
          slug: raw.category.slug,
          icon: raw.category.icon || 'Sparkles',
        }
      : null;

  return {
    id: raw._id.toString(),
    name: raw.name,
    slug: raw.slug,
    brand: raw.brand,
    description: raw.description,
    category,
    basePriceCents: pricing.basePriceCents,
    finalPriceCents: pricing.finalPriceCents,
    discountCents: pricing.discountCents,
    discountPercent: pricing.discountPercent,
    currency: raw.currency,
    images: raw.images || [],
    qualityTier: raw.qualityTier,
    specs: raw.specs || [],
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    isActive: raw.isActive,
    isFavorite: Boolean(options.favoriteIds?.has(raw._id.toString())),
    hasActivePromotion: pricing.discountPercent > 0,
    promotion: pricing.promotion,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

async function getActivePromotionsMap(productIds, now = new Date()) {
  if (!productIds.length) return new Map();

  const promotions = await Promotion.find({
    product: { $in: productIds },
    isActive: true,
    startAt: { $lte: now },
    endAt: { $gt: now },
  }).lean();

  const map = new Map();
  promotions.forEach((promotion) => {
    const key = promotion.product.toString();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(promotion);
  });

  return map;
}

async function recordSnapshot(product, promotion, pricing, source = 'promotion') {
  if (!product || !pricing) return;

  await PriceSnapshot.create({
    product: product._id,
    promotion: promotion?._id || null,
    finalPriceCents: pricing.finalPriceCents,
    discountPercent: pricing.discountPercent,
    source,
    capturedAt: new Date(),
  });
}

async function notifyInterestedUsers(product) {
  const productId = product.id;
  const categoryId = product.category?.id;
  const [favorites, alerts] = await Promise.all([
    Favorite.find({ product: productId }).select('user').lean(),
    Alert.find({
      isActive: true,
      minDiscount: { $lte: product.discountPercent },
      $or: [
        { product: productId },
        ...(categoryId ? [{ category: categoryId }] : []),
      ],
    })
      .select('user minDiscount')
      .lean(),
  ]);

  const userIds = new Set(favorites.map((favorite) => favorite.user.toString()));
  alerts.forEach((alert) => userIds.add(alert.user.toString()));

  if (!userIds.size) return;

  const discountLabel =
    product.discountPercent > 0
      ? `${product.discountPercent}% de descuento`
      : 'Nuevo precio especial';

  await notificationService.createForUsers(Array.from(userIds), {
    type: 'alert_match',
    title: `${product.name} tiene una oferta extraordinaria`,
    message: `${discountLabel} en ${product.brand}. Precio final ${new Intl.NumberFormat(
      'es-CO',
      { style: 'currency', currency: product.currency || 'COP', maximumFractionDigits: 0 },
    ).format(product.finalPriceCents / 100)}.`,
    product: product.id,
    promotion: product.promotion?.id || null,
    meta: {
      productSlug: product.slug,
      discountPercent: product.discountPercent,
      finalPriceCents: product.finalPriceCents,
    },
  });

  if (alerts.length) {
    await Alert.updateMany(
      { _id: { $in: alerts.map((alert) => alert._id) } },
      { lastNotifiedAt: new Date() },
    );
  }
}

async function broadcastPromotionChange(action, productId, { notify = false } = {}) {
  const product = await Product.findById(productId).populate('category').lean();
  if (!product) return null;

  const now = new Date();
  const promotions = await Promotion.find({
    product: productId,
    isActive: true,
    startAt: { $lte: now },
    endAt: { $gt: now },
  }).lean();

  const decorated = decorateProduct(product, promotions, { now });
  const payload = { action, productId: productId.toString(), product: decorated };

  emitCatalog('promotion:changed', payload);
  emitProduct(productId.toString(), 'promotion:changed', payload);

  if (notify && decorated.discountPercent > 0) {
    await notifyInterestedUsers(decorated);
  }

  return decorated;
}

async function createPromotion(data, userId) {
  const product = await Product.findById(data.product);
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const promotion = new Promotion({
    ...data,
    createdBy: userId || null,
  });
  promotion.status = resolveStatus(promotion);
  await promotion.save();

  const pricing = calculatePricing(product.basePriceCents, promotion);
  if (promotion.status === 'active') {
    await recordSnapshot(product, promotion, pricing);
  }

  await broadcastPromotionChange('created', product._id, {
    notify: promotion.status === 'active',
  });

  return serializePromotion(promotion, product);
}

async function updatePromotion(id, data) {
  const promotion = await Promotion.findById(id);
  if (!promotion) throw ApiError.notFound('Promocion no encontrada');

  const editableFields = [
    'product',
    'type',
    'value',
    'label',
    'startAt',
    'endAt',
    'priority',
    'isActive',
  ];

  editableFields.forEach((field) => {
    if (data[field] !== undefined) promotion[field] = data[field];
  });

  promotion.status = resolveStatus(promotion);
  await promotion.save();

  const product = await Product.findById(promotion.product);
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const pricing = calculatePricing(product.basePriceCents, promotion);
  if (promotion.status === 'active') {
    await recordSnapshot(product, promotion, pricing);
  }

  await broadcastPromotionChange('updated', product._id, {
    notify: promotion.status === 'active',
  });

  return serializePromotion(promotion, product);
}

async function deletePromotion(id) {
  const promotion = await Promotion.findById(id);
  if (!promotion) throw ApiError.notFound('Promocion no encontrada');

  const product = await Product.findById(promotion.product);
  await promotion.deleteOne();

  if (product) {
    await recordSnapshot(
      product,
      null,
      calculatePricing(product.basePriceCents, null),
      'manual',
    );
    await broadcastPromotionChange('expired', product._id, { notify: false });
  }

  return { id };
}

async function listActivePromotions({ limit = 12 } = {}) {
  const now = new Date();
  const promotions = await Promotion.find({
    isActive: true,
    startAt: { $lte: now },
    endAt: { $gt: now },
  })
    .populate({ path: 'product', populate: { path: 'category' } })
    .sort({ endAt: 1 })
    .limit(Math.min(limit, 50))
    .lean();

  const items = promotions
    .filter((promotion) => promotion.product && promotion.product.isActive)
    .map((promotion) => ({
      promotion: serializePromotion(promotion, promotion.product),
      product: decorateProduct(promotion.product, [promotion], { now }),
    }))
    .sort((a, b) => b.product.discountPercent - a.product.discountPercent);

  return { items, total: items.length };
}

async function reconcilePromotionStatuses() {
  const now = new Date();
  const lookBehind = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lookAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const promotions = await Promotion.find({
    isActive: true,
    endAt: { $gt: lookBehind },
    startAt: { $lt: lookAhead },
  });

  let changed = 0;

  for (const promotion of promotions) {
    const nextStatus = resolveStatus(promotion, now);
    if (nextStatus === promotion.status) continue;

    promotion.status = nextStatus;
    await promotion.save();
    changed += 1;

    if (nextStatus === 'active') {
      const product = await Product.findById(promotion.product);
      if (product) {
        const pricing = calculatePricing(product.basePriceCents, promotion);
        await recordSnapshot(product, promotion, pricing);
        await broadcastPromotionChange('activated', product._id, { notify: true });
      }
    } else if (nextStatus === 'expired') {
      const product = await Product.findById(promotion.product);
      if (product) {
        await recordSnapshot(
          product,
          null,
          calculatePricing(product.basePriceCents, null),
          'manual',
        );
        await broadcastPromotionChange('expired', product._id, { notify: false });
      }
    }
  }

  return changed;
}

module.exports = {
  broadcastPromotionChange,
  createPromotion,
  decorateProduct,
  deletePromotion,
  getActivePromotionsMap,
  listActivePromotions,
  notifyInterestedUsers,
  reconcilePromotionStatuses,
  recordSnapshot,
  resolveStatus,
  serializePromotion,
  updatePromotion,
};

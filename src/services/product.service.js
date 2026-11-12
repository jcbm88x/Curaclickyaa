const mongoose = require('mongoose');
const Category = require('../models/Category');
const Favorite = require('../models/Favorite');
const PriceSnapshot = require('../models/PriceSnapshot');
const Product = require('../models/Product');
const promotionService = require('./promotion.service');
const { calculatePricing } = require('../utils/pricing');
const { emitCatalog } = require('../sockets');
const { escapeRegex, slugify } = require('../utils/strings');
const ApiError = require('../utils/ApiError');

async function resolveCategory(categoryInput) {
  if (!categoryInput) return null;

  if (mongoose.Types.ObjectId.isValid(categoryInput)) {
    return Category.findById(categoryInput);
  }

  return Category.findOne({ slug: categoryInput.toString().toLowerCase().trim() });
}

async function buildUniqueSlug(base, excludeId = null) {
  const root = slugify(base) || `producto-${Date.now()}`;
  let candidate = root;
  let counter = 2;

  const filter = (value) => {
    const query = { slug: value };
    if (excludeId) query._id = { $ne: excludeId };
    return Product.exists(query);
  };

  while (await filter(candidate)) {
    candidate = `${root}-${counter}`;
    counter += 1;
  }

  return candidate;
}

async function favoriteIdsFor(userId, productIds) {
  if (!userId || !productIds.length) return new Set();

  const favorites = await Favorite.find({
    user: userId,
    product: { $in: productIds },
  })
    .select('product')
    .lean();

  return new Set(favorites.map((favorite) => favorite.product.toString()));
}

async function listProducts(params = {}, currentUserId = null) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(params.limit) || 12));
  const sort = params.sort || 'relevance';
  const minDiscount = Math.max(0, Number(params.minDiscount) || 0);

  const filter = {};
  if (!params.includeInactive) filter.isActive = true;

  if (params.category) {
    const category = await resolveCategory(params.category);
    if (!category) {
      return { items: [], total: 0, page, limit, pages: 0 };
    }
    filter.category = category._id;
  }

  if (params.search) {
    const regex = new RegExp(escapeRegex(params.search.trim()), 'i');
    filter.$or = [{ name: regex }, { brand: regex }, { description: regex }];
  }

  const products = await Product.find(filter)
    .populate('category')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const productIds = products.map((product) => product._id);
  const [promotionsMap, favorites] = await Promise.all([
    promotionService.getActivePromotionsMap(productIds),
    favoriteIdsFor(currentUserId, productIds),
  ]);

  let items = products.map((product) =>
    promotionService.decorateProduct(
      product,
      promotionsMap.get(product._id.toString()) || [],
      { favoriteIds: favorites },
    ),
  );

  if (minDiscount > 0) {
    items = items.filter((product) => product.discountPercent >= minDiscount);
  }

  const sorters = {
    price_asc: (a, b) => a.finalPriceCents - b.finalPriceCents,
    price_desc: (a, b) => b.finalPriceCents - a.finalPriceCents,
    discount_desc: (a, b) => b.discountPercent - a.discountPercent,
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    name: (a, b) => a.name.localeCompare(b.name, 'es'),
    relevance: (a, b) =>
      Number(b.hasActivePromotion) - Number(a.hasActivePromotion) ||
      b.discountPercent - a.discountPercent ||
      new Date(b.createdAt) - new Date(a.createdAt),
  };

  items.sort(sorters[sort] || sorters.relevance);

  const total = items.length;
  const pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    total,
    page,
    limit,
    pages,
  };
}

async function getProductBySlug(slug, currentUserId = null) {
  const product = await Product.findOne({ slug, isActive: true })
    .populate('category')
    .lean();

  if (!product) throw ApiError.notFound('Producto no encontrado');

  const [promotionsMap, favorites] = await Promise.all([
    promotionService.getActivePromotionsMap([product._id]),
    favoriteIdsFor(currentUserId, [product._id]),
  ]);

  const decorated = promotionService.decorateProduct(
    product,
    promotionsMap.get(product._id.toString()) || [],
    { favoriteIds: favorites },
  );

  const relatedRaw = await Product.find({
    _id: { $ne: product._id },
    category: product.category?._id,
    isActive: true,
  })
    .populate('category')
    .limit(4)
    .lean();

  const relatedPromotions = await promotionService.getActivePromotionsMap(
    relatedRaw.map((item) => item._id),
  );

  const related = relatedRaw.map((item) =>
    promotionService.decorateProduct(
      item,
      relatedPromotions.get(item._id.toString()) || [],
    ),
  );

  return { product: decorated, related };
}

async function getPriceHistory(slug) {
  const product = await Product.findOne({ slug, isActive: true }).lean();
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const snapshots = await PriceSnapshot.find({ product: product._id })
    .sort({ capturedAt: -1 })
    .limit(180)
    .lean();

  const points = snapshots
    .reverse()
    .map((snapshot) => ({
      at: snapshot.capturedAt,
      finalPriceCents: snapshot.finalPriceCents,
      discountPercent: snapshot.discountPercent,
    }));

  const promotionsMap = await promotionService.getActivePromotionsMap([
    product._id,
  ]);
  const current = promotionService.decorateProduct(
    product,
    promotionsMap.get(product._id.toString()) || [],
  );

  const lastPoint = points[points.length - 1];
  if (!lastPoint || lastPoint.finalPriceCents !== current.finalPriceCents) {
    points.push({
      at: new Date(),
      finalPriceCents: current.finalPriceCents,
      discountPercent: current.discountPercent,
    });
  }

  return {
    productId: product._id.toString(),
    slug: product.slug,
    name: product.name,
    currency: product.currency,
    basePriceCents: product.basePriceCents,
    currentPriceCents: current.finalPriceCents,
    points,
  };
}

async function createProduct(data) {
  const category = await resolveCategory(data.category);
  if (!category) throw ApiError.badRequest('La categoria no existe');

  const product = await Product.create({
    ...data,
    category: category._id,
    slug: await buildUniqueSlug(data.slug || data.name),
  });

  await promotionService.recordSnapshot(
    product,
    null,
    calculatePricing(product.basePriceCents, null),
    'manual',
  );

  await product.populate('category');
  const decorated = promotionService.decorateProduct(product, []);
  emitCatalog('product:created', { product: decorated });

  return decorated;
}

async function updateProduct(id, data) {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Producto no encontrado');

  const editableFields = [
    'name',
    'brand',
    'description',
    'basePriceCents',
    'currency',
    'images',
    'qualityTier',
    'specs',
    'rating',
    'reviewCount',
    'isActive',
    'slug',
  ];

  editableFields.forEach((field) => {
    if (data[field] !== undefined) product[field] = data[field];
  });

  if (data.category) {
    const category = await resolveCategory(data.category);
    if (!category) throw ApiError.badRequest('La categoria no existe');
    product.category = category._id;
  }

  if (data.slug && data.slug !== product.slug) {
    product.slug = await buildUniqueSlug(data.slug, product._id);
  }

  await product.save();
  await product.populate('category');

  await promotionService.broadcastPromotionChange('product_updated', product._id, {
    notify: false,
  });

  return promotionService.decorateProduct(product, []);
}

async function archiveProduct(id) {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Producto no encontrado');

  product.isActive = false;
  await product.save();

  await require('../models/Promotion').updateMany(
    { product: product._id, isActive: true },
    { $set: { isActive: false, status: 'paused' } },
  );

  await promotionService.broadcastPromotionChange('archived', product._id, {
    notify: false,
  });

  return { id: product._id.toString() };
}

module.exports = {
  archiveProduct,
  createProduct,
  getPriceHistory,
  getProductBySlug,
  listProducts,
  resolveCategory,
  updateProduct,
};

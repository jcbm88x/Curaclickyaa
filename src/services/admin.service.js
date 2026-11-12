const Alert = require('../models/Alert');
const Category = require('../models/Category');
const Favorite = require('../models/Favorite');
const Notification = require('../models/Notification');
const Product = require('../models/Product');
const Promotion = require('../models/Promotion');
const User = require('../models/User');
const productService = require('./product.service');
const promotionService = require('./promotion.service');
const { calculatePricing } = require('../utils/pricing');
const { slugify } = require('../utils/strings');
const ApiError = require('../utils/ApiError');

async function getStats() {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalProducts,
    activeProducts,
    totalUsers,
    totalFavorites,
    totalAlerts,
    notifications24h,
  ] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ isActive: true }),
    User.countDocuments(),
    Favorite.countDocuments(),
    Alert.countDocuments({ isActive: true }),
    Notification.countDocuments({ createdAt: { $gte: since } }),
  ]);

  const activePromotions = await Promotion.find({
    isActive: true,
    startAt: { $lte: now },
    endAt: { $gt: now },
  })
    .populate('product', 'name slug basePriceCents images')
    .sort({ endAt: 1 })
    .lean();

  const discounts = activePromotions
    .filter((promotion) => promotion.product)
    .map((promotion) =>
      calculatePricing(promotion.product.basePriceCents, promotion),
    )
    .map((pricing) => pricing.discountPercent)
    .filter((discount) => discount > 0);

  const averageDiscount = discounts.length
    ? Math.round(discounts.reduce((sum, value) => sum + value, 0) / discounts.length)
    : 0;

  const recentPromotions = await Promotion.find()
    .populate('product', 'name slug basePriceCents images brand')
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();

  return {
    totals: {
      products: totalProducts,
      activeProducts,
      users: totalUsers,
      activePromotions: activePromotions.length,
      favorites: totalFavorites,
      alerts: totalAlerts,
      notifications24h,
      averageDiscount,
    },
    activePromotions: activePromotions.slice(0, 6).map((promotion) => ({
      promotion: promotionService.serializePromotion(
        promotion,
        promotion.product,
      ),
      pricing: promotion.product
        ? calculatePricing(promotion.product.basePriceCents, promotion)
        : null,
    })),
    recentPromotions: recentPromotions.map((promotion) =>
      promotionService.serializePromotion(promotion, promotion.product),
    ),
  };
}

async function listAdminProducts(params = {}) {
  return productService.listProducts(
    {
      ...params,
      includeInactive: true,
      minDiscount: 0,
      limit: Math.min(60, Number(params.limit) || 30),
    },
    null,
  );
}

async function listAdminPromotions(params = {}) {
  const filter = {};
  if (params.status) filter.status = params.status;
  if (params.product) filter.product = params.product;

  const promotions = await Promotion.find(filter)
    .populate({ path: 'product', populate: { path: 'category' } })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return {
    items: promotions.map((promotion) =>
      promotionService.serializePromotion(promotion, promotion.product),
    ),
    total: promotions.length,
  };
}

async function listUsers() {
  const users = await User.find()
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  return {
    items: users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt || null,
    })),
  };
}

async function listCategories() {
  const categories = await Category.find().sort({ name: 1 }).lean();
  const counts = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(
    counts.map((entry) => [entry._id.toString(), entry.count]),
  );

  return {
    items: categories.map((category) => ({
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      isActive: category.isActive,
      productCount: countMap.get(category._id.toString()) || 0,
    })),
  };
}

async function createCategory(data) {
  const slug = slugify(data.slug || data.name);
  if (!slug) throw ApiError.badRequest('Nombre de categoria invalido');

  const exists = await Category.exists({ slug });
  if (exists) throw ApiError.conflict('Ya existe una categoria con ese slug');

  const category = await Category.create({
    name: data.name,
    slug,
    description: data.description || '',
    icon: data.icon || 'Sparkles',
    isActive: data.isActive !== false,
  });

  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    isActive: category.isActive,
    productCount: 0,
  };
}

async function updateCategory(id, data) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('Categoria no encontrada');

  if (data.name !== undefined) category.name = data.name;
  if (data.description !== undefined) category.description = data.description;
  if (data.icon !== undefined) category.icon = data.icon;
  if (data.isActive !== undefined) category.isActive = data.isActive;

  if (data.slug && data.slug !== category.slug) {
    const slug = slugify(data.slug);
    const exists = await Category.exists({ slug, _id: { $ne: category._id } });
    if (exists) throw ApiError.conflict('Ya existe una categoria con ese slug');
    category.slug = slug;
  }

  await category.save();

  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    isActive: category.isActive,
  };
}

async function deleteCategory(id) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('Categoria no encontrada');

  const products = await Product.countDocuments({ category: category._id });
  if (products > 0) {
    throw ApiError.conflict(
      'No se puede eliminar una categoria con productos asociados',
    );
  }

  await Alert.deleteMany({ category: category._id });
  await category.deleteOne();

  return { id };
}

module.exports = {
  createCategory,
  deleteCategory,
  getStats,
  listAdminProducts,
  listAdminPromotions,
  listCategories,
  listUsers,
  updateCategory,
};

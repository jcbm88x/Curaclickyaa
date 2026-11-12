const Category = require('../models/Category');
const productService = require('../services/product.service');
const promotionService = require('../services/promotion.service');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(
    req.validatedQuery,
    req.user?._id || null,
  );
  res.json(result);
});

const detail = asyncHandler(async (req, res) => {
  const result = await productService.getProductBySlug(
    req.params.slug,
    req.user?._id || null,
  );
  res.json(result);
});

const priceHistory = asyncHandler(async (req, res) => {
  const result = await productService.getPriceHistory(req.params.slug);
  res.json(result);
});

const categories = asyncHandler(async (_req, res) => {
  const items = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
  res.json({
    items: items.map((category) => ({
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
    })),
  });
});

const activePromotions = asyncHandler(async (req, res) => {
  const result = await promotionService.listActivePromotions({
    limit: Number(req.query.limit) || 12,
  });
  res.json(result);
});

module.exports = { activePromotions, categories, detail, list, priceHistory };

const adminService = require('../services/admin.service');
const productService = require('../services/product.service');
const promotionService = require('../services/promotion.service');
const asyncHandler = require('../utils/asyncHandler');

const stats = asyncHandler(async (_req, res) => {
  res.json(await adminService.getStats());
});

const userList = asyncHandler(async (_req, res) => {
  res.json(await adminService.listUsers());
});

const productList = asyncHandler(async (req, res) => {
  res.json(await adminService.listAdminProducts(req.validatedQuery));
});

const productCreate = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ product });
});

const productUpdate = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json({ product });
});

const productRemove = asyncHandler(async (req, res) => {
  res.json(await productService.archiveProduct(req.params.id));
});

const promotionList = asyncHandler(async (req, res) => {
  res.json(await adminService.listAdminPromotions(req.validatedQuery));
});

const promotionCreate = asyncHandler(async (req, res) => {
  const promotion = await promotionService.createPromotion(
    req.body,
    req.user._id,
  );
  res.status(201).json({ promotion });
});

const promotionUpdate = asyncHandler(async (req, res) => {
  const promotion = await promotionService.updatePromotion(
    req.params.id,
    req.body,
  );
  res.json({ promotion });
});

const promotionRemove = asyncHandler(async (req, res) => {
  res.json(await promotionService.deletePromotion(req.params.id));
});

const categoryList = asyncHandler(async (_req, res) => {
  res.json(await adminService.listCategories());
});

const categoryCreate = asyncHandler(async (req, res) => {
  const category = await adminService.createCategory(req.body);
  res.status(201).json({ category });
});

const categoryUpdate = asyncHandler(async (req, res) => {
  const category = await adminService.updateCategory(req.params.id, req.body);
  res.json({ category });
});

const categoryRemove = asyncHandler(async (req, res) => {
  res.json(await adminService.deleteCategory(req.params.id));
});

module.exports = {
  categoryCreate,
  categoryList,
  categoryRemove,
  categoryUpdate,
  productCreate,
  productList,
  productRemove,
  productUpdate,
  promotionCreate,
  promotionList,
  promotionRemove,
  promotionUpdate,
  stats,
  userList,
};

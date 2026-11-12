const Favorite = require('../models/Favorite');
const Product = require('../models/Product');
const promotionService = require('./promotion.service');
const ApiError = require('../utils/ApiError');

async function listFavorites(userId) {
  const favorites = await Favorite.find({ user: userId })
    .populate({ path: 'product', populate: { path: 'category' } })
    .sort({ createdAt: -1 })
    .lean();

  const products = favorites
    .map((favorite) => favorite.product)
    .filter((product) => product && product.isActive);

  const promotionsMap = await promotionService.getActivePromotionsMap(
    products.map((product) => product._id),
  );
  const favoriteIds = new Set(products.map((product) => product._id.toString()));

  return {
    items: products.map((product) =>
      promotionService.decorateProduct(
        product,
        promotionsMap.get(product._id.toString()) || [],
        { favoriteIds },
      ),
    ),
  };
}

async function addFavorite(userId, productId) {
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw ApiError.notFound('Producto no encontrado');

  await Favorite.updateOne(
    { user: userId, product: product._id },
    { $setOnInsert: { user: userId, product: product._id } },
    { upsert: true },
  );

  return { isFavorite: true, productId: product._id.toString() };
}

async function removeFavorite(userId, productId) {
  await Favorite.deleteOne({ user: userId, product: productId });
  return { isFavorite: false, productId };
}

module.exports = { addFavorite, listFavorites, removeFavorite };

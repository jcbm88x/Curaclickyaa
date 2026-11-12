const favoriteService = require('../services/favorite.service');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const result = await favoriteService.listFavorites(req.user._id);
  res.json(result);
});

const add = asyncHandler(async (req, res) => {
  const result = await favoriteService.addFavorite(
    req.user._id,
    req.params.productId,
  );
  res.status(201).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await favoriteService.removeFavorite(
    req.user._id,
    req.params.productId,
  );
  res.json(result);
});

module.exports = { add, list, remove };

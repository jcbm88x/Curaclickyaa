const express = require('express');
const controller = require('../controllers/product.controller');
const { optionalAuth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  priceHistoryQuerySchema,
  productQuerySchema,
  slugParamSchema,
} = require('../validators/product.validator');

const router = express.Router();

router.get(
  '/',
  optionalAuth,
  validate(productQuerySchema, 'query'),
  controller.list,
);

router.get(
  '/:slug/price-history',
  validate(priceHistoryQuerySchema, 'params'),
  controller.priceHistory,
);

router.get(
  '/:slug',
  optionalAuth,
  validate(slugParamSchema, 'params'),
  controller.detail,
);

module.exports = router;

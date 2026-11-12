const express = require('express');
const controller = require('../controllers/product.controller');

const router = express.Router();

router.get('/categories', controller.categories);
router.get('/promotions/active', controller.activePromotions);

module.exports = router;

const express = require('express');
const controller = require('../controllers/favorite.controller');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { productIdParamSchema } = require('../validators/product.validator');

const router = express.Router();

router.use(authenticate);
router.get('/', controller.list);
router.post('/:productId', validate(productIdParamSchema, 'params'), controller.add);
router.delete(
  '/:productId',
  validate(productIdParamSchema, 'params'),
  controller.remove,
);

module.exports = router;

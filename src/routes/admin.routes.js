const express = require('express');
const controller = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  adminProductQuerySchema,
  adminPromotionQuerySchema,
  categorySchema,
  createProductSchema,
  createPromotionSchema,
  idParamSchema,
  updateCategorySchema,
  updateProductSchema,
  updatePromotionSchema,
} = require('../validators/admin.validator');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/stats', controller.stats);
router.get('/users', controller.userList);

router.get(
  '/products',
  validate(adminProductQuerySchema, 'query'),
  controller.productList,
);
router.post('/products', validate(createProductSchema), controller.productCreate);
router.put(
  '/products/:id',
  validate(idParamSchema, 'params'),
  validate(updateProductSchema),
  controller.productUpdate,
);
router.delete(
  '/products/:id',
  validate(idParamSchema, 'params'),
  controller.productRemove,
);

router.get(
  '/promotions',
  validate(adminPromotionQuerySchema, 'query'),
  controller.promotionList,
);
router.post(
  '/promotions',
  validate(createPromotionSchema),
  controller.promotionCreate,
);
router.put(
  '/promotions/:id',
  validate(idParamSchema, 'params'),
  validate(updatePromotionSchema),
  controller.promotionUpdate,
);
router.delete(
  '/promotions/:id',
  validate(idParamSchema, 'params'),
  controller.promotionRemove,
);

router.get('/categories', controller.categoryList);
router.post('/categories', validate(categorySchema), controller.categoryCreate);
router.put(
  '/categories/:id',
  validate(idParamSchema, 'params'),
  validate(updateCategorySchema),
  controller.categoryUpdate,
);
router.delete(
  '/categories/:id',
  validate(idParamSchema, 'params'),
  controller.categoryRemove,
);

module.exports = router;

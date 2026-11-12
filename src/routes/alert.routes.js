const express = require('express');
const controller = require('../controllers/alert.controller');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  alertIdParamSchema,
  createAlertSchema,
  updateAlertSchema,
} = require('../validators/alert.validator');

const router = express.Router();

router.use(authenticate);
router.get('/', controller.list);
router.post('/', validate(createAlertSchema), controller.create);
router.patch(
  '/:alertId',
  validate(alertIdParamSchema, 'params'),
  validate(updateAlertSchema),
  controller.update,
);
router.delete('/:alertId', validate(alertIdParamSchema, 'params'), controller.remove);

module.exports = router;

const express = require('express');
const controller = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  notificationIdParamSchema,
} = require('../validators/alert.validator');

const router = express.Router();

router.use(authenticate);
router.get('/', controller.list);
router.get('/unread-count', controller.unread);
router.patch('/read-all', controller.markAllRead);
router.patch(
  '/:notificationId/read',
  validate(notificationIdParamSchema, 'params'),
  controller.markRead,
);

module.exports = router;

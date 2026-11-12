const { z } = require('zod');
const { objectId } = require('./product.validator');

const createAlertSchema = z.object({
  productId: objectId.optional().nullable(),
  categoryId: objectId.optional().nullable(),
  minDiscount: z.coerce.number().int().min(1).max(95).default(10),
  channels: z.array(z.enum(['inapp', 'email'])).max(2).optional(),
});

const updateAlertSchema = z
  .object({
    minDiscount: z.coerce.number().int().min(1).max(95).optional(),
    isActive: z.boolean().optional(),
    channels: z.array(z.enum(['inapp', 'email'])).max(2).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No hay cambios para aplicar',
  });

const alertIdParamSchema = z.object({ alertId: objectId });
const notificationIdParamSchema = z.object({ notificationId: objectId });

module.exports = {
  alertIdParamSchema,
  createAlertSchema,
  notificationIdParamSchema,
  updateAlertSchema,
};

const { z } = require('zod');
const { objectId } = require('./product.validator');

const productBaseSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(1).max(120).optional(),
  brand: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).optional().default(''),
  category: z.string().trim().min(1).max(120),
  basePriceCents: z.coerce.number().int().min(0),
  currency: z.string().trim().length(3).optional().default('COP'),
  images: z.array(z.string().trim().min(1).max(500)).max(6).optional().default([]),
  qualityTier: z.enum(['select', 'premium', 'exclusive']).optional().default('premium'),
  specs: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(160),
      }),
    )
    .max(20)
    .optional()
    .default([]),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewCount: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const createProductSchema = productBaseSchema;
const updateProductSchema = productBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No hay cambios para aplicar',
  });

const promotionBaseSchema = z.object({
  product: objectId,
  type: z.enum(['percent', 'fixed', 'final']),
  value: z.coerce.number().min(0),
  label: z.string().trim().max(120).optional().default('Oferta extraordinaria'),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  priority: z.coerce.number().int().min(-100).max(100).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const createPromotionSchema = promotionBaseSchema
  .refine((value) => value.endAt > value.startAt, {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endAt'],
  })
  .refine((value) => value.type !== 'percent' || value.value <= 100, {
    message: 'El porcentaje no puede superar 100',
    path: ['value'],
  })
  .refine((value) => value.type === 'percent' || value.value > 0, {
    message: 'El valor del descuento debe ser mayor a 0',
    path: ['value'],
  });

const updatePromotionSchema = promotionBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No hay cambios para aplicar',
  })
  .refine(
    (value) =>
      !value.startAt || !value.endAt || value.endAt > value.startAt,
    {
      message: 'La fecha de fin debe ser posterior a la fecha de inicio',
      path: ['endAt'],
    },
  );

const adminProductQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  sort: z
    .enum(['relevance', 'price_asc', 'price_desc', 'discount_desc', 'newest', 'name'])
    .default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(30),
});

const adminPromotionQuerySchema = z.object({
  status: z.enum(['scheduled', 'active', 'expired', 'paused']).optional(),
  product: objectId.optional(),
});

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(240).optional().default(''),
  icon: z.string().trim().max(40).optional().default('Sparkles'),
  isActive: z.boolean().optional().default(true),
});

const updateCategorySchema = categorySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No hay cambios para aplicar',
  });

const idParamSchema = z.object({ id: objectId });

module.exports = {
  adminProductQuerySchema,
  adminPromotionQuerySchema,
  categorySchema,
  createProductSchema,
  createPromotionSchema,
  idParamSchema,
  updateCategorySchema,
  updateProductSchema,
  updatePromotionSchema,
};

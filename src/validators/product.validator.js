const { z } = require('zod');

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Identificador invalido');

const productQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  minDiscount: z.coerce.number().min(0).max(95).default(0),
  sort: z
    .enum(['relevance', 'price_asc', 'price_desc', 'discount_desc', 'newest', 'name'])
    .default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const slugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug invalido'),
});

const priceHistoryQuerySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug invalido'),
});

const productIdParamSchema = z.object({ productId: objectId });

module.exports = {
  objectId,
  priceHistoryQuerySchema,
  productIdParamSchema,
  productQuerySchema,
  slugParamSchema,
};

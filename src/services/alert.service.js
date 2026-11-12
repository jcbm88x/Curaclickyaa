const Alert = require('../models/Alert');
const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');

function serializeAlert(alert) {
  const item = alert.toObject ? alert.toObject() : alert;
  return {
    id: item._id.toString(),
    product: item.product
      ? {
          id: item.product._id.toString(),
          name: item.product.name,
          slug: item.product.slug,
          images: item.product.images,
          brand: item.product.brand,
        }
      : null,
    category: item.category
      ? {
          id: item.category._id.toString(),
          name: item.category.name,
          slug: item.category.slug,
        }
      : null,
    minDiscount: item.minDiscount,
    channels: item.channels,
    isActive: item.isActive,
    lastNotifiedAt: item.lastNotifiedAt,
    createdAt: item.createdAt,
  };
}

async function listAlerts(userId) {
  const alerts = await Alert.find({ user: userId })
    .populate('product', 'name slug images brand')
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .lean();

  return { items: alerts.map(serializeAlert) };
}

async function createAlert(userId, data) {
  const productId = data.productId || null;
  const categoryId = data.categoryId || null;

  if (!productId && !categoryId) {
    throw ApiError.badRequest('Selecciona un producto o una categoria');
  }

  if (productId) {
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) throw ApiError.notFound('Producto no encontrado');
  }

  if (categoryId) {
    const category = await Category.findOne({ _id: categoryId, isActive: true });
    if (!category) throw ApiError.notFound('Categoria no encontrada');
  }

  const alert = await Alert.create({
    user: userId,
    product: productId,
    category: categoryId,
    minDiscount: data.minDiscount ?? 10,
    channels: data.channels?.length ? data.channels : ['inapp'],
  });

  await alert.populate('product', 'name slug images brand');
  await alert.populate('category', 'name slug');

  return serializeAlert(alert);
}

async function updateAlert(userId, alertId, data) {
  const alert = await Alert.findOneAndUpdate(
    { _id: alertId, user: userId },
    {
      $set: {
        ...(data.minDiscount !== undefined ? { minDiscount: data.minDiscount } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.channels !== undefined ? { channels: data.channels } : {}),
      },
    },
    { new: true, runValidators: true },
  )
    .populate('product', 'name slug images brand')
    .populate('category', 'name slug');

  if (!alert) throw ApiError.notFound('Alerta no encontrada');
  return serializeAlert(alert);
}

async function deleteAlert(userId, alertId) {
  const alert = await Alert.findOneAndDelete({ _id: alertId, user: userId });
  if (!alert) throw ApiError.notFound('Alerta no encontrada');
  return { id: alertId };
}

module.exports = { createAlert, deleteAlert, listAlerts, updateAlert };

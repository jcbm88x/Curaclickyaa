const express = require('express');
const mongoose = require('mongoose');
const adminRoutes = require('./admin.routes');
const alertRoutes = require('./alert.routes');
const authRoutes = require('./auth.routes');
const catalogRoutes = require('./catalog.routes');
const favoriteRoutes = require('./favorite.routes');
const notificationRoutes = require('./notification.routes');
const productRoutes = require('./product.routes');

const router = express.Router();

const dbStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: dbStates[mongoose.connection.readyState] || 'unknown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/', catalogRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/alerts', alertRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

module.exports = router;

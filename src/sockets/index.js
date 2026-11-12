const { Server } = require('socket.io');
const env = require('../config/env');
const { verifyAccessToken } = require('../services/auth.service');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.userId = null;
      next();
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      next();
    } catch (_error) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('catalog');

    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on('product:subscribe', (productId) => {
      if (typeof productId === 'string' && productId.length <= 64) {
        socket.join(`product:${productId}`);
      }
    });

    socket.on('product:unsubscribe', (productId) => {
      if (typeof productId === 'string' && productId.length <= 64) {
        socket.leave(`product:${productId}`);
      }
    });
  });

  return io;
}

function emitCatalog(event, payload) {
  if (io) io.to('catalog').emit(event, payload);
}

function emitUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

function emitProduct(productId, event, payload) {
  if (io) io.to(`product:${productId}`).emit(event, payload);
}

function getIO() {
  return io;
}

function closeSocket() {
  if (io) {
    io.close();
    io = null;
  }
}

module.exports = {
  closeSocket,
  emitCatalog,
  emitProduct,
  emitUser,
  getIO,
  initSocket,
};

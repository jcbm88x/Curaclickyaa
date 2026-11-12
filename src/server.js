const http = require('http');
const cron = require('node-cron');
const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { closeSocket, initSocket } = require('./sockets');
const { reconcilePromotionStatuses } = require('./services/promotion.service');

async function start() {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  const task = cron.schedule('*/30 * * * * *', async () => {
    try {
      const changed = await reconcilePromotionStatuses();
      if (changed) {
        console.log(`[promotions] ${changed} estado(s) actualizado(s)`);
      }
    } catch (error) {
      console.error('[promotions] error en scheduler:', error.message);
    }
  });

  try {
    await reconcilePromotionStatuses();
  } catch (error) {
    console.error('[promotions] error en reconciliacion inicial:', error.message);
  }

  server.listen(env.PORT, () => {
    console.log(`[server] Curaclickya API en http://localhost:${env.PORT}`);
    console.log(`[server] entorno: ${env.NODE_ENV}`);
    console.log(`[cors] origenes permitidos: ${env.corsOrigins.join(', ')}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[server] cerrando por ${signal}...`);
    task.stop();
    closeSocket();

    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('[server] no se pudo iniciar:', error);
  process.exit(1);
});

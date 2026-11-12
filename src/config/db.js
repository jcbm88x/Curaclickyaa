const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

async function connectDB(uri = env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI no esta configurada');
  }

  mongoose.connection.on('error', (error) => {
    console.error('[mongo] error de conexion:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[mongo] conexion perdida');
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 12000,
    maxPoolSize: 10,
  });

  console.log(`[mongo] conectado a ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };

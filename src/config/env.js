const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI es obligatoria')
    .default(isProduction ? '' : 'mongodb://127.0.0.1:27017/curaclickya'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_SECRET debe tener al menos 16 caracteres')
    .default(isProduction ? '' : 'dev-access-curaclickya-4f8c2a91b7e64d0f'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET debe tener al menos 16 caracteres')
    .default(isProduction ? '' : 'dev-refresh-curaclickya-9d3e5b72a1c84f60'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  ADMIN_NAME: z.string().default('Administrador Curaclickya'),
  ADMIN_EMAIL: z.string().email().default('admin@curaclickya.com'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin12345'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`Configuracion invalida:\n${details}`);
  process.exit(1);
}

const values = parsed.data;
const origins = values.FRONTEND_URL.split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

if (!isProduction && !origins.includes('http://localhost:5173')) {
  origins.push('http://localhost:5173');
}

const env = {
  ...values,
  isProduction,
  isTest,
  corsOrigins: Array.from(new Set(origins)),
  cookieSecure: isProduction,
  refreshCookiePath: '/api/v1/auth',
  accessCookieName: 'curaclickya_access',
  refreshCookieName: 'curaclickya_refresh',
};

module.exports = env;

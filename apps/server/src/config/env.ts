import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from root or local
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/krishi_db?schema=public'),
  // Leave empty to run without Redis (single-instance, in-memory Socket.IO)
  REDIS_URL: z.string().default(''),

  // Demo mode: fixed OTP 123456, simulated payments, no external providers required
  DEMO_MODE: z
    .string()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
  DEMO_OTP: z.string().default('123456'),

  JWT_ACCESS_SECRET: z.string().min(16).default('krishi_super_secret_jwt_access_token_key_32chars'),
  JWT_REFRESH_SECRET: z.string().min(16).default('krishi_super_secret_jwt_refresh_token_key_32chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // External optional / required on usage
  SMS_PROVIDER: z.enum(['console', 'msg91', 'twilio']).default('console'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_SERVICE_SID: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  S3_BUCKET_NAME: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_PUBLIC_CDN_URL: z.string().optional(),

  GOOGLE_MAPS_SERVER_KEY: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  PLATFORM_GSTIN: z.string().default('29AABCK1234F1Z5'),
  DEFAULT_HSN_CODE: z.string().default('3101'),
  AI_PROVIDER: z.enum(['openai', 'gemini']).default('gemini'),
  AI_API_KEY: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);

export function assertEnv(key: keyof typeof env, serviceName: string): string {
  const val = env[key];
  if (!val || typeof val !== 'string' || val.trim() === '') {
    throw new Error(
      `[CONFIGURATION_ERROR] Missing environment variable '${String(key)}' required for ${serviceName}. Please configure this in .env according to SETUP.md.`
    );
  }
  return val;
}

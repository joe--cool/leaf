import { config } from 'dotenv';
import { z } from 'zod';

config();

const booleanFromString = z
  .string()
  .default('false')
  .transform((value) => value.toLowerCase() === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(16),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().default('leaf@example.com'),
  GMAIL_APP_PASSWORD: z.string().optional(),
  GMAIL_USER: z.string().email().optional(),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
  APPLE_REDIRECT_URI: z.string().url().optional(),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(30),
  SETUP_TOKEN: z.string().optional(),
  AUTO_BOOTSTRAP_ADMIN: booleanFromString,
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).default('changeme123'),
  BOOTSTRAP_ADMIN_NAME: z.string().min(1).default('Admin'),
});

export const env = envSchema.parse(process.env);

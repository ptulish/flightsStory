import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().optional(),
  APP_JWT_SECRET: z.string().min(16).default('dev-only-change-this-secret'),

  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/skyhistory'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),

  IMAP_DEFAULT_HOST: z.string().default('imap.mail.me.com'),
  IMAP_DEFAULT_PORT: z.coerce.number().int().positive().default(993),
  IMAP_DEFAULT_TLS: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),

  GMAIL_MAX_MESSAGES: z.coerce.number().int().positive().default(150),
  ICLOUD_MAX_MESSAGES: z.coerce.number().int().positive().default(150),
  INLINE_WORKER: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

const data = parsed.data;

export const env = {
  ...data,
  GOOGLE_REDIRECT_URI:
    data.GOOGLE_REDIRECT_URI || `http://localhost:${data.PORT}/api/auth/google/callback`,
  CORS_ORIGINS: (data.CORS_ORIGINS || data.FRONTEND_ORIGIN)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
};

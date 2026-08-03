import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/bytequest?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().default('super_secret_access_key_12345'),
  JWT_REFRESH_SECRET: z.string().default('super_secret_refresh_key_12345'),
  CLOUDINARY_URL: z.string().optional(),
  SMTP_HOST: z.string().default('smtp.mailtrap.io'),
  SMTP_PORT: z.coerce.number().default(2525),
  SMTP_USER: z.string().default('mock_user'),
  SMTP_PASS: z.string().default('mock_pass'),
  SMTP_FROM: z.string().default('noreply@bytequest.edu'),
  USE_LLM_RECOMMENDER: z.string().default('false')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export default env;

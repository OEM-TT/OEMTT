import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config({ path: '.env.development' });

// Environment variable schema
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000'),
    DATABASE_URL: z.string(),
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    OPENAI_API_KEY: z.string().optional(),
    PERPLEXITY_API_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    RATE_LIMIT_WINDOW: z.string().default('15m'),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
});

// Validate and export environment variables
export const env = envSchema.parse(process.env);

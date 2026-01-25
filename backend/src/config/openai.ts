/**
 * OpenAI Client Configuration
 * 
 * Configures the OpenAI SDK for:
 * - Chat completions (gpt-4o-mini, gpt-4o)
 * - Embeddings (text-embedding-3-small)
 * - Streaming responses
 */

import OpenAI from 'openai';
import { env } from './env';

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Model configurations
export const MODELS = {
  // Chat models
  CHAT_SIMPLE: 'gpt-4o-mini',      // $0.15 / $0.60 per 1M tokens (in/out)
  CHAT_COMPLEX: 'gpt-4o',          // $2.50 / $10.00 per 1M tokens (in/out)
  
  // Embedding model
  EMBEDDING: 'text-embedding-3-small', // $0.02 per 1M tokens
} as const;

// Embedding dimensions
export const EMBEDDING_DIMENSIONS = 1536; // For text-embedding-3-small

// Token limits
export const TOKEN_LIMITS = {
  [MODELS.CHAT_SIMPLE]: 128000,    // gpt-4o-mini context window
  [MODELS.CHAT_COMPLEX]: 128000,   // gpt-4o context window
  MAX_OUTPUT: 4096,                // Max output tokens
} as const;

// Cost tracking (per 1M tokens)
export const COSTS = {
  [MODELS.CHAT_SIMPLE]: { input: 0.15, output: 0.60 },
  [MODELS.CHAT_COMPLEX]: { input: 2.50, output: 10.00 },
  [MODELS.EMBEDDING]: 0.02,
} as const;

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost for a request
 */
export function calculateCost(
  model: keyof typeof COSTS,
  inputTokens: number,
  outputTokens: number = 0
): number {
  if (model === MODELS.EMBEDDING) {
    return (inputTokens / 1_000_000) * COSTS[MODELS.EMBEDDING];
  }
  
  const { input, output } = COSTS[model as keyof typeof COSTS];
  return (inputTokens / 1_000_000) * input + (outputTokens / 1_000_000) * output;
}

export default openai;

/**
 * Embeddings Service
 * 
 * Generates vector embeddings for text chunks using OpenAI's embedding model.
 * Embeddings are used for semantic search in manual sections.
 */

import { openai, MODELS, EMBEDDING_DIMENSIONS, calculateCost, estimateTokens } from '@/config/openai';
import { TextChunk } from './chunker';

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
  cost: number;
}

export interface BatchEmbeddingResult {
  embeddings: Array<{
    index: number;
    embedding: number[];
  }>;
  totalTokens: number;
  totalCost: number;
}

/**
 * Generate embedding for a single text chunk
 * 
 * @param text - Text to embed
 * @returns Embedding vector and metadata
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    const response = await openai.embeddings.create({
      model: MODELS.EMBEDDING,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const embedding = response.data[0].embedding;
    const tokenCount = response.usage.total_tokens;
    const cost = calculateCost(MODELS.EMBEDDING, tokenCount);

    return {
      embedding,
      tokenCount,
      cost,
    };
  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple text chunks in batch
 * 
 * OpenAI allows up to 2048 inputs per batch request.
 * We'll process in smaller batches to be safe.
 * 
 * @param texts - Array of texts to embed
 * @param batchSize - Number of texts per batch (default: 100)
 * @returns Embeddings for all texts
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 100
): Promise<BatchEmbeddingResult> {
  const allEmbeddings: Array<{ index: number; embedding: number[] }> = [];
  let totalTokens = 0;

  console.log(`🔢 Generating embeddings for ${texts.length} chunks (batch size: ${batchSize})`);

  // Process in batches
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, Math.min(i + batchSize, texts.length));
    
    console.log(`  Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}: Processing ${batch.length} chunks...`);

    try {
      const response = await openai.embeddings.create({
        model: MODELS.EMBEDDING,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      // Store embeddings with their original indices
      response.data.forEach((item, batchIndex) => {
        allEmbeddings.push({
          index: i + batchIndex,
          embedding: item.embedding,
        });
      });

      totalTokens += response.usage.total_tokens;

      // Small delay to avoid rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
      throw error;
    }
  }

  const totalCost = calculateCost(MODELS.EMBEDDING, totalTokens);

  console.log(`✅ Generated ${allEmbeddings.length} embeddings (${totalTokens} tokens, $${totalCost.toFixed(4)})`);

  return {
    embeddings: allEmbeddings,
    totalTokens,
    totalCost,
  };
}

/**
 * Generate embeddings for text chunks with their metadata
 * 
 * @param chunks - Array of text chunks
 * @returns Chunks with embeddings attached
 */
export async function embedTextChunks(
  chunks: TextChunk[]
): Promise<Array<TextChunk & { embedding: number[] }>> {
  const texts = chunks.map(chunk => chunk.content);
  
  const result = await generateEmbeddingsBatch(texts);
  
  // Attach embeddings to chunks
  const chunksWithEmbeddings = chunks.map((chunk, index) => {
    const embeddingData = result.embeddings.find(e => e.index === index);
    
    if (!embeddingData) {
      throw new Error(`Missing embedding for chunk ${index}`);
    }
    
    return {
      ...chunk,
      embedding: embeddingData.embedding,
    };
  });
  
  return chunksWithEmbeddings;
}

/**
 * Calculate cosine similarity between two embeddings
 * 
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity score (0-1, higher is more similar)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

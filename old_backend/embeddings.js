import crypto from 'crypto';
import OpenAI from 'openai';

let openaiClient = null;

function getClient() {
  if (!openaiClient) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }
    openaiClient = new OpenAI({
      baseURL: 'https://models.github.ai/inference',
      apiKey: token,
    });
  }
  return openaiClient;
}

const embeddingCache = new Map();
const MAX_EMBEDDING_CACHE = 2000;

function cacheKey(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

const DEFAULT_EMBED_TIMEOUT_MS = Number(process.env.EMBEDDING_TIMEOUT_MS) || 25000;

export async function embedText(text, options = {}) {
  const normalized = String(text || '').trim().replace(/\s+/g, ' ');
  if (!normalized) return null;

  const key = cacheKey(normalized);
  if (embeddingCache.has(key)) {
    return embeddingCache.get(key);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_EMBED_TIMEOUT_MS;
  const client = getClient();
  const request = client.embeddings.create({
    model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    input: normalized.slice(0, 8000),
  });

  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Embedding timeout (${timeoutMs}ms)`)),
      timeoutMs
    );
  });

  const response = await Promise.race([request, timeout]).finally(() => clearTimeout(timeoutId));
  const embedding = response.data[0].embedding;

  if (embeddingCache.size >= MAX_EMBEDDING_CACHE) {
    const oldest = embeddingCache.keys().next().value;
    embeddingCache.delete(oldest);
  }
  embeddingCache.set(key, embedding);

  return embedding;
}

/** Embed multiple strings in one API call (batch campaign refresh). */
export async function embedTextBatch(texts) {
  const unique = [...new Set(texts.map((t) => String(t || '').trim()).filter(Boolean))];
  const results = new Map();

  const uncached = [];
  for (const t of unique) {
    const key = cacheKey(t);
    if (embeddingCache.has(key)) {
      results.set(t, embeddingCache.get(key));
    } else {
      uncached.push(t);
    }
  }

  if (uncached.length === 0) return results;

  const client = getClient();
  const batchSize = 32;
  for (let i = 0; i < uncached.length; i += batchSize) {
    const chunk = uncached.slice(i, i + batchSize).map((t) => t.slice(0, 8000));
    const response = await client.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: chunk,
    });
    chunk.forEach((text, idx) => {
      const embedding = response.data[idx].embedding;
      const key = cacheKey(text);
      embeddingCache.set(key, embedding);
      results.set(text, embedding);
    });
  }

  return results;
}

export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  const len = vecA.length;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    const ai = vecA[i];
    const bi = vecB[i];
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

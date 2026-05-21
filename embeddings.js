import OpenAI from "openai";

let openaiClient = null;

function getClient() {
  if (!openaiClient) {
    const token = process.env["GITHUB_TOKEN"];
    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is not set");
    }
    const endpoint = "https://models.github.ai/inference";

    openaiClient = new OpenAI({
      baseURL: endpoint,
      apiKey: token,
    });
  }
  return openaiClient;
}

const embeddingCache = new Map();
const MAX_EMBEDDING_CACHE = 1000;

export async function embedText(text) {
  const cacheKey = text.substring(0, 150);
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey);
  }

  const client = getClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  const embedding = response.data[0].embedding;

  if (embeddingCache.size >= MAX_EMBEDDING_CACHE) {
    const oldest = embeddingCache.keys().next().value;
    embeddingCache.delete(oldest);
  }
  embeddingCache.set(cacheKey, embedding);

  return embedding;
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

import 'dotenv/config';
import { embedText } from './embeddings.js';

console.log("Testing embedding...");
try {
  const result = await embedText("test");
  console.log("Embedding successful, length:", result.length);
} catch (e) {
  console.error("Embedding failed:", e.message);
}
process.exit(0);

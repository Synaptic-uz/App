/**
 * MongoDB bazasini to‘liq o‘chiradi (barcha kolleksiyalar).
 * Ishlatish: npm run db:drop
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/synaptic-ai';

async function main() {
  await mongoose.connect(URI);
  const dbName = mongoose.connection.db.databaseName;
  await mongoose.connection.dropDatabase();
  console.log(`[drop-db] "${dbName}" o‘chirildi (${URI.replace(/\/\/[^@]+@/, '//***@')})`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[drop-db] Xato:', err.message || err);
  process.exit(1);
});

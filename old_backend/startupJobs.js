import { enqueueJob } from './jobQueue.js';
import { seedDatabaseIfNeeded, refreshStartupEmbeddings } from './db.js';
import { loadCampaignCache } from './enrichment.js';
import { bootstrapRankingStats } from './db.js';
import { bulkLoadCtr } from './adRanking.js';

/** Runs after HTTP server is listening — never blocks startup. */
export function scheduleStartupJobs() {
  if (process.env.SKIP_DB_SEED === '1' || process.env.SKIP_DB_SEED === 'true') {
    console.log('[startup] SKIP_DB_SEED — seed job skipped');
    enqueueJob('ranking:bootstrap', () => bootstrapRankingStats(bulkLoadCtr));
    enqueueJob('cache:reload-campaigns', () => loadCampaignCache());
    return;
  }

  // Tez: migratsiya + demo agent (~1s). Embedding alohida ixtiyoriy job.
  enqueueJob('db:seed-and-migrate', async () => {
    await seedDatabaseIfNeeded();
  });

  enqueueJob('ranking:bootstrap', () => bootstrapRankingStats(bulkLoadCtr));
  enqueueJob('cache:reload-campaigns', () => loadCampaignCache());

  if (process.env.EMBED_ON_STARTUP === '1' || process.env.EMBED_ON_STARTUP === 'true') {
    enqueueJob('embeddings:startup-refresh', () => refreshStartupEmbeddings());
    enqueueJob('cache:reload-campaigns', () => loadCampaignCache());
  }
}

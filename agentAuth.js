import crypto from 'crypto';
import { Agent } from './db.js';

/**
 * Hash an API key using SHA-256.
 * We never store plaintext keys in the database.
 */
export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a new Synaptic API key.
 * Format: sk-synaptic-<32 random hex chars>
 */
export function generateApiKey() {
  const random = crypto.randomBytes(16).toString('hex');
  return `sk-synaptic-${random}`;
}

/**
 * Express middleware: validates API key from body or header.
 * On success: attaches req.agent and increments total_requests.
 * On failure: returns { match: false } — never breaks the agent's pipeline.
 */
export async function agentAuth(req, res, next) {
  try {
    // Accept key from body (api_key) or header (X-Synaptic-Key)
    const apiKey = req.body?.api_key || req.headers['x-synaptic-key'];

    if (!apiKey) {
      console.warn('[agentAuth] missing api_key');
      return res.json({ match: false });
    }

    const keyHash = hashApiKey(apiKey);
    const agent = await Agent.findOne({ api_key_hash: keyHash, active: true });

    if (!agent) {
      console.warn('[agentAuth] invalid or inactive api_key');
      return res.json({ match: false });
    }

    // Increment lifetime request counter + update last_seen
    await Agent.updateOne(
      { _id: agent._id },
      { $inc: { total_requests: 1 }, $set: { last_seen: new Date() } }
    );

    // Attach agent to request for downstream use
    req.agent = agent;
    next();
  } catch (error) {
    console.error('Agent auth error:', error);
    // Even on internal error — return { match: false }, never crash the agent
    return res.json({ match: false });
  }
}

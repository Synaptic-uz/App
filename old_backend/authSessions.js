import crypto from 'node:crypto';
import mongoose from 'mongoose';

export async function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const authSessionSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true, unique: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refresh_token_hash: { type: String, required: true },
    user_agent: { type: String, default: '' },
    ip: { type: String, default: '' },
    label: { type: String, default: '' },
    last_used_at: { type: Date, default: Date.now },
    expires_at: { type: Date, required: true, index: true },
    revoked_at: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

authSessionSchema.index({ user_id: 1, revoked_at: 1 });

export const AuthSession =
  mongoose.models.AuthSession || mongoose.model('AuthSession', authSessionSchema);

function sessionTtlMs() {
  const raw = process.env.JWT_REFRESH_EXPIRES || '7d';
  const m = String(raw).match(/^(\d+)([dhms])?$/i);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(m[1], 10);
  const unit = (m[2] || 'd').toLowerCase();
  const mult = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  return n * (mult[unit] || mult.d);
}

export function newSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

function parseUaLabel(ua = '') {
  const s = String(ua);
  if (/iPhone|Android|Mobile/i.test(s)) return 'Mobil brauzer';
  if (/Chrome/i.test(s)) return 'Chrome';
  if (/Firefox/i.test(s)) return 'Firefox';
  if (/Safari/i.test(s)) return 'Safari';
  return 'Brauzer';
}

export async function createAuthSession(userId, refreshToken, meta = {}, existingSid = null) {
  const sid = existingSid || newSessionId();
  const expires_at = new Date(Date.now() + sessionTtlMs());
  await AuthSession.create({
    session_id: sid,
    user_id: userId,
    refresh_token_hash: await hashRefreshToken(refreshToken),
    user_agent: meta.userAgent || '',
    ip: meta.ip || '',
    label: meta.label || parseUaLabel(meta.userAgent),
    expires_at,
  });
  return sid;
}

export async function touchAuthSession(sid) {
  await AuthSession.updateOne(
    { session_id: sid, revoked_at: null },
    { $set: { last_used_at: new Date() } }
  );
}

export async function isAuthSessionActive(sid, userId) {
  if (!sid || !userId) return false;
  const row = await AuthSession.findOne({
    session_id: sid,
    user_id: userId,
    revoked_at: null,
    expires_at: { $gt: new Date() },
  }).lean();
  return Boolean(row);
}

export async function rotateAuthSession(sid, userId, newRefreshToken) {
  const hash = await hashRefreshToken(newRefreshToken);
  const expires_at = new Date(Date.now() + sessionTtlMs());
  const result = await AuthSession.updateOne(
    { session_id: sid, user_id: userId, revoked_at: null },
    {
      $set: {
        refresh_token_hash: hash,
        last_used_at: new Date(),
        expires_at,
      },
    }
  );
  return result.modifiedCount > 0;
}

export async function revokeAuthSession(sid, userId) {
  await AuthSession.updateOne(
    { session_id: sid, user_id: userId },
    { $set: { revoked_at: new Date() } }
  );
}

export async function revokeAllAuthSessions(userId, exceptSid = null) {
  const filter = { user_id: userId, revoked_at: null };
  if (exceptSid) filter.session_id = { $ne: exceptSid };
  await AuthSession.updateMany(filter, { $set: { revoked_at: new Date() } });
}

export async function listAuthSessions(userId, currentSid = null) {
  const rows = await AuthSession.find({
    user_id: userId,
    revoked_at: null,
    expires_at: { $gt: new Date() },
  })
    .sort({ last_used_at: -1 })
    .lean();

  return rows.map((r) => ({
    id: r.session_id,
    label: r.label || 'Qurilma',
    user_agent: r.user_agent,
    ip: r.ip,
    created_at: r.createdAt,
    last_used_at: r.last_used_at,
    expires_at: r.expires_at,
    current: r.session_id === String(currentSid),
  }));
}

export async function validateRefreshForSession(sid, userId, refreshToken) {
  const row = await AuthSession.findOne({
    session_id: sid,
    user_id: userId,
    revoked_at: null,
    expires_at: { $gt: new Date() },
  }).lean();
  if (!row) return false;
  const hash = await hashRefreshToken(refreshToken);
  return row.refresh_token_hash === hash;
}

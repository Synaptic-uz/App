import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { isAuthSessionActive, touchAuthSession, hashRefreshToken } from './authSessions.js';

export { hashRefreshToken };

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-synaptic-ai-2026';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '1h';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

export function generateAccessToken(user, sid) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, type: 'access', sid },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

export function generateRefreshToken(user, sid) {
  return jwt.sign(
    { id: user._id, email: user.email, type: 'refresh', sid },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
}

/** @deprecated use generateAccessToken */
export function generateToken(user) {
  return generateAccessToken(user, null);
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.type !== 'refresh') throw new Error('Invalid refresh token');
  return payload;
}

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Kirish tokeni talab qilinadi' });

  try {
    const user = verifyAccessToken(token);
    if (user.type === 'refresh') {
      return res.status(403).json({ error: 'Access token talab qilinadi' });
    }
    if (user.sid) {
      const active = await isAuthSessionActive(user.sid, user.id);
      if (!active) {
        return res.status(403).json({ error: 'Sessiya tugagan yoki bekor qilingan', code: 'SESSION_REVOKED' });
      }
      touchAuthSession(user.sid).catch(() => {});
    }
    req.user = user;
    next();
  } catch {
    return res.status(403).json({ error: 'Token noto‘g‘ri yoki muddati tugagan', code: 'TOKEN_EXPIRED' });
  }
}

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

export function issueAuthPair(user, sid) {
  const accessToken = generateAccessToken(user, sid);
  const refreshToken = generateRefreshToken(user, sid);
  return {
    token: accessToken,
    accessToken,
    refreshToken,
    sessionId: sid,
    user: { id: user._id, email: user.email, role: user.role },
  };
}

export function requestMeta(req) {
  return {
    userAgent: req.headers['user-agent'] || '',
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '',
  };
}

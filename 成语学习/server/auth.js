// 口令哈希与登录会话
const crypto = require('crypto');
const db = require('./db');

function newSalt() {
  return crypto.randomBytes(8).toString('hex');
}

function hashPin(pin, salt) {
  return crypto.scryptSync(String(pin), salt, 32).toString('hex');
}

function verifyPin(pin, hash, salt) {
  const a = Buffer.from(hashPin(pin, salt));
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createSession(kind, kidId = null) {
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions (token, kind, kid_id, created_at) VALUES (?, ?, ?, ?)')
    .run(token, kind, kidId, new Date().toISOString());
  return token;
}

function readSession(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  return db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) || null;
}

function requireKid(req, res, next) {
  const s = readSession(req);
  if (!s || s.kind !== 'kid') return res.status(401).json({ error: '请先登录' });
  req.kidId = s.kid_id;
  next();
}

function requireParent(req, res, next) {
  const s = readSession(req);
  if (!s || s.kind !== 'parent') return res.status(401).json({ error: '请用家长口令登录' });
  next();
}

module.exports = { newSalt, hashPin, verifyPin, createSession, requireKid, requireParent };

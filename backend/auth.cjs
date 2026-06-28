"use strict";

const crypto = require("crypto");

// ── Password Hashing ────────────────────────────────────────────────
// crypto.pbkdf2 is built-in, no dependencies needed
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha256")
    .toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, hashed) {
  if (!hashed || typeof hashed !== "string" || !hashed.includes(":")) return false;
  const [salt, hash] = hashed.split(":");
  const testHash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha256")
    .toString("hex");
  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(testHash, "hex"),
      Buffer.from(hash, "hex")
    );
  } catch {
    return false;
  }
}

// ── JWT (simple: header.payload.signature) ────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";

function signToken(userId, expiresIn = "7d") {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresIn === "7d" ? 604800 : 3600); // 7 days or 1 hour
  const payload = { userId, iat: now, exp };
  const header = { alg: "HS256", typ: "JWT" };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  return `${headerB64}.${payloadB64}.${signature}`;
}

function verifyToken(token) {
  try {
    const [headerB64, payloadB64, signature] = token.split(".");
    if (!headerB64 || !payloadB64 || !signature) return null;

    const testSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    // Timing-safe signature comparison
    const sigBuf = Buffer.from(signature);
    const testBuf = Buffer.from(testSig);
    if (sigBuf.length !== testBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, testBuf)) return null;

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    );
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

function getTokenFromHeader(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

// ── Token Blacklist (for logout / session invalidation) ──────────────
// In-memory blacklist. For multi-instance deployments, replace with
// a shared store (Redis, DB table) so logout works across instances.
const TOKEN_BLACKLIST = new Set();
const BLACKLIST_MAX_SIZE = 50_000; // safety cap to avoid unbounded memory growth

function invalidateToken(token) {
  if (!token) return;
  if (TOKEN_BLACKLIST.size >= BLACKLIST_MAX_SIZE) {
    // Drop oldest half (Sets preserve insertion order)
    const toRemove = Math.floor(BLACKLIST_MAX_SIZE / 2);
    let i = 0;
    for (const t of TOKEN_BLACKLIST) {
      if (i++ >= toRemove) break;
      TOKEN_BLACKLIST.delete(t);
    }
  }
  TOKEN_BLACKLIST.add(token);
}

function isTokenBlacklisted(token) {
  return TOKEN_BLACKLIST.has(token);
}

// ── CSRF Tokens ────────────────────────────────────────────────────
// Per-user CSRF token, regenerated on demand via GET /api/csrf-token.
const CSRF_TOKENS = new Map(); // userId -> token

function createCSRFToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  CSRF_TOKENS.set(userId, token);
  return token;
}

function validateCSRFToken(userId, token) {
  if (!token || typeof token !== "string") return false;
  const stored = CSRF_TOKENS.get(userId);
  if (!stored) return false;
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(stored);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ── Email Verification Tokens ─────────────────────────────────────
function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  getTokenFromHeader,
  invalidateToken,
  isTokenBlacklisted,
  createCSRFToken,
  validateCSRFToken,
  generateVerificationToken,
};

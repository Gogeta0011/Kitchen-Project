"use strict";

const crypto = require("crypto");

// ── Input Validation ───────────────────────────────────────────────
function str(val, min = 0, max = 500) {
  if (typeof val !== "string") return null;
  const t = val.trim();
  if (t.length < min || t.length > max) return null;
  return t;
}

function int(val, min, max) {
  const n = Number(val);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

function email(val) {
  if (typeof val !== "string") return null;
  const t = val.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) || t.length > 254) return null;
  return t;
}

// Validates a single ingredient object: { qty, item } — the shape the upload
// form sends and the recipe page renders. `item` (the ingredient name) is
// required; `qty` (quantity) is optional. Returns null if malformed (prevents
// stored XSS / arbitrary object injection via the ingredients array).
function ingredient(ing) {
  if (typeof ing !== "object" || ing === null || Array.isArray(ing)) return null;
  const item = str(ing.item, 1, 200);
  if (!item) return null; // ingredient name is required
  const qty = str(String(ing.qty ?? ""), 0, 50) || ""; // quantity optional
  return { qty, item };
}

const validate = {
  signup(body) {
    const username = str(body.username, 2, 30);
    const emailVal = email(body.email);
    const password = str(body.password, 6, 128);
    if (!username) return "Username must be 2-30 characters";
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return "Username can only contain letters, numbers, _ . -";
    if (!emailVal) return "Valid email required";
    if (!password) return "Password must be 6-128 characters";
    return { username, email: emailVal, password };
  },
  login(body) {
    const username = str(body.username, 1, 100);
    const password = str(body.password, 1, 200);
    if (!username) return "Username required";
    if (!password) return "Password required";
    return { username, password };
  },
  recipe(body) {
    const title = str(body.title, 2, 200);
    const description = str(body.description || "", 0, 2000);
    const category = str(body.category, 1, 50);
    const cuisine = str(body.cuisine || "International", 1, 50);
    const diet = str(body.diet || "Anything", 1, 50);
    const difficulty = str(body.difficulty || "Easy", 1, 30);
    const prepTime = str(body.prepTime || "15 min", 1, 50);
    const cookTime = str(body.cookTime || "30 min", 1, 50);
    const servings = int(body.servings, 1, 100) || 4;
    if (!title) return "Title must be 2-200 characters";
    if (!category) return "Category required";

    const tags = Array.isArray(body.tags)
      ? body.tags.map(t => str(t, 1, 50)).filter(Boolean).slice(0, 10)
      : String(body.tags || "").split(",").map(t => str(t, 1, 50)).filter(Boolean).slice(0, 10);

    // ✅ SECURITY FIX: Validate ingredient structure instead of accepting
    // arbitrary array contents (previously accepted objects/nulls/numbers
    // unchecked, which could store malformed or malicious data).
    const ingredients = Array.isArray(body.ingredients)
      ? body.ingredients.map(ingredient).filter(Boolean).slice(0, 50)
      : [];
    if (Array.isArray(body.ingredients) && body.ingredients.length > 0 && ingredients.length === 0) {
      return "Each ingredient needs a name";
    }

    const steps = Array.isArray(body.steps)
      ? body.steps.map(s => (typeof s === "string" ? str(s, 1, 1000) : null)).filter(Boolean).slice(0, 50)
      : [];

    // Image fields: only allow well-formed strings, never arbitrary objects
    const imageKey = typeof body.imageKey === "string" ? str(body.imageKey, 0, 500) : undefined;
    const imageUrl = typeof body.imageUrl === "string" ? str(body.imageUrl, 0, 1000) : undefined;

    return { title, description, category, cuisine, diet, difficulty, prepTime, cookTime, servings, tags, ingredients, steps, imageKey, imageUrl };
  },
  comment(body) {
    const text = str(body.body, 1, 1000);
    if (!text) return "Comment must be 1-1000 characters";
    return { body: text };
  },
  rating(body) {
    const stars = int(body.stars, 1, 5);
    if (!stars) return "Stars must be 1-5";
    return { stars };
  },
  collection(body) {
    const name = str(body.name, 1, 100);
    if (!name) return "Collection name must be 1-100 characters";
    return { name };
  },
  profile(body) {
    return {
      bio: body.bio !== undefined ? str(body.bio, 0, 500) : undefined,
      specialty: body.specialty !== undefined ? str(body.specialty, 0, 100) : undefined,
      name: body.name !== undefined ? str(body.name, 1, 100) : undefined,
      avatarImageBase64: typeof body.avatarImageBase64 === "string" ? body.avatarImageBase64 : undefined,
    };
  },
};

// ── Rate Limiter ─────────────────────────────────────────────────
// Simple in-memory per-IP rate limiter. Resets every window.
const WINDOWS = new Map(); // ip -> { count, resetAt }

function rateLimit(req, limit = 100, windowMs = 60_000) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim()
    || req.socket?.remoteAddress
    || "unknown";

  const now = Date.now();
  let w = WINDOWS.get(ip);
  if (!w || now > w.resetAt) {
    w = { count: 0, resetAt: now + windowMs };
    WINDOWS.set(ip, w);
  }
  w.count++;

  if (w.count > limit) {
    const retryAfter = Math.ceil((w.resetAt - now) / 1000);
    const err = new Error(`Too many requests. Try again in ${retryAfter}s.`);
    err.status = 429;
    err.headers = { "Retry-After": String(retryAfter) };
    throw err;
  }
}

// ✅ SECURITY FIX: Stricter, per-account+IP rate limiting on auth routes.
// Previously this only limited by IP at 10/min, which allowed ~14,400
// password guesses per day against a single account from a single IP,
// and didn't isolate one user's lockout from another's.
const AUTH_WINDOWS = new Map(); // "ip:identifier" -> { count, resetAt }

function authRateLimit(req, identifier = "", limit = 5, windowMs = 60_000) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim()
    || req.socket?.remoteAddress
    || "unknown";
  const key = `${ip}:${String(identifier).toLowerCase()}`;

  const now = Date.now();
  let w = AUTH_WINDOWS.get(key);
  if (!w || now > w.resetAt) {
    w = { count: 0, resetAt: now + windowMs };
    AUTH_WINDOWS.set(key, w);
  }
  w.count++;

  if (w.count > limit) {
    const retryAfter = Math.ceil((w.resetAt - now) / 1000);
    const err = new Error(`Too many attempts. Try again in ${retryAfter}s.`);
    err.status = 429;
    err.headers = { "Retry-After": String(retryAfter) };
    throw err;
  }
}

// Cleanup stale windows every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, w] of WINDOWS) {
    if (now > w.resetAt + 60_000) WINDOWS.delete(ip);
  }
  for (const [key, w] of AUTH_WINDOWS) {
    if (now > w.resetAt + 60_000) AUTH_WINDOWS.delete(key);
  }
}, 300_000);

// ── Security headers ────────────────────────────────────────────
// ✅ SECURITY FIX: Added Content-Security-Policy to mitigate XSS impact,
// and HSTS for production HTTPS enforcement.
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

if (process.env.NODE_ENV === "production") {
  SECURITY_HEADERS["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
}

module.exports = { validate, rateLimit, authRateLimit, SECURITY_HEADERS };

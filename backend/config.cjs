"use strict";

const fs = require("fs");
const path = require("path");

// ── web.config connection string ─────────────────────────
// Classic ASP.NET-style config: the SQLite database location lives in
// web.config's <connectionStrings>. Node has no built-in reader for it, so we
// parse the one value we need. This makes web.config the REAL source of the
// connection — point it at a different .db file and the app follows, no code
// change required.
function readWebConfigConnectionString(name) {
  try {
    const xml = fs.readFileSync(path.join(__dirname, "..", "web.config"), "utf8");
    const re = new RegExp('<add\\s+name="' + name + '"[^>]*?connectionString="([^"]+)"', "i");
    const m = xml.match(re);
    return m ? m[1].trim() : null;
  } catch {
    return null; // web.config missing/unreadable → fall back to defaults
  }
}

const WEBCONFIG_DB = readWebConfigConnectionString("KitchenDatabase");

// ── Configuration Management ─────────────────────────────
// Single source of truth for all settings, environment variables,
// database paths, and connection details.

module.exports = {
  // ── Environment ────────────────────────────────────────
  env: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") === "development",
  isProd: (process.env.NODE_ENV || "development") === "production",

  // ── Server ────────────────────────────────────────────
  server: {
    port: Number(process.env.PORT || 4000),
    host: process.env.HOST || "0.0.0.0",
  },

  // ── Database ──────────────────────────────────────────
  database: {
    // Priority: env var → web.config <connectionStrings> → code default
    path: process.env.DB_PATH || WEBCONFIG_DB || "./backend/prisma/dev.db",
    type: "sqlite", // For future PostgreSQL migration
    backup: {
      enabled: process.env.BACKUP_ENABLED !== "false",
      dir: process.env.BACKUP_DIR || "./backend/backups",
      maxFiles: Number(process.env.BACKUP_MAX_FILES || 10),
    },
  },

  // ── Authentication ────────────────────────────────────
  auth: {
    jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
    jwtExpiry: "7d",
    passwordIterations: 100_000,
    passwordAlgorithm: "sha256",
  },

  // ── Cloudinary (Image Uploads) ────────────────────────
  cloudinary: {
    enabled: !!process.env.CLOUDINARY_CLOUD_NAME,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },

  // ── Rate Limiting ─────────────────────────────────────
  rateLimit: {
    globalWindow: 60_000, // 1 minute
    globalLimit: 200, // per IP
    authWindow: 60_000,
    authLimit: 5, // ✅ tightened: stricter per-account+IP limit for login/signup
  },

  // ── Email / Verification ──────────────────────────────
  email: {
    // When false (default for local/dev), accounts are auto-verified so
    // the app remains usable without SMTP configured. Set true once an
    // email provider is wired up in production.
    verificationRequired: process.env.EMAIL_VERIFICATION_REQUIRED === "true",
    service: process.env.SMTP_SERVICE || "",
    from: process.env.SMTP_FROM || "noreply@kitchenplatform.local",
    apiKey: process.env.SMTP_API_KEY || "",
    tokenExpiryMs: 24 * 60 * 60 * 1000, // 24 hours
  },

  // ── Security ───────────────────────────────────────────
  security: {
    csrfEnabled: process.env.CSRF_ENABLED !== "false", // on by default
    sessionTimeoutMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    auditLoggingEnabled: process.env.AUDIT_LOGGING_ENABLED !== "false",
  },

  // ── Logging ───────────────────────────────────────────
  logging: {
    level: process.env.LOG_LEVEL || "info",
    sql: process.env.LOG_SQL === "true", // Log SQL queries
    requests: process.env.LOG_REQUESTS === "true",
  },

  // ── Feature Flags ─────────────────────────────────────
  features: {
    notifications: true,
    imageUploads: !!process.env.CLOUDINARY_CLOUD_NAME,
    adminPanel: true,
    dataExport: true,
  },

  // ── Get Config Value (with fallback) ──────────────────
  get(key, fallback = null) {
    const keys = key.split(".");
    let value = module.exports;
    for (const k of keys) {
      // Safer property access to prevent prototype pollution
      if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, k)) {
        value = value[k];
      } else {
        return fallback;
      }
    }
    return value;
  },

  // ── Validate Required Values ──────────────────────────
  validate() {
    const errors = [];

    if (!module.exports.auth.jwtSecret || module.exports.auth.jwtSecret.includes("dev-secret")) {
      if (module.exports.isProd) {
        errors.push("JWT_SECRET must be set and secure in production");
      }
    }

    if (module.exports.features.imageUploads && !module.exports.cloudinary.cloudName) {
      console.warn("⚠️  Cloudinary not configured. Image uploads will fail.");
    }

    if (errors.length > 0) {
      console.error("❌ Configuration Errors:");
      errors.forEach(e => console.error(`  - ${e}`));
      if (module.exports.isProd) process.exit(1);
    }

    return true;
  },

  // ── Print Config (for debugging) ──────────────────────
  print() {
    console.log("\n📋 Configuration:");
    console.log(`  Environment: ${this.env}`);
    console.log(`  Server: http://localhost:${this.server.port}`);
    console.log(`  Database: ${this.database.path}`);
    console.log(`  JWT Secret: ${this.auth.jwtSecret === "dev-secret-change-in-production" ? "⚠️  DEFAULT (CHANGE!)" : "✅ Set"}`);
    console.log(`  Cloudinary: ${this.cloudinary.enabled ? "✅ Enabled" : "⚠️  Disabled"}`);
    console.log(`  Backups: ${this.database.backup.enabled ? "✅ Enabled" : "❌ Disabled"}`);
    console.log("");
  },
};

"use strict";
// Singleton Prisma Client for the backend. Replaces the old sql.js `DB` class.
// Prisma Client reads DATABASE_URL from the environment; since this plain Node
// process doesn't use a bundler, we load the repo-root .env ourselves (the
// Prisma CLI loads .env, but @prisma/client at runtime does not).

const fs = require("fs");
const path = require("path");

if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(__dirname, "..", ".env");
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch { /* no .env — rely on real env vars (e.g. Railway) */ }
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = prisma;

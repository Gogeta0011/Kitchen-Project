"use strict";

const fs = require("fs");
const path = require("path");
const config = require("./config.cjs");

// ── Database Export/Import Utilities (Prisma/Postgres) ────────
// Models listed parent-first (safe insert order); reverse for deletes.
const MODELS = [
  { name: "User", d: "user" },
  { name: "Ingredient", d: "ingredient" },
  { name: "Product", d: "product" },
  { name: "Recipe", d: "recipe" },
  { name: "RecipeStep", d: "recipeStep" },
  { name: "RecipeIngredient", d: "recipeIngredient" },
  { name: "Comment", d: "comment" },
  { name: "Rating", d: "rating" },
  { name: "RecipeLike", d: "recipeLike" },
  { name: "Collection", d: "collection" },
  { name: "CollectionRecipe", d: "collectionRecipe" },
  { name: "SavedRecipe", d: "savedRecipe" },
  { name: "Follow", d: "follow" },
  { name: "Notification", d: "notification" },
  { name: "PickerHistory", d: "pickerHistory" },
  { name: "AuditLog", d: "auditLog" },
  { name: "CartItem", d: "cartItem" },
];
const DELEGATE = Object.fromEntries(MODELS.map((m) => [m.name, m.d]));

class DatabaseUtils {
  constructor(prisma) {
    this.prisma = prisma;
    this.backupDir = config.database.backup.dir;
  }

  // ── Export all data as JSON ────────────────────────────
  async exportAsJSON() {
    const data = {};
    for (const { name, d } of MODELS) {
      try { data[name] = await this.prisma[d].findMany(); }
      catch (err) { console.warn(`⚠️  Could not export ${name}:`, err.message); data[name] = []; }
    }
    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      tables: Object.keys(data).length,
      totalRecords: Object.values(data).reduce((sum, arr) => sum + arr.length, 0),
      data,
    };
  }

  async saveJSONToFile(filename = null) {
    if (!fs.existsSync(this.backupDir)) fs.mkdirSync(this.backupDir, { recursive: true });
    const exported = await this.exportAsJSON();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = filename || path.join(this.backupDir, `backup-${timestamp}.json`);
    fs.writeFileSync(file, JSON.stringify(exported, null, 2));
    console.log(`✅ Backup saved: ${file}`);
    return file;
  }

  async exportTableAsCSV(tableName) {
    const d = DELEGATE[tableName];
    if (!d) return "";
    const rows = await this.prisma[d].findMany();
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]);
    const csvHeaders = headers.map((h) => `"${h}"`).join(",");
    const csvRows = rows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '""';
        if (val instanceof Date) return `"${val.toISOString()}"`;
        if (Array.isArray(val) || typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
        return String(val);
      }).join(",")
    );
    return [csvHeaders, ...csvRows].join("\n");
  }

  // ── Clear all data (DANGER!) — children first ───────────
  async clearAllData() {
    for (const { name, d } of [...MODELS].reverse()) {
      try { await this.prisma[d].deleteMany(); }
      catch (err) { console.warn(`⚠️  Could not clear ${name}:`, err.message); }
    }
    console.log("🗑️  All data cleared");
  }

  async getStats() {
    const stats = {};
    for (const { name, d } of MODELS) {
      try { stats[name] = await this.prisma[d].count(); } catch { stats[name] = 0; }
    }
    return stats;
  }

  async printStats() {
    const stats = await this.getStats();
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    console.log("\n📊 Database Statistics:");
    for (const [table, count] of Object.entries(stats)) {
      if (count > 0) console.log(`  ${table.padEnd(20)} ${count}`);
    }
    console.log(`  ${"TOTAL".padEnd(20)} ${total}\n`);
  }

  cleanupBackups(maxFiles = config.database.backup.maxFiles) {
    if (!fs.existsSync(this.backupDir)) return;
    const files = fs.readdirSync(this.backupDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ name: f, time: fs.statSync(path.join(this.backupDir, f)).mtime }))
      .sort((a, b) => b.time - a.time);
    if (files.length > maxFiles) {
      for (const file of files.slice(maxFiles)) {
        fs.unlinkSync(path.join(this.backupDir, file.name));
        console.log(`🗑️  Deleted old backup: ${file.name}`);
      }
    }
  }

  listBackups() {
    if (!fs.existsSync(this.backupDir)) return [];
    return fs.readdirSync(this.backupDir)
      .filter((f) => f.endsWith(".json") && !f.includes("..") && !f.includes("/") && !f.includes("\\"))
      .map((f) => {
        const stat = fs.statSync(path.join(this.backupDir, f));
        return { name: f, size: `${(stat.size / 1024).toFixed(2)} KB`, date: stat.mtime.toISOString() };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // ── Restore from backup — parent-first insert ───────────
  async restoreFromFile(filename) {
    // contain to backupDir, accept a bare filename or a full path within it
    const full = path.isAbsolute(filename) ? filename : path.join(this.backupDir, filename);
    if (!fs.existsSync(full)) throw new Error(`Backup file not found: ${filename}`);
    const backup = JSON.parse(fs.readFileSync(full, "utf-8"));

    await this.clearAllData();

    for (const { name, d } of MODELS) {
      const rows = backup.data?.[name];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      try { await this.prisma[d].createMany({ data: rows, skipDuplicates: true }); }
      catch (err) { console.warn(`⚠️  Could not insert into ${name}:`, err.message); }
    }
    console.log(`✅ Restored from: ${filename}`);
  }
}

module.exports = DatabaseUtils;

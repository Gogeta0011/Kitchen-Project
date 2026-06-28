#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const config = require("./config.cjs");
const prisma = require("./prisma-client.cjs");
const DatabaseUtils = require("./db-utils.cjs");

// ── Simple CLI for database management (Postgres/Prisma) ────

const commands = {
  help() {
    console.log(`
🍳 Kitchen Platform — Admin CLI

Usage: node admin-cli.cjs <command> [options]

Commands:
  stats              Show database statistics
  backup             Create a backup (JSON)
  restore <file>     Restore from backup file
  export <table>     Export table as CSV
  list-backups       List all backups
  clear              ⚠️  CLEAR ALL DATA (requires confirmation)

Examples:
  node admin-cli.cjs stats
  node admin-cli.cjs backup
  node admin-cli.cjs restore backup-2026-06-27.json
  node admin-cli.cjs export Recipe
  node admin-cli.cjs list-backups
    `);
  },

  async stats(utils) {
    await utils.printStats();
  },

  async backup(utils) {
    const file = await utils.saveJSONToFile();
    utils.cleanupBackups();
    console.log(`\n💾 Backup ready at: ${file}`);
  },

  async restore(utils, file) {
    if (!file) { console.error("❌ Usage: restore <filepath>"); process.exit(1); }
    console.log(`⚠️  This will CLEAR all data and restore from: ${file}`);
    console.log("Type 'yes' to confirm:");
    const answer = await prompt("> ");
    if (answer.toLowerCase() === "yes") {
      try { await utils.restoreFromFile(file); await utils.printStats(); }
      catch (err) { console.error(`❌ Restore failed: ${err.message}`); process.exit(1); }
    } else { console.log("Cancelled."); }
  },

  async export(utils, table) {
    if (!table) {
      console.error("❌ Usage: export <tableName>");
      console.log("\nAvailable tables: User, Recipe, Comment, Rating, RecipeLike, Collection, etc.");
      process.exit(1);
    }
    const csv = await utils.exportTableAsCSV(table);
    if (!csv) { console.log(`ℹ️  Table '${table}' is empty or unknown.`); return; }
    const dir = config.database.backup.dir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${table}-${Date.now()}.csv`);
    fs.writeFileSync(file, csv);
    console.log(`✅ Exported to: ${file}`);
  },

  async listBackups(utils) {
    const backups = utils.listBackups();
    if (backups.length === 0) { console.log("No backups found."); return; }
    console.log("\n📋 Available Backups:");
    backups.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.name}`);
      console.log(`     Size: ${b.size}, Date: ${b.date}`);
    });
    console.log("");
  },

  async clear(utils) {
    console.log("⚠️  WARNING: This will DELETE ALL data!");
    console.log("Type 'DELETE ALL DATA' to confirm:");
    const answer = await prompt("> ");
    if (answer === "DELETE ALL DATA") { await utils.clearAllData(); console.log("✅ All data cleared."); }
    else { console.log("Cancelled."); }
  },
};

function prompt(q) {
  const readline = require("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(q, (a) => { rl.close(); resolve(a); }));
}

// `list-backups` CLI name maps to the listBackups handler.
const ALIASES = { "list-backups": "listBackups" };

async function main() {
  const raw = process.argv[2] || "help";
  const command = ALIASES[raw] || raw;
  const args = process.argv.slice(3);

  if (command === "help" || !commands[command]) {
    commands.help();
    if (raw !== "help" && !commands[command]) { console.error(`\n❌ Unknown command: ${raw}`); process.exit(1); }
    return;
  }

  try {
    const utils = new DatabaseUtils(prisma);
    await commands[command](utils, ...args);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dbPath = path.join(__dirname, "dev.db");
const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, "seed-data.json"), "utf8"));

function esc(str) {
  if (str == null) return "NULL";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

const lines = [
  "DELETE FROM PickerHistory;",
  "DELETE FROM SavedRecipe;",
  "DELETE FROM FavoriteChef;",
  "DELETE FROM Recipe;",
  "DELETE FROM Chef;",
];

for (const chef of seedData.chefs) {
  lines.push(`INSERT INTO Chef (username, name, avatarKey, handle, bio, specialty, followers, following) VALUES (${esc(chef.username)}, ${esc(chef.name)}, ${esc(chef.avatarKey)}, ${esc(chef.handle)}, ${esc(chef.bio)}, ${esc(chef.specialty || "")}, ${chef.followers || 0}, ${chef.following || 0});`);
}

for (const r of seedData.recipes) {
  lines.push(`INSERT INTO Recipe (id, title, imageKey, creatorUsername, rating, reviews, prepTime, cookTime, servings, difficulty, category, cuisine, tagsJson, description, diet, ingredientsJson, stepsJson) VALUES (${esc(r.id)}, ${esc(r.title)}, ${esc(r.imageKey)}, ${esc(r.creatorUsername)}, ${r.rating || 0}, ${r.reviews || 0}, ${esc(r.prepTime)}, ${esc(r.cookTime)}, ${r.servings || 4}, ${esc(r.difficulty)}, ${esc(r.category)}, ${esc(r.cuisine)}, ${esc(JSON.stringify(r.tags || []))}, ${esc(r.description)}, ${esc(r.diet || "Anything")}, ${esc(JSON.stringify(r.ingredients || []))}, ${esc(JSON.stringify(r.steps || []))});`);
}

for (const s of (seedData.savedRecipes || [])) {
  lines.push(`INSERT OR IGNORE INTO SavedRecipe (recipeId, collectionName) VALUES (${esc(s.recipeId)}, ${esc(s.collectionName || "Favorites")});`);
}
for (const f of (seedData.favoriteChefs || [])) {
  lines.push(`INSERT OR IGNORE INTO FavoriteChef (chefUsername) VALUES (${esc(f.chefUsername)});`);
}

const sqlFile = path.join(__dirname, "_seed_tmp.sql");
fs.writeFileSync(sqlFile, lines.join("\n"));
execSync(`sqlite3 "${dbPath}" < "${sqlFile}"`);
fs.unlinkSync(sqlFile);

console.log(`✓ Seeded: ${seedData.chefs.length} chefs, ${seedData.recipes.length} recipes`);

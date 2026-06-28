"use strict";
// Postgres/Prisma seed. Loads chefs → Users (Chef merged in) and recipes with
// normalized ingredients/steps. Idempotent: upserts users, replaces recipes by id.
// Seed users share a known dev password so you can log in as them locally.

const prisma = require("../prisma-client.cjs");
const { hashPassword } = require("../auth.cjs");
const data = require("./seed-data.json");

const SEED_PASSWORD = "seedpass123"; // dev only — log in as any seed chef with this

async function main() {
  const chefs = data.chefs || [];
  const recipes = data.recipes || [];

  // 1) Chefs → Users
  for (const c of chefs) {
    await prisma.user.upsert({
      where: { username: c.username },
      update: {
        name: c.name, avatarKey: c.avatarKey || "elena", handle: c.handle || `@${c.username}`,
        bio: c.bio || "", specialty: c.specialty || "", followers: c.followers || 0, following: c.following || 0,
      },
      create: {
        username: c.username,
        email: `${c.username}@seed.local`,
        password: hashPassword(SEED_PASSWORD),
        emailVerified: true,
        name: c.name, avatarKey: c.avatarKey || "elena", handle: c.handle || `@${c.username}`,
        bio: c.bio || "", specialty: c.specialty || "", followers: c.followers || 0, following: c.following || 0,
      },
    });
  }

  // 2) Recipes (replace by id so steps/ingredients are clean on re-seed)
  for (const r of recipes) {
    const creator = await prisma.user.findUnique({ where: { username: r.creatorUsername } });
    if (!creator) { console.warn(`skip recipe ${r.id}: no creator ${r.creatorUsername}`); continue; }

    await prisma.recipe.deleteMany({ where: { id: r.id } });

    const seen = new Set();
    const ingredientCreates = [];
    let pos = 0;
    for (const ing of r.ingredients || []) {
      const name = String(ing.item || "").trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      const ingredient = await prisma.ingredient.upsert({ where: { name }, update: {}, create: { name } });
      ingredientCreates.push({ ingredient: { connect: { id: ingredient.id } }, quantity: ing.qty ? String(ing.qty) : null, position: pos++ });
    }

    await prisma.recipe.create({
      data: {
        id: r.id,
        title: r.title,
        imageKey: r.imageKey || "heroPasta",
        imageUrl: r.imageUrl || null,
        creator: { connect: { id: creator.id } },
        rating: r.rating || 0,
        reviews: r.reviews || 0,
        prepTime: r.prepTime || "15 min",
        cookTime: r.cookTime || "30 min",
        servings: r.servings || 4,
        difficulty: r.difficulty || "Easy",
        category: r.category || "Dinner",
        cuisine: r.cuisine || "International",
        tags: Array.isArray(r.tags) ? r.tags : [],
        description: r.description || "",
        diet: r.diet || "Anything",
        steps: { create: (r.steps || []).map((t, i) => ({ stepNo: i + 1, text: String(t) })) },
        ingredients: { create: ingredientCreates },
      },
    });
  }

  const [u, rc] = await Promise.all([prisma.user.count(), prisma.recipe.count()]);
  console.log(`✅ Seed complete: ${u} users, ${rc} recipes. Seed login password: ${SEED_PASSWORD}`);
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());

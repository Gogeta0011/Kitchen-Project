"use strict";

const http = require("http");
const {
  hashPassword, verifyPassword, signToken, verifyToken, getTokenFromHeader,
  invalidateToken, isTokenBlacklisted, createCSRFToken, validateCSRFToken,
  generateVerificationToken,
} = require("./auth.cjs");
const { validate, rateLimit, authRateLimit, SECURITY_HEADERS } = require("./middleware.cjs");
const config = require("./config.cjs");
const prisma = require("./prisma-client.cjs");

const PORT = Number(process.env.PORT || 4000);

// ── Cloudinary ─────────────────────────────────────────────
const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_KEY   = process.env.CLOUDINARY_API_KEY    || "";
const CLOUDINARY_SECRET= process.env.CLOUDINARY_API_SECRET || "";

// ── CORS / Response helpers ────────────────────────────────
const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-CSRF-Token",
  ...SECURITY_HEADERS,
};

function send(res, status, data, extraHeaders = {}) {
  res.writeHead(status, { ...CORS, ...extraHeaders });
  res.end(JSON.stringify(data));
}

async function readBody(req, limit = 5_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => { size += c.length; if (size > limit) { req.destroy(); reject(new Error("Body too large")); } else chunks.push(c); });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

// ── Auth helpers ───────────────────────────────────────────
// `opts.skipCSRF` is only for the handful of endpoints where CSRF
// enforcement would be a chicken-and-egg problem (e.g. fetching the
// CSRF token itself, or logout when we want it to always succeed).
async function requireAuth(req, opts = {}) {
  const token = getTokenFromHeader(req);
  if (!token) throw Object.assign(new Error("Authentication required"), { status: 401 });
  if (isTokenBlacklisted(token)) throw Object.assign(new Error("Session expired, please log in again"), { status: 401 });
  const payload = verifyToken(token);
  if (!payload) throw Object.assign(new Error("Invalid or expired token"), { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw Object.assign(new Error("User not found"), { status: 401 });
  user.__token = token; // so handlers can blacklist it on logout

  if (!opts.skipCSRF && ["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    requireCSRF(req, user);
  }
  return user;
}

async function requireAdmin(req, opts = {}) {
  const user = await requireAuth(req, opts);
  if (!user.isAdmin) throw Object.assign(new Error("Admin only"), { status: 403 });
  return user;
}

function requireCSRF(req, user) {
  if (!config.security.csrfEnabled) return;
  const token = req.headers["x-csrf-token"];
  if (!validateCSRFToken(user.id, token)) {
    throw Object.assign(new Error("CSRF validation failed. Refresh and try again."), { status: 403 });
  }
}

// Lightweight audit log for sensitive actions. Never breaks the request.
async function auditLog(userId, action, resource, status, req) {
  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim()
      || req.socket?.remoteAddress || "unknown";
    await prisma.auditLog.create({
      data: {
        userId: userId || null, action, resource: resource || null, status,
        ipAddress: ip, userAgent: req.headers["user-agent"] || null,
      },
    });
  } catch (e) {
    console.warn("Audit log write failed:", e.message);
  }
}

// ── Packers ────────────────────────────────────────────────
// Recipe rows are fetched with this include so the packer can assemble the
// normalized ingredients/steps back into the {qty,item}[] / string[] shapes
// the frontend expects.
const RECIPE_INCLUDE = {
  creator: true,
  steps: true,
  ingredients: { include: { ingredient: true } },
  _count: { select: { likes: true } },
};

async function packChef(user) {
  if (!user) return null;
  const recipeCount = await prisma.recipe.count({ where: { creatorId: user.id, deletedAt: null } });
  return {
    username: user.username, name: user.name, avatarKey: user.avatarKey,
    avatarUrl: user.avatarUrl || null, coverUrl: user.coverUrl || null,
    handle: user.handle, bio: user.bio, specialty: user.specialty,
    followers: user.followers, following: user.following, recipeCount,
  };
}

// packRecipe assembles a fetched-with-RECIPE_INCLUDE row into the API shape.
async function packRecipe(r, extras = {}) {
  if (!r) return null;
  const ingredients = [...(r.ingredients || [])]
    .sort((a, b) => a.position - b.position)
    .map((ri) => ({ qty: ri.quantity || "", item: ri.ingredient?.name || "" }));
  const steps = [...(r.steps || [])].sort((a, b) => a.stepNo - b.stepNo).map((s) => s.text);
  return {
    id: r.id, title: r.title,
    imageKey: r.imageKey, imageUrl: r.imageUrl || null, image: r.imageUrl || null,
    creatorUsername: r.creator?.username, userId: r.creatorId,
    rating: r.rating, reviews: r.reviews,
    prepTime: r.prepTime, cookTime: r.cookTime, servings: r.servings,
    difficulty: r.difficulty, category: r.category, cuisine: r.cuisine,
    description: r.description, diet: r.diet,
    tags: r.tags || [],
    ingredients, steps,
    likesCount: r._count?.likes ?? 0,
    createdAt: r.createdAt, deletedAt: r.deletedAt || null,
    ...extras,
  };
}

// packRecipe + the creator "chef" profile (the old getRecipeFull).
async function fullRecipe(r) {
  if (!r) return null;
  const p = await packRecipe(r);
  p.creator = await packChef(r.creator);
  return p;
}

async function packComment(c) {
  // c is fetched with { user: true }
  const u = c.user;
  return {
    id: c.id, recipeId: c.recipeId, userId: c.userId, body: c.body, createdAt: c.createdAt,
    author: {
      username: u?.username,
      name: u?.name || u?.username,
      avatarUrl: u?.avatarUrl || null,
      avatarKey: u?.avatarKey || null,
    },
  };
}

// ── Notify helper ──────────────────────────────────────────
async function notify({ userId, type, actorId, recipeId, body }) {
  if (userId === actorId) return; // don't notify yourself
  await prisma.notification.create({
    data: { userId, type, actorId: actorId || null, recipeId: recipeId || null, body },
  });
}

// ── Recipe scoring (picker) ────────────────────────────────
function minutesFrom(v) { if (!v) return 9999; const m = String(v).match(/\d+/); return m ? +m[0] : 9999; }
function scoreRecipe(recipe, prefs) {
  const text = [recipe.title, recipe.category, recipe.cuisine, ...(recipe.tags||[]), recipe.description, recipe.diet].join(" ").toLowerCase();
  const total = minutesFrom(recipe.prepTime) + minutesFrom(recipe.cookTime);
  const want = minutesFrom(prefs.timeAvailable);
  let score = 0; const reasons = [];
  if (prefs.timeAvailable === "Weekend" || want >= total) { score += 4; reasons.push(`Fits your ${prefs.timeAvailable || "available"} time.`); }
  if (prefs.mealType && text.includes(String(prefs.mealType).toLowerCase())) { score += 3; reasons.push(`Matches ${prefs.mealType}.`); }
  if (prefs.dietPreference && prefs.dietPreference !== "Anything" && text.includes(String(prefs.dietPreference).toLowerCase())) { score += 3; reasons.push(`Works with your ${prefs.dietPreference} preference.`); }
  const avail = Array.isArray(prefs.ingredientsAvailable) ? prefs.ingredientsAvailable : String(prefs.ingredientsAvailable||"").split(",");
  const hit = avail.find(i => { const c = String(i).trim().toLowerCase(); return c && text.includes(c); });
  if (hit) { score += 2; reasons.push(`Uses ${hit}.`); }
  return { score, reasons: reasons.length ? reasons.slice(0,4) : ["Balanced pick based on your selections."] };
}

// ── Cloudinary signed upload ───────────────────────────────
async function cloudinaryUpload(base64Data, folder = "kitchen") {
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_KEY || !CLOUDINARY_SECRET)
    throw new Error("Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.");

  const crypto = require("crypto");
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHmac("sha256", CLOUDINARY_SECRET).update(paramsToSign).digest("hex");

  const FormData = require("form-data");
  const form = new FormData();
  form.append("file", base64Data);
  form.append("api_key", CLOUDINARY_KEY);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);

  const https = require("https");
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.cloudinary.com",
      path: `/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
      method: "POST",
      headers: form.getHeaders(),
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { const j = JSON.parse(data); j.secure_url ? resolve(j) : reject(new Error(j.error?.message || "Upload failed")); }
        catch { reject(new Error("Bad Cloudinary response")); }
      });
    });
    req.on("error", reject);
    form.pipe(req);
  });
}

// Resolve a "chef username" to its User row (Chef merged into User).
function userByUsername(username) {
  return prisma.user.findUnique({ where: { username } });
}

// ── Main handler ───────────────────────────────────────────
async function handle(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, {});

  rateLimit(req, 200, 60_000); // 200 req/min per IP

  const url = new URL(req.url, `http://localhost`);
  const path_ = url.pathname;
  const M = req.method;

  try {

    // ── Health ─────────────────────────────────────────────
    if (M === "GET" && path_ === "/api/health") {
      const [recipe, user, comment, rating, recipelike, collection, notification] = await Promise.all([
        prisma.recipe.count(), prisma.user.count(), prisma.comment.count(),
        prisma.rating.count(), prisma.recipeLike.count(), prisma.collection.count(),
        prisma.notification.count(),
      ]);
      return send(res, 200, { ok: true, counts: { recipe, user, comment, rating, recipelike, collection, notification } });
    }

    // ═══════════════════════════════════ AUTH ═══════════════
    if (M === "POST" && path_ === "/api/auth/signup") {
      const rawBody = await readBody(req);
      const v = validate.signup(rawBody);
      if (typeof v === "string") return send(res, 400, { error: v });
      const { username, email, password } = v;
      authRateLimit(req, email, config.rateLimit.authLimit, config.rateLimit.authWindow);
      if (!username?.trim()) return send(res, 400, { error: "username required" });
      if (!email?.includes("@")) return send(res, 400, { error: "valid email required" });
      if (!password || password.length < 6) return send(res, 400, { error: "password must be 6+ chars" });

      const uname = username.trim();
      const mail = email.trim();
      const dupe = await prisma.user.findFirst({ where: { OR: [{ username: uname }, { email: mail }] } });
      if (dupe) return send(res, 409, { error: "username or email already taken" });

      const verificationRequired = config.email.verificationRequired;
      const verificationToken = verificationRequired ? generateVerificationToken() : null;
      const verificationExpires = verificationRequired ? new Date(Date.now() + config.email.tokenExpiryMs) : null;

      // Chef merged into User: profile fields default on the User row.
      const created = await prisma.user.create({
        data: {
          username: uname, email: mail, password: hashPassword(password),
          emailVerified: !verificationRequired,
          verificationToken, verificationTokenExpires: verificationExpires,
          name: uname, avatarKey: "elena", handle: `@${uname}`,
          bio: "Home cook", specialty: "Home cooking",
        },
      });

      await auditLog(created.id, "SIGNUP", created.id, "success", req);

      if (verificationRequired) {
        if (config.isDev) console.log(`[dev] Verification token for ${mail}: ${verificationToken}`);
        return send(res, 201, {
          id: created.id, username: uname, email: mail,
          requiresVerification: true,
          message: "Account created. Please verify your email before logging in.",
        });
      }
      return send(res, 201, { id: created.id, username: uname, email: mail, token: signToken(created.id) });
    }

    if (M === "POST" && path_ === "/api/auth/login") {
      const rawLoginBody = await readBody(req);
      const vl = validate.login(rawLoginBody);
      if (typeof vl === "string") return send(res, 400, { error: vl });
      const { username, password } = vl;
      authRateLimit(req, username, config.rateLimit.authLimit, config.rateLimit.authWindow);

      const user = await prisma.user.findUnique({ where: { username: username?.trim() } });
      const validPassword = user && verifyPassword(password, user.password);
      if (!validPassword) {
        await auditLog(user?.id, "LOGIN", user?.id, "failure", req);
        return send(res, 401, { error: "Invalid credentials" });
      }
      if (config.email.verificationRequired && !user.emailVerified) {
        return send(res, 403, { error: "Please verify your email before logging in", requiresVerification: true });
      }
      await auditLog(user.id, "LOGIN", user.id, "success", req);
      return send(res, 200, { id: user.id, username: user.username, email: user.email, isAdmin: !!user.isAdmin, token: signToken(user.id) });
    }

    if (M === "POST" && path_ === "/api/auth/verify-email") {
      const { token } = await readBody(req);
      if (!token) return send(res, 400, { error: "token required" });
      const user = await prisma.user.findFirst({
        where: { verificationToken: token, verificationTokenExpires: { gt: new Date() } },
      });
      if (!user) return send(res, 400, { error: "Invalid or expired verification link" });
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, verificationToken: null, verificationTokenExpires: null },
      });
      await auditLog(user.id, "VERIFY_EMAIL", user.id, "success", req);
      return send(res, 200, { ok: true, message: "Email verified! You can now log in." });
    }

    if (M === "POST" && path_ === "/api/auth/logout") {
      const user = await requireAuth(req, { skipCSRF: true });
      invalidateToken(user.__token);
      await auditLog(user.id, "LOGOUT", user.id, "success", req);
      return send(res, 200, { ok: true });
    }

    if (M === "GET" && path_ === "/api/csrf-token") {
      const user = await requireAuth(req);
      return send(res, 200, { token: createCSRFToken(user.id) });
    }

    if (M === "GET" && path_ === "/api/auth/me") {
      const user = await requireAuth(req);
      return send(res, 200, { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl || null, isAdmin: !!user.isAdmin });
    }

    if (M === "PUT" && path_ === "/api/auth/profile") {
      const user = await requireAuth(req);
      const { bio, specialty, name, avatarImageBase64 } = await readBody(req);
      const data = {};
      let avatarUrl = null;
      if (avatarImageBase64) {
        const result = await cloudinaryUpload(avatarImageBase64, "kitchen/avatars");
        avatarUrl = result.secure_url;
        data.avatarUrl = avatarUrl;
      }
      if (bio !== undefined) data.bio = bio;
      if (specialty !== undefined) data.specialty = specialty;
      if (name !== undefined) data.name = name;
      if (Object.keys(data).length) await prisma.user.update({ where: { id: user.id }, data });
      return send(res, 200, { ok: true, avatarUrl });
    }

    // ═══════════════════════════════ IMAGE UPLOAD ═══════════
    if (M === "POST" && path_ === "/api/upload-image") {
      await requireAuth(req);
      const body = await readBody(req, 20_000_000);
      const { imageBase64, folder = "kitchen/recipes" } = body;
      if (!imageBase64) return send(res, 400, { error: "imageBase64 required" });
      const result = await cloudinaryUpload(imageBase64, folder);
      return send(res, 200, { url: result.secure_url, publicId: result.public_id });
    }

    // ═══════════════════════════════════ RECIPES ════════════
    if (M === "GET" && path_ === "/api/recipes") {
      const q = url.searchParams.get("q") || "";
      const category = url.searchParams.get("category") || "";
      const chef = url.searchParams.get("chef") || "";
      const where = { deletedAt: null };
      if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }];
      if (category && category !== "All") where.category = category;
      if (chef) where.creator = { username: chef };
      const rows = await prisma.recipe.findMany({
        where, include: RECIPE_INCLUDE,
        orderBy: [{ rating: "desc" }, { createdAt: "desc" }], take: 60,
      });
      return send(res, 200, await Promise.all(rows.map(fullRecipe)));
    }

    if (M === "GET" && path_.match(/^\/api\/recipes\/[^/]+$/)) {
      const id = decodeURIComponent(path_.split("/").pop());
      const row = await prisma.recipe.findFirst({ where: { id, deletedAt: null }, include: RECIPE_INCLUDE });
      if (!row) return send(res, 404, { error: "Recipe not found" });
      const recipe = await fullRecipe(row);
      recipe.likesCount = row._count?.likes ?? 0;
      recipe.commentCount = await prisma.comment.count({ where: { recipeId: id } });
      return send(res, 200, recipe);
    }

    if (M === "POST" && path_ === "/api/recipes") {
      const user = await requireAuth(req);
      const rawRecipe = await readBody(req);
      const body = validate.recipe(rawRecipe);
      if (typeof body === "string") return send(res, 400, { error: body });
      const tags = Array.isArray(body.tags) ? body.tags : String(body.tags||"").split(",").map(t=>t.trim()).filter(Boolean);

      // Normalize ingredients ({qty,item}[]) + steps (string[]) into real rows.
      const rawIngredients = Array.isArray(body.ingredients) ? body.ingredients : [];
      const seen = new Set();
      const ingredientCreates = [];
      let pos = 0;
      for (const ing of rawIngredients) {
        const name = String(ing?.item || "").trim();
        if (!name || seen.has(name.toLowerCase())) continue; // dedupe within a recipe
        seen.add(name.toLowerCase());
        const ingredient = await prisma.ingredient.upsert({ where: { name }, update: {}, create: { name } });
        ingredientCreates.push({ ingredient: { connect: { id: ingredient.id } }, quantity: ing.qty ? String(ing.qty) : null, position: pos++ });
      }
      const stepCreates = (Array.isArray(body.steps) ? body.steps : [])
        .map((t, i) => ({ stepNo: i + 1, text: String(t) }));

      const created = await prisma.recipe.create({
        data: {
          title: body.title.trim(),
          imageKey: body.imageKey || "heroPasta",
          imageUrl: body.imageUrl || null,
          creator: { connect: { id: user.id } },
          prepTime: body.prepTime || "15 min",
          cookTime: body.cookTime || "30 min",
          servings: Number(body.servings) || 4,
          difficulty: body.difficulty || "Easy",
          category: body.category || "Dinner",
          cuisine: body.cuisine || "International",
          tags,
          description: body.description || "",
          diet: body.diet || "Anything",
          steps: { create: stepCreates },
          ingredients: { create: ingredientCreates },
        },
        include: RECIPE_INCLUDE,
      });
      return send(res, 201, await fullRecipe(created));
    }

    if (M === "DELETE" && path_.match(/^\/api\/recipes\/[^/]+$/)) {
      const user = await requireAuth(req);
      const id = decodeURIComponent(path_.split("/").pop());
      const recipe = await prisma.recipe.findUnique({ where: { id } });
      if (!recipe) return send(res, 404, { error: "Not found" });
      if (recipe.creatorId !== user.id && !user.isAdmin) return send(res, 403, { error: "Not your recipe" });
      await prisma.recipe.update({ where: { id }, data: { deletedAt: new Date() } });
      await auditLog(user.id, "DELETE_RECIPE", id, "success", req);
      return send(res, 200, { removed: true });
    }

    // ═══════════════════════════════════ COMMENTS ═══════════
    if (M === "GET" && path_.match(/^\/api\/recipes\/[^/]+\/comments$/)) {
      const recipeId = decodeURIComponent(path_.split("/")[3]);
      const rows = await prisma.comment.findMany({ where: { recipeId }, include: { user: true }, orderBy: { createdAt: "asc" } });
      return send(res, 200, await Promise.all(rows.map(packComment)));
    }

    if (M === "POST" && path_.match(/^\/api\/recipes\/[^/]+\/comments$/)) {
      const user = await requireAuth(req);
      const recipeId = decodeURIComponent(path_.split("/")[3]);
      const rawComment = await readBody(req);
      const vc = validate.comment(rawComment);
      if (typeof vc === "string") return send(res, 400, { error: vc });
      const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, deletedAt: null } });
      if (!recipe) return send(res, 404, { error: "Recipe not found" });
      const created = await prisma.comment.create({
        data: { recipeId, userId: user.id, body: vc.body.trim() },
        include: { user: true },
      });
      if (recipe.creatorId && recipe.creatorId !== user.id) {
        await notify({ userId: recipe.creatorId, type: "comment", actorId: user.id, recipeId, body: `${user.username} commented on "${recipe.title}"` });
      }
      return send(res, 201, await packComment(created));
    }

    if (M === "DELETE" && path_.match(/^\/api\/comments\/[^/]+$/)) {
      const user = await requireAuth(req);
      const id = decodeURIComponent(path_.split("/").pop());
      const comment = await prisma.comment.findUnique({ where: { id } });
      if (!comment) return send(res, 404, { error: "Not found" });
      if (comment.userId !== user.id && !user.isAdmin) return send(res, 403, { error: "Not your comment" });
      await prisma.comment.delete({ where: { id } });
      return send(res, 200, { removed: true });
    }

    // ═══════════════════════════════════ RATINGS ════════════
    if (M === "POST" && path_.match(/^\/api\/recipes\/[^/]+\/rate$/)) {
      const user = await requireAuth(req);
      const recipeId = decodeURIComponent(path_.split("/")[3]);
      const rawRating = await readBody(req);
      const vr = validate.rating(rawRating);
      if (typeof vr === "string") return send(res, 400, { error: vr });
      const { stars } = vr;
      const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, deletedAt: null } });
      if (!recipe) return send(res, 404, { error: "Recipe not found" });

      const existing = await prisma.rating.findUnique({ where: { recipeId_userId: { recipeId, userId: user.id } } });
      await prisma.rating.upsert({
        where: { recipeId_userId: { recipeId, userId: user.id } },
        update: { stars },
        create: { recipeId, userId: user.id, stars },
      });
      if (!existing && recipe.creatorId && recipe.creatorId !== user.id) {
        await notify({ userId: recipe.creatorId, type: "rating", actorId: user.id, recipeId, body: `${user.username} rated "${recipe.title}" ${stars} stars` });
      }
      const agg = await prisma.rating.aggregate({ where: { recipeId }, _avg: { stars: true }, _count: true });
      const avg = Math.round((agg._avg.stars || 0) * 10) / 10;
      await prisma.recipe.update({ where: { id: recipeId }, data: { rating: avg, reviews: agg._count } });
      return send(res, 200, { rating: avg, reviews: agg._count, yourRating: stars });
    }

    if (M === "GET" && path_.match(/^\/api\/recipes\/[^/]+\/my-rating$/)) {
      const user = await requireAuth(req);
      const recipeId = decodeURIComponent(path_.split("/")[3]);
      const r = await prisma.rating.findUnique({ where: { recipeId_userId: { recipeId, userId: user.id } } });
      return send(res, 200, { stars: r?.stars || null });
    }

    // ═══════════════════════════════════ LIKES ══════════════
    if (M === "POST" && path_.match(/^\/api\/recipes\/[^/]+\/like$/)) {
      const user = await requireAuth(req);
      const recipeId = decodeURIComponent(path_.split("/")[3]);
      const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, deletedAt: null } });
      if (!recipe) return send(res, 404, { error: "Not found" });
      const existing = await prisma.recipeLike.findUnique({ where: { recipeId_userId: { recipeId, userId: user.id } } });
      let liked;
      if (existing) {
        await prisma.recipeLike.delete({ where: { id: existing.id } });
        liked = false;
      } else {
        await prisma.recipeLike.create({ data: { recipeId, userId: user.id } });
        if (recipe.creatorId && recipe.creatorId !== user.id) {
          await notify({ userId: recipe.creatorId, type: "like", actorId: user.id, recipeId, body: `${user.username} liked "${recipe.title}"` });
        }
        liked = true;
      }
      const count = await prisma.recipeLike.count({ where: { recipeId } });
      return send(res, 200, { liked, likesCount: count });
    }

    if (M === "GET" && path_.match(/^\/api\/recipes\/[^/]+\/like$/)) {
      const token = getTokenFromHeader(req);
      const recipeId = decodeURIComponent(path_.split("/")[3]);
      const count = await prisma.recipeLike.count({ where: { recipeId } });
      let liked = false;
      if (token) {
        const payload = verifyToken(token);
        if (payload) liked = !!(await prisma.recipeLike.findUnique({ where: { recipeId_userId: { recipeId, userId: payload.userId } } }));
      }
      return send(res, 200, { liked, likesCount: count });
    }

    // ═══════════════════════════════════ COLLECTIONS ════════
    if (M === "GET" && path_ === "/api/collections") {
      const user = await requireAuth(req);
      const cols = await prisma.collection.findMany({
        where: { userId: user.id },
        include: { _count: { select: { recipes: true } } },
        orderBy: { createdAt: "desc" },
      });
      return send(res, 200, cols.map(c => ({ id: c.id, userId: c.userId, name: c.name, createdAt: c.createdAt, recipeCount: c._count.recipes })));
    }

    if (M === "POST" && path_ === "/api/collections") {
      const user = await requireAuth(req);
      const rawCol = await readBody(req);
      const vcol = validate.collection(rawCol);
      if (typeof vcol === "string") return send(res, 400, { error: vcol });
      const name = vcol.name.trim();
      const existing = await prisma.collection.findUnique({ where: { userId_name: { userId: user.id, name } } });
      if (existing) return send(res, 409, { error: "Collection already exists" });
      const created = await prisma.collection.create({ data: { userId: user.id, name } });
      return send(res, 201, { id: created.id, userId: created.userId, name: created.name, createdAt: created.createdAt });
    }

    if (M === "DELETE" && path_.match(/^\/api\/collections\/[^/]+$/)) {
      const user = await requireAuth(req);
      const id = decodeURIComponent(path_.split("/").pop());
      const col = await prisma.collection.findUnique({ where: { id } });
      if (!col) return send(res, 404, { error: "Not found" });
      if (col.userId !== user.id) return send(res, 403, { error: "Not yours" });
      await prisma.collection.delete({ where: { id } });
      return send(res, 200, { removed: true });
    }

    if (M === "GET" && path_.match(/^\/api\/collections\/[^/]+\/recipes$/)) {
      const user = await requireAuth(req);
      const colId = decodeURIComponent(path_.split("/")[3]);
      const col = await prisma.collection.findFirst({ where: { id: colId, userId: user.id } });
      if (!col) return send(res, 404, { error: "Not found" });
      const links = await prisma.collectionRecipe.findMany({
        where: { collectionId: colId, recipe: { deletedAt: null } },
        include: { recipe: { include: RECIPE_INCLUDE } },
        orderBy: { addedAt: "desc" },
      });
      const recipes = await Promise.all(links.map(l => fullRecipe(l.recipe)));
      return send(res, 200, { collection: col, recipes });
    }

    if (M === "POST" && path_.match(/^\/api\/collections\/[^/]+\/recipes$/)) {
      const user = await requireAuth(req);
      const colId = decodeURIComponent(path_.split("/")[3]);
      const { recipeId } = await readBody(req);
      if (!recipeId) return send(res, 400, { error: "recipeId required" });
      const col = await prisma.collection.findFirst({ where: { id: colId, userId: user.id } });
      if (!col) return send(res, 404, { error: "Collection not found" });
      if (!(await prisma.recipe.findUnique({ where: { id: recipeId } }))) return send(res, 404, { error: "Recipe not found" });
      await prisma.collectionRecipe.upsert({
        where: { collectionId_recipeId: { collectionId: colId, recipeId } },
        update: {},
        create: { collectionId: colId, recipeId },
      });
      return send(res, 201, { ok: true });
    }

    if (M === "DELETE" && path_.match(/^\/api\/collections\/[^/]+\/recipes\/[^/]+$/)) {
      const user = await requireAuth(req);
      const parts = path_.split("/");
      const colId = decodeURIComponent(parts[3]);
      const recipeId = decodeURIComponent(parts[5]);
      const col = await prisma.collection.findFirst({ where: { id: colId, userId: user.id } });
      if (!col) return send(res, 403, { error: "Not yours" });
      await prisma.collectionRecipe.deleteMany({ where: { collectionId: colId, recipeId } });
      return send(res, 200, { removed: true });
    }

    // ═══════════════════════════ SAVED RECIPES (legacy) ═════
    if (M === "GET" && path_ === "/api/saved-recipes") {
      const user = await requireAuth(req);
      const rows = await prisma.savedRecipe.findMany({
        where: { userId: user.id, recipe: { deletedAt: null } },
        include: { recipe: { include: RECIPE_INCLUDE } },
        orderBy: { savedAt: "desc" },
      });
      return send(res, 200, await Promise.all(rows.map(async (row) => ({
        id: row.id, recipeId: row.recipeId, collectionName: row.collectionName, savedAt: row.savedAt,
        recipe: await fullRecipe(row.recipe),
      }))));
    }

    if (M === "POST" && path_ === "/api/saved-recipes") {
      const user = await requireAuth(req);
      const body = await readBody(req);
      if (!body.recipeId) return send(res, 400, { error: "recipeId required" });
      const recipe = await prisma.recipe.findUnique({ where: { id: body.recipeId }, include: RECIPE_INCLUDE });
      if (!recipe) return send(res, 404, { error: "Recipe not found" });
      const collectionName = body.collectionName || "Favorites";
      const saved = await prisma.savedRecipe.upsert({
        where: { userId_recipeId: { userId: user.id, recipeId: body.recipeId } },
        update: { collectionName },
        create: { userId: user.id, recipeId: body.recipeId, collectionName },
      });
      return send(res, 201, { ...saved, recipe: await fullRecipe(recipe) });
    }

    if (M === "DELETE" && path_.match(/^\/api\/saved-recipes\/[^/]+$/)) {
      const user = await requireAuth(req);
      const idOrRecipeId = decodeURIComponent(path_.split("/").pop());
      await prisma.savedRecipe.deleteMany({ where: { userId: user.id, OR: [{ id: idOrRecipeId }, { recipeId: idOrRecipeId }] } });
      return send(res, 200, { removed: true });
    }

    // ═══════════════════════ FAVORITE CHEFS / FOLLOWS ═══════
    if (M === "GET" && path_ === "/api/favorite-chefs") {
      const user = await requireAuth(req);
      const favs = await prisma.follow.findMany({
        where: { followerId: user.id },
        include: { following: true },
        orderBy: { followedAt: "desc" },
      });
      return send(res, 200, await Promise.all(favs.map(async (fav) => {
        const recent = await prisma.recipe.findMany({
          where: { creatorId: fav.followingId, deletedAt: null },
          include: RECIPE_INCLUDE, orderBy: { createdAt: "desc" }, take: 2,
        });
        return {
          id: fav.id, chefUsername: fav.following.username, followedAt: fav.followedAt,
          chef: await packChef(fav.following),
          recentUploads: await Promise.all(recent.map(fullRecipe)),
        };
      })));
    }

    if (M === "POST" && path_ === "/api/favorite-chefs") {
      const user = await requireAuth(req);
      const { chefUsername } = await readBody(req);
      if (!chefUsername) return send(res, 400, { error: "chefUsername required" });
      const chefUser = await userByUsername(chefUsername);
      if (!chefUser) return send(res, 404, { error: "Chef not found" });
      let fav = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: user.id, followingId: chefUser.id } } });
      if (!fav) {
        fav = await prisma.follow.create({ data: { followerId: user.id, followingId: chefUser.id } });
        await prisma.user.update({ where: { id: chefUser.id }, data: { followers: { increment: 1 } } });
        await notify({ userId: chefUser.id, type: "follow", actorId: user.id, body: `${user.username} started following you` });
      }
      const refreshed = await prisma.user.findUnique({ where: { id: chefUser.id } });
      return send(res, 201, { id: fav.id, chefUsername, followedAt: fav.followedAt, chef: await packChef(refreshed) });
    }

    if (M === "DELETE" && path_.match(/^\/api\/favorite-chefs\/[^/]+$/)) {
      const user = await requireAuth(req);
      const idOrUsername = decodeURIComponent(path_.split("/").pop());
      // match by Follow.id, or by the followed user's username
      const target = await prisma.follow.findFirst({
        where: { followerId: user.id, OR: [{ id: idOrUsername }, { following: { username: idOrUsername } }] },
      });
      if (target) {
        await prisma.follow.delete({ where: { id: target.id } });
        const chefUser = await prisma.user.findUnique({ where: { id: target.followingId } });
        if (chefUser) await prisma.user.update({ where: { id: chefUser.id }, data: { followers: Math.max(0, chefUser.followers - 1) } });
      }
      return send(res, 200, { removed: true });
    }

    // ═══════════════════════════════════ NOTIFICATIONS ══════
    if (M === "GET" && path_ === "/api/notifications") {
      const user = await requireAuth(req);
      const [rows, unread] = await Promise.all([
        prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.notification.count({ where: { userId: user.id, read: false } }),
      ]);
      return send(res, 200, { notifications: rows, unread });
    }

    if (M === "POST" && path_ === "/api/notifications/read-all") {
      const user = await requireAuth(req);
      await prisma.notification.updateMany({ where: { userId: user.id }, data: { read: true } });
      return send(res, 200, { ok: true });
    }

    if (M === "POST" && path_.match(/^\/api\/notifications\/[^/]+\/read$/)) {
      const user = await requireAuth(req);
      const id = decodeURIComponent(path_.split("/")[3]);
      await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
      return send(res, 200, { ok: true });
    }

    // ═══════════════════════════════════ CHEFS (public) ═════
    if (M === "GET" && path_ === "/api/chefs") {
      const users = await prisma.user.findMany({ orderBy: { followers: "desc" } });
      return send(res, 200, await Promise.all(users.map(packChef)));
    }

    if (M === "GET" && path_.match(/^\/api\/chefs\/[^/]+$/)) {
      const username = decodeURIComponent(path_.split("/").pop());
      const chefUser = await userByUsername(username);
      if (!chefUser) return send(res, 404, { error: "Chef not found" });
      const recipes = await prisma.recipe.findMany({ where: { creatorId: chefUser.id, deletedAt: null }, include: RECIPE_INCLUDE, orderBy: { createdAt: "desc" } });
      let isFollowing = false;
      const token = getTokenFromHeader(req);
      if (token) {
        const p = verifyToken(token);
        if (p) isFollowing = !!(await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: p.userId, followingId: chefUser.id } } }));
      }
      return send(res, 200, { chef: await packChef(chefUser), recipes: await Promise.all(recipes.map(fullRecipe)), isFollowing });
    }

    // ═══════════════════════════════════ RECIPE PICKER ══════
    if (M === "POST" && path_ === "/api/pick-recipe") {
      const prefs = await readBody(req);
      const all = await prisma.recipe.findMany({ where: { deletedAt: null }, include: RECIPE_INCLUDE });
      if (!all.length) return send(res, 404, { error: "No recipes found" });
      const packed = await Promise.all(all.map(packRecipe));
      const ranked = packed
        .map((p, i) => ({ raw: all[i], ...scoreRecipe(p, prefs) }))
        .sort((a, b) => b.score - a.score || a.raw.title.localeCompare(b.raw.title));
      const top = ranked[0];
      return send(res, 200, {
        pickedRecipe: await fullRecipe(top.raw),
        backupRecipes: await Promise.all(ranked.slice(1, 4).map(x => fullRecipe(x.raw))),
        whyPicked: top.reasons,
      });
    }

    // ═══════════════════════════════════ ADMIN ══════════════
    if (M === "GET" && path_ === "/api/admin/stats") {
      await requireAdmin(req);
      const [Recipe, User, Comment, Rating, RecipeLike, Collection, Notification, FavoriteChef, deletedRecipes] = await Promise.all([
        prisma.recipe.count(), prisma.user.count(), prisma.comment.count(), prisma.rating.count(),
        prisma.recipeLike.count(), prisma.collection.count(), prisma.notification.count(),
        prisma.follow.count(), prisma.recipe.count({ where: { deletedAt: { not: null } } }),
      ]);
      return send(res, 200, { Recipe, User, Comment, Rating, RecipeLike, Collection, Notification, FavoriteChef, deletedRecipes });
    }

    if (M === "GET" && path_ === "/api/admin/users") {
      await requireAdmin(req);
      const users = await prisma.user.findMany({
        select: { id: true, username: true, email: true, isAdmin: true, avatarUrl: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      return send(res, 200, users);
    }

    if (M === "POST" && path_.match(/^\/api\/admin\/users\/[^/]+\/toggle-admin$/)) {
      const admin = await requireAdmin(req);
      const userId = decodeURIComponent(path_.split("/")[4]);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return send(res, 404, { error: "User not found" });
      await prisma.user.update({ where: { id: userId }, data: { isAdmin: !user.isAdmin } });
      await auditLog(admin.id, "TOGGLE_ADMIN", userId, "success", req);
      return send(res, 200, { isAdmin: !user.isAdmin });
    }

    if (M === "DELETE" && path_.match(/^\/api\/admin\/recipes\/[^/]+$/)) {
      const admin = await requireAdmin(req);
      const id = decodeURIComponent(path_.split("/").pop());
      await prisma.recipe.update({ where: { id }, data: { deletedAt: new Date() } }).catch(() => {});
      await auditLog(admin.id, "ADMIN_DELETE_RECIPE", id, "success", req);
      return send(res, 200, { removed: true });
    }

    if (M === "POST" && path_.match(/^\/api\/admin\/recipes\/[^/]+\/restore$/)) {
      await requireAdmin(req);
      const id = decodeURIComponent(path_.split("/")[4]);
      await prisma.recipe.update({ where: { id }, data: { deletedAt: null } }).catch(() => {});
      return send(res, 200, { restored: true });
    }

    if (M === "DELETE" && path_.match(/^\/api\/admin\/comments\/[^/]+$/)) {
      await requireAdmin(req);
      const id = decodeURIComponent(path_.split("/").pop());
      await prisma.comment.delete({ where: { id } }).catch(() => {});
      return send(res, 200, { removed: true });
    }

    if (M === "GET" && path_ === "/api/admin/recipes") {
      await requireAdmin(req);
      const rows = await prisma.recipe.findMany({ include: RECIPE_INCLUDE, orderBy: { createdAt: "desc" } });
      return send(res, 200, await Promise.all(rows.map(fullRecipe)));
    }

    // ═══════════════════════════ ADMIN DATA MANAGEMENT ══════
    if (M === "POST" && path_ === "/api/admin/backup") {
      await requireAdmin(req);
      const DatabaseUtils = require("./db-utils.cjs");
      const utils = new DatabaseUtils(prisma);
      const file = await utils.saveJSONToFile();
      await utils.cleanupBackups();
      return send(res, 200, { ok: true, file, message: "Backup created" });
    }

    if (M === "GET" && path_ === "/api/admin/backups") {
      await requireAdmin(req);
      const DatabaseUtils = require("./db-utils.cjs");
      const backups = new DatabaseUtils(prisma).listBackups();
      return send(res, 200, { backups });
    }

    if (M === "POST" && path_.match(/^\/api\/admin\/restore$/)) {
      await requireAdmin(req);
      const { filename } = await readBody(req);
      if (!filename) return send(res, 400, { error: "filename required" });
      try {
        const DatabaseUtils = require("./db-utils.cjs");
        await new DatabaseUtils(prisma).restoreFromFile(filename);
        return send(res, 200, { ok: true, message: "Restore complete" });
      } catch (err) {
        return send(res, 500, { error: err.message });
      }
    }

    if (M === "GET" && path_.match(/^\/api\/admin\/export\/[^/]+$/)) {
      await requireAdmin(req);
      const table = decodeURIComponent(path_.split("/").pop());
      const DatabaseUtils = require("./db-utils.cjs");
      const csv = await new DatabaseUtils(prisma).exportTableAsCSV(table);
      if (!csv) return send(res, 404, { error: "Table empty or not found" });
      res.writeHead(200, { ...CORS, "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${table}.csv"` });
      res.end(csv);
      return;
    }

    if (M === "POST" && path_ === "/api/admin/clear") {
      const admin = await requireAdmin(req);
      const body = await readBody(req);
      if (body.confirm !== "DELETE ALL DATA") return send(res, 400, { error: "Confirmation required" });
      const DatabaseUtils = require("./db-utils.cjs");
      await new DatabaseUtils(prisma).clearAllData();
      await auditLog(admin.id, "ADMIN_CLEAR_ALL_DATA", null, "success", req);
      return send(res, 200, { ok: true, message: "All data cleared" });
    }

   // ── Serve Frontend Static Files ────────────────────────────
const path = require("path");
const fs = require("fs");

// Serve static files from dist/
const distPath = path.join(__dirname, "../dist");
if (fs.existsSync(distPath)) {
  const filePath = path.join(distPath, url.pathname === "/" ? "index.html" : url.pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const mimeTypes = {
      ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
      ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
      ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    return send(res, 200, content, { "Content-Type": contentType });
  }
  // Fallback to index.html for SPA routing
  if (fs.existsSync(path.join(distPath, "index.html"))) {
    return send(res, 200, fs.readFileSync(path.join(distPath, "index.html")), { "Content-Type": "text/html" });
  }
}
    // ────────────────────────────────────────────────────────────
// ── Serve Frontend Static Files from dist/ ──────────────────
// ────────────────────────────────────────────────────────────
const distPath = path.join(__dirname, "../dist");
if (fs.existsSync(distPath)) {
  // Try to serve the requested file
  let filePath = path.join(distPath, url.pathname === "/" ? "index.html" : url.pathname);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const mimeTypes = { ... };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType, ...SECURITY_HEADERS });
    res.end(content);
    return;
  }
  
  // Fallback to index.html for SPA routing
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath);
    res.writeHead(200, { "Content-Type": "text/html", ...SECURITY_HEADERS });
    res.end(content);
    return;
  }
}

return send(res, 404, { error: "Not found" });

  } catch (err) {
    const status = err.status || 500;
    if (status === 500) {
      console.error("[ERROR]", err.message, err.stack);
      return send(res, 500, { error: "Internal server error" });
    }
    return send(res, status, { error: err.message || "Request failed" }, err.headers || {});
  }
}

// ── Boot ───────────────────────────────────────────────────
async function main() {
  await prisma.$connect();
  const server = http.createServer((req, res) => handle(req, res));
  server.listen(PORT, () => {
    console.log(`\n🍳 Kitchen backend (Postgres/Prisma)  http://localhost:${PORT}\n`);
    if (!CLOUDINARY_CLOUD) console.log("⚠  Cloudinary not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
  });
  const shutdown = async () => { await prisma.$disconnect(); process.exit(0); };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(err => { console.error("Boot failed:", err); process.exit(1); });

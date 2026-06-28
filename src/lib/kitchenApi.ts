import { chefAvatar, recipeImage } from "@/lib/foodAssets";
import type { Creator, Recipe } from "@/data/mock";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export type ApiChef = Omit<Creator, "avatar"> & {
  avatarKey?: string;
  avatar?: string;
  specialty?: string;
  recipeCount?: number;
};

export type ApiRecipe = Omit<Recipe, "image" | "creator"> & {
  imageKey?: string;
  image?: string;
  cuisine?: string;
  diet?: string;
  userId?: string;
  creator: ApiChef | null;
};

export type User = {
  id: string;
  username: string;
  email: string;
  token?: string;
};

export type AuthResponse = User & { token: string };

export type SavedRecipeRecord = {
  id: string;
  recipeId: string;
  collectionName: string;
  savedAt: string;
  recipe: Recipe;
};

export type PickRecipeRequest = {
  mood: string;
  mealType: string;
  timeAvailable: string;
  dietPreference: string;
  ingredientsAvailable: string[];
};

export type PickRecipeResponse = {
  pickedRecipe: Recipe;
  backupRecipes: Recipe[];
  whyPicked: string[];
};

let authToken: string | null = null;
// ✅ SECURITY: cached per-session CSRF token, required by the backend on
// every POST/PUT/DELETE/PATCH for authenticated requests (see backend
// requireCSRF()). Fetched lazily on first mutating request and cleared
// whenever the auth token changes (new login = new CSRF token).
let csrfToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  csrfToken = null; // a new session needs a fresh CSRF token
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
}

export function getAuthToken() {
  if (!authToken) {
    authToken = localStorage.getItem("auth_token");
  }
  return authToken;
}

export function isAuthenticated() {
  return !!getAuthToken();
}

const MUTATING_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

async function fetchCSRFToken(): Promise<string | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/csrf-token`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    csrfToken = data.token;
    return csrfToken;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit, _retried = false): Promise<T> {
  const token = getAuthToken();
  const method = (init?.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // ✅ SECURITY: attach CSRF token on state-changing requests. Lazily
  // fetch one if we don't have it cached yet for this session.
  if (token && MUTATING_METHODS.has(method) && !path.startsWith("/api/auth/")) {
    if (!csrfToken) await fetchCSRFToken();
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    // If the CSRF token was stale/missing, fetch a fresh one and retry
    // exactly once — covers the case where the cached token expired or
    // this is the very first mutating call of the session.
    if (response.status === 403 && !_retried && MUTATING_METHODS.has(method)) {
      const text = await response.text();
      if (text.toLowerCase().includes("csrf")) {
        csrfToken = null;
        await fetchCSRFToken();
        return request<T>(path, init, true);
      }
      throw new Error(text || `Request failed: ${response.status}`);
    }

    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function normalizeChef(chef: ApiChef): Creator & { specialty?: string; recipeCount?: number } {
  return {
    ...chef,
    avatar: chef.avatar || chefAvatar(chef.avatarKey),
  };
}

export function normalizeRecipe(recipe: ApiRecipe): Recipe {
  return {
    ...recipe,
    image: recipe.image || recipeImage(recipe.imageKey),
    creator: recipe.creator ? normalizeChef(recipe.creator) : {
      username: "unknown",
      name: "The Kitchen Platform",
      avatar: chefAvatar(),
      handle: "@thekitchenplatform",
      bio: "Community recipe curator.",
      followers: 0,
      following: 0,
    },
  };
}

// ── Auth ────────────────────────────────────────────────────
export async function signup(username: string, email: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  setAuthToken(data.token);
  return data;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setAuthToken(data.token);
  return data;
}

export async function logout() {
  // ✅ SECURITY FIX: previously this only cleared the local token, leaving
  // it valid server-side for up to 7 days if intercepted. Now it also
  // tells the backend to blacklist the token immediately.
  const token = getAuthToken();
  if (token) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Best-effort — still clear local state even if the request fails
      // (e.g. offline), so the user isn't stuck "logged in" on this device.
    }
  }
  setAuthToken(null);
}

export async function getMe(): Promise<User> {
  return request<User>("/api/auth/me");
}

// ── Recipes ─────────────────────────────────────────────────
export async function getRecipes() {
  const data = await request<ApiRecipe[]>("/api/recipes");
  return data.map(normalizeRecipe);
}

export async function getRecipeById(id: string) {
  const data = await request<ApiRecipe>(`/api/recipes/${encodeURIComponent(id)}`);
  return normalizeRecipe(data);
}

export type CreateRecipeInput = {
  title: string;
  description: string;
  category: string;
  cuisine: string;
  diet: string;
  difficulty: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  tags: string[];
  ingredients: { qty: string; item: string }[];
  steps: string[];
  imageKey?: string;
};

export async function createRecipe(input: CreateRecipeInput) {
  const data = await request<ApiRecipe>("/api/recipes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return normalizeRecipe(data);
}

// ── Saved Recipes ───────────────────────────────────────────
export async function getSavedRecipes() {
  const data = await request<Array<Omit<SavedRecipeRecord, "recipe"> & { recipe: ApiRecipe }>>("/api/saved-recipes");
  return data.map((item) => ({ ...item, recipe: normalizeRecipe(item.recipe) }));
}

export async function saveRecipe(recipeId: string, collectionName = "Favorites") {
  const data = await request<Omit<SavedRecipeRecord, "recipe"> & { recipe: ApiRecipe }>("/api/saved-recipes", {
    method: "POST",
    body: JSON.stringify({ recipeId, collectionName }),
  });
  return { ...data, recipe: normalizeRecipe(data.recipe) };
}

export async function removeSavedRecipe(idOrRecipeId: string) {
  return request<{ removed: number }>(`/api/saved-recipes/${encodeURIComponent(idOrRecipeId)}`, {
    method: "DELETE",
  });
}

// ── Favorite Chefs ──────────────────────────────────────────
export type FavoriteChefRecord = {
  id: string;
  chefUsername: string;
  followedAt: string;
  chef: ApiChef;
  recentUploads: Recipe[];
};

export async function getFavoriteChefs() {
  const data = await request<Array<Omit<FavoriteChefRecord, "chef" | "recentUploads"> & { chef: ApiChef; recentUploads: ApiRecipe[] }>>("/api/favorite-chefs");
  return data.map((item) => ({
    ...item,
    chef: normalizeChef(item.chef),
    recentUploads: item.recentUploads.map(normalizeRecipe),
  }));
}

export async function followChef(chefUsername: string) {
  const data = await request<Omit<FavoriteChefRecord, "chef" | "recentUploads"> & { chef: ApiChef; recentUploads: ApiRecipe[] }>("/api/favorite-chefs", {
    method: "POST",
    body: JSON.stringify({ chefUsername }),
  });
  return {
    ...data,
    chef: normalizeChef(data.chef),
    recentUploads: data.recentUploads.map(normalizeRecipe),
  };
}

export async function unfollowChef(idOrUsername: string) {
  return request<{ removed: number }>(`/api/favorite-chefs/${encodeURIComponent(idOrUsername)}`, {
    method: "DELETE",
  });
}

// ── Recipe Picker ───────────────────────────────────────────
export async function pickRecipe(preferences: PickRecipeRequest) {
  const data = await request<{ pickedRecipe: ApiRecipe; backupRecipes: ApiRecipe[]; whyPicked: string[] }>("/api/pick-recipe", {
    method: "POST",
    body: JSON.stringify(preferences),
  });

  return {
    pickedRecipe: normalizeRecipe(data.pickedRecipe),
    backupRecipes: data.backupRecipes.map(normalizeRecipe),
    whyPicked: data.whyPicked,
  } satisfies PickRecipeResponse;
}

// ── Chefs (public) ──────────────────────────────────────────
export async function getChefs() {
  const data = await request<ApiChef[]>("/api/chefs");
  return data.map(normalizeChef);
}

// ── Image Upload ────────────────────────────────────────────
export async function uploadImage(file: File, folder = "kitchen/recipes"): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const data = await request<{ url: string }>("/api/upload-image", {
          method: "POST",
          body: JSON.stringify({ imageBase64: base64, folder }),
        });
        resolve(data.url);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ── Comments ────────────────────────────────────────────────
export type Comment = {
  id: string; recipeId: string; userId: string; body: string; createdAt: string;
  author: { username: string; name: string; avatarUrl: string | null; avatarKey: string | null };
};

export async function getComments(recipeId: string): Promise<Comment[]> {
  return request<Comment[]>(`/api/recipes/${encodeURIComponent(recipeId)}/comments`);
}

export async function postComment(recipeId: string, body: string): Promise<Comment> {
  return request<Comment>(`/api/recipes/${encodeURIComponent(recipeId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function deleteComment(commentId: string): Promise<void> {
  await request(`/api/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
}

// ── Ratings ─────────────────────────────────────────────────
export async function rateRecipe(recipeId: string, stars: number) {
  return request<{ rating: number; reviews: number; yourRating: number }>(
    `/api/recipes/${encodeURIComponent(recipeId)}/rate`,
    { method: "POST", body: JSON.stringify({ stars }) }
  );
}

export async function getMyRating(recipeId: string) {
  return request<{ stars: number | null }>(`/api/recipes/${encodeURIComponent(recipeId)}/my-rating`);
}

// ── Likes ───────────────────────────────────────────────────
export async function toggleLike(recipeId: string) {
  return request<{ liked: boolean; likesCount: number }>(
    `/api/recipes/${encodeURIComponent(recipeId)}/like`,
    { method: "POST" }
  );
}

export async function getLikeStatus(recipeId: string) {
  return request<{ liked: boolean; likesCount: number }>(
    `/api/recipes/${encodeURIComponent(recipeId)}/like`
  );
}

// ── Collections ─────────────────────────────────────────────
export type Collection = {
  id: string; userId: string; name: string; recipeCount: number; createdAt: string;
};

export async function getCollections(): Promise<Collection[]> {
  return request<Collection[]>("/api/collections");
}

export async function createCollection(name: string): Promise<Collection> {
  return request<Collection>("/api/collections", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteCollection(id: string): Promise<void> {
  await request(`/api/collections/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getCollectionRecipes(colId: string) {
  return request<{ collection: Collection; recipes: Recipe[] }>(
    `/api/collections/${encodeURIComponent(colId)}/recipes`
  );
}

export async function addToCollection(colId: string, recipeId: string): Promise<void> {
  await request(`/api/collections/${encodeURIComponent(colId)}/recipes`, {
    method: "POST",
    body: JSON.stringify({ recipeId }),
  });
}

export async function removeFromCollection(colId: string, recipeId: string): Promise<void> {
  await request(`/api/collections/${encodeURIComponent(colId)}/recipes/${encodeURIComponent(recipeId)}`, {
    method: "DELETE",
  });
}

// ── Notifications ────────────────────────────────────────────
export type Notification = {
  id: string; userId: string; type: string; actorId: string | null;
  recipeId: string | null; body: string; read: number; createdAt: string;
};

export async function getNotifications() {
  return request<{ notifications: Notification[]; unread: number }>("/api/notifications");
}

export async function markAllRead(): Promise<void> {
  await request("/api/notifications/read-all", { method: "POST" });
}

export async function markRead(id: string): Promise<void> {
  await request(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
}

// ── Admin ───────────────────────────────────────────────────
export async function getAdminStats() {
  return request<Record<string, number>>("/api/admin/stats");
}

export async function getAdminUsers() {
  return request<Array<{ id: string; username: string; email: string; isAdmin: number; createdAt: string }>>("/api/admin/users");
}

export async function toggleAdminRole(userId: string) {
  return request<{ isAdmin: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}/toggle-admin`, { method: "POST" });
}

export async function adminDeleteRecipe(recipeId: string) {
  await request(`/api/admin/recipes/${encodeURIComponent(recipeId)}`, { method: "DELETE" });
}

export async function adminRestoreRecipe(recipeId: string) {
  await request(`/api/admin/recipes/${encodeURIComponent(recipeId)}/restore`, { method: "POST" });
}

export async function adminDeleteComment(commentId: string) {
  await request(`/api/admin/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
}

export async function getAdminRecipes() {
  return request<Recipe[]>("/api/admin/recipes");
}

export async function updateProfile(data: { bio?: string; specialty?: string; name?: string; avatarImageBase64?: string }) {
  return request<{ ok: boolean; avatarUrl: string | null }>("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRecipe(recipeId: string) {
  await request(`/api/recipes/${encodeURIComponent(recipeId)}`, { method: "DELETE" });
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { getRecipes, saveRecipe, removeSavedRecipe, toggleLike } from "@/lib/kitchenApi";
import { useAuth } from "@/lib/auth-context";
import type { Recipe } from "@/data/mock";
import { Bookmark, BookMarked, Clock, ChefHat, Heart, Share2, Loader2, Star, SlidersHorizontal } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community Kitchen — The Kitchen Platform" },
      { name: "description", content: "Browse all recipes shared by the community." },
    ],
  }),
  component: CommunityPage,
});

const CATEGORIES = ["All","Breakfast","Lunch","Dinner","Desserts","Vegan","Healthy","Quick Meals","Baking"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Highest Rated" },
  { value: "loved", label: "Most Loved" },
] as const;

type SortValue = typeof SORT_OPTIONS[number]["value"];

function CommunityPage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortValue>("newest");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState<string | null>(null);
  const [pendingLike, setPendingLike] = useState<string | null>(null);

  useEffect(() => {
    getRecipes()
      .then((data) => {
        setRecipes(data);
        // Seed like counts from recipe data
        const counts: Record<string, number> = {};
        data.forEach(r => { counts[r.id] = r.likesCount ?? 0; });
        setLikeCounts(counts);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...recipes];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.creator.name.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (selectedCategory !== "All") {
      list = list.filter(r => r.category === selectedCategory || r.tags.includes(selectedCategory));
    }
    if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (sortBy === "loved") list.sort((a, b) => (likeCounts[b.id] ?? 0) - (likeCounts[a.id] ?? 0));
    return list;
  }, [recipes, searchQuery, selectedCategory, sortBy, likeCounts]);

  const handleSave = async (recipeId: string) => {
    if (!user) { window.location.href = "/login"; return; }
    if (pendingSave === recipeId) return;
    setPendingSave(recipeId);
    try {
      if (savedIds.has(recipeId)) {
        await removeSavedRecipe(recipeId);
        setSavedIds(prev => { const s = new Set(prev); s.delete(recipeId); return s; });
      } else {
        await saveRecipe(recipeId);
        setSavedIds(prev => new Set([...prev, recipeId]));
      }
    } catch { /* silent */ }
    finally { setPendingSave(null); }
  };

  const handleLike = async (recipeId: string) => {
    if (!user) { window.location.href = "/login"; return; }
    if (pendingLike === recipeId) return;
    setPendingLike(recipeId);
    // Optimistic
    const wasLiked = likedIds.has(recipeId);
    setLikedIds(prev => { const s = new Set(prev); wasLiked ? s.delete(recipeId) : s.add(recipeId); return s; });
    setLikeCounts(prev => ({ ...prev, [recipeId]: (prev[recipeId] ?? 0) + (wasLiked ? -1 : 1) }));
    try {
      const result = await toggleLike(recipeId);
      setLikedIds(prev => { const s = new Set(prev); result.liked ? s.add(recipeId) : s.delete(recipeId); return s; });
      setLikeCounts(prev => ({ ...prev, [recipeId]: result.likesCount }));
    } catch {
      // Revert
      setLikedIds(prev => { const s = new Set(prev); wasLiked ? s.add(recipeId) : s.delete(recipeId); return s; });
      setLikeCounts(prev => ({ ...prev, [recipeId]: (prev[recipeId] ?? 0) + (wasLiked ? 1 : -1) }));
    } finally { setPendingLike(null); }
  };

  const handleShare = async (recipeId: string) => {
    const url = `${window.location.origin}/recipe/${recipeId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(recipeId);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard
      prompt("Copy this link:", url);
    }
  };

  return (
    <Layout>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-6">
        <h1 className="font-display text-4xl sm:text-5xl text-ink dark:text-ink mb-2">Community Kitchen</h1>
        <p className="text-ink/50 dark:text-ink/40">Recipes shared by home cooks around the world</p>

        {/* Search + Sort */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search recipes, chefs, cuisines…"
            className="flex-1 bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-2xl px-5 py-3 text-sm text-ink dark:text-ink placeholder:text-ink/30 focus:outline-none focus:border-clay"
          />
          {/* Sort pills */}
          <div className="flex items-center gap-1 bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-2xl p-1">
            <SlidersHorizontal className="size-4 text-ink/30 ml-2 shrink-0" />
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  sortBy === opt.value
                    ? "bg-clay text-cream"
                    : "text-ink/50 dark:text-ink/40 hover:text-ink dark:hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-ink dark:bg-clay text-cream"
                  : "bg-card dark:bg-card border border-ink/10 dark:border-ink/15 text-ink/60 dark:text-ink/50 hover:border-ink/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="size-8 animate-spin mx-auto text-clay" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-ink/40 dark:text-ink/30 mb-4">No recipes found.</p>
            <Link to="/upload" className="text-clay hover:underline text-sm">Upload the first one →</Link>
          </div>
        ) : (
          <div className="space-y-6 mt-2">
            {filtered.map(recipe => {
              const isSaved = savedIds.has(recipe.id);
              const isLiked = likedIds.has(recipe.id);
              const likeCount = likeCounts[recipe.id] ?? 0;

              return (
                <article key={recipe.id} className="bg-card dark:bg-card border border-ink/5 dark:border-ink/10 rounded-3xl overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-ink/5 dark:border-ink/8">
                    <Link to="/profile/$username" params={{ username: recipe.creator.username }} className="flex items-center gap-3 cursor-pointer group">
                      <img src={recipe.creator.avatar} alt={recipe.creator.name} className="size-10 rounded-full object-cover" />
                      <div>
                        <p className="text-sm font-semibold text-ink dark:text-ink group-hover:text-clay transition-colors">{recipe.creator.name}</p>
                        <p className="text-xs text-ink/40 dark:text-ink/30">{recipe.creator.handle}</p>
                      </div>
                    </Link>
                    <span className="text-xs font-semibold uppercase tracking-widest text-clay">{recipe.category}</span>
                  </div>

                  {/* Image */}
                  <Link to="/recipe/$id" params={{ id: recipe.id }} className="block cursor-pointer">
                    <div className="w-full aspect-video overflow-hidden">
                      <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="px-5 pt-4 pb-2">
                    <Link to="/recipe/$id" params={{ id: recipe.id }} className="cursor-pointer">
                      <h2 className="font-display text-2xl text-ink dark:text-ink hover:text-clay transition-colors">{recipe.title}</h2>
                    </Link>
                    <p className="text-ink/60 dark:text-ink/50 mt-1.5 text-sm line-clamp-2">{recipe.description}</p>

                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-ink/50 dark:text-ink/40">
                      <span className="flex items-center gap-1"><Clock className="size-3.5" /> {recipe.prepTime} prep</span>
                      <span className="flex items-center gap-1"><ChefHat className="size-3.5" /> {recipe.cookTime} cook</span>
                      <span>Serves {recipe.servings}</span>
                      <span className="flex items-center gap-1">
                        <Star className="size-3.5 fill-clay text-clay" />
                        {recipe.rating} ({recipe.reviews})
                      </span>
                    </div>

                    {recipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {recipe.tags.slice(0, 4).map(tag => (
                          <span key={tag} className="bg-clay/8 dark:bg-clay/12 text-clay text-xs px-2.5 py-1 rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 px-5 py-3 border-t border-ink/5 dark:border-ink/8 mt-2">
                    <Link
                      to="/recipe/$id"
                      params={{ id: recipe.id }}
                      className="flex-1 py-2.5 rounded-xl bg-ink dark:bg-clay text-cream text-sm font-medium hover:opacity-90 transition-opacity text-center cursor-pointer"
                    >
                      View Recipe
                    </Link>

                    {/* Save */}
                    <button
                      onClick={() => handleSave(recipe.id)}
                      disabled={pendingSave === recipe.id}
                      title={isSaved ? "Unsave" : "Save recipe"}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                        isSaved
                          ? "bg-clay text-cream"
                          : "border border-ink/10 dark:border-ink/15 text-ink/60 dark:text-ink/50 hover:border-clay/40 hover:text-clay"
                      }`}
                    >
                      {isSaved ? <BookMarked className="size-4" /> : <Bookmark className="size-4" />}
                      <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
                    </button>

                    {/* Like */}
                    <button
                      onClick={() => handleLike(recipe.id)}
                      disabled={pendingLike === recipe.id}
                      title={isLiked ? "Unlike" : "Like"}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer border ${
                        isLiked
                          ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-500"
                          : "border-ink/10 dark:border-ink/15 text-ink/50 dark:text-ink/40 hover:border-red-300 hover:text-red-400"
                      }`}
                    >
                      <Heart className={`size-4 ${isLiked ? "fill-red-500" : ""}`} />
                      {likeCount > 0 && <span>{likeCount}</span>}
                    </button>

                    {/* Share */}
                    <button
                      onClick={() => handleShare(recipe.id)}
                      title="Copy link"
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer border ${
                        copied === recipe.id
                          ? "border-moss/40 bg-moss/10 text-moss"
                          : "border-ink/10 dark:border-ink/15 text-ink/50 dark:text-ink/40 hover:border-ink/20"
                      }`}
                    >
                      <Share2 className="size-4" />
                      <span className="hidden sm:inline">{copied === recipe.id ? "Copied!" : "Share"}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
}

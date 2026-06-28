import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { RecipeCard } from "@/components/site/RecipeCard";
import { CommentSection } from "@/components/site/CommentSection";
import { getRecipeById, saveRecipe, removeSavedRecipe, toggleLike, getLikeStatus, getRecipes } from "@/lib/kitchenApi";
import { useAuth } from "@/lib/auth-context";
import type { Recipe } from "@/data/mock";
import { Bookmark, Clock, Heart, Share2, Star, Users, ChefHat, Loader2, BookMarked } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/recipe/$id")({
  component: RecipePage,
  notFoundComponent: () => (
    <Layout>
      <div className="max-w-2xl mx-auto p-20 text-center">
        <h1 className="font-display text-3xl">Recipe not found</h1>
        <Link to="/" className="text-clay mt-4 inline-block">Browse recipes →</Link>
      </div>
    </Layout>
  ),
});

function RecipePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [moreRecipes, setMoreRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getRecipeById(id),
      getLikeStatus(id).catch(() => ({ liked: false, likesCount: 0 })),
      getRecipes().catch(() => []),
    ]).then(([r, likeData, allRecipes]) => {
      setRecipe(r);
      setLiked(likeData.liked);
      setLikesCount(likeData.likesCount);
      setMoreRecipes(allRecipes.filter((x) => x.id !== id).slice(0, 3));
    }).catch(() => {
      setError("Could not load recipe. Try refreshing.");
    }).finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!recipe) return;
    if (!user) { window.location.href = "/login"; return; }
    try {
      if (saved) { await removeSavedRecipe(recipe.id); setSaved(false); }
      else { await saveRecipe(recipe.id); setSaved(true); }
    } catch { alert("Could not save recipe."); }
  };

  const handleLike = async () => {
    if (!recipe) return;
    if (!user) { window.location.href = "/login"; return; }
    try {
      const result = await toggleLike(recipe.id);
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch { alert("Could not like recipe."); }
  };

  const handleShare = async () => {
    if (!recipe) return;
    setSharing(true);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setTimeout(() => setSharing(false), 2000);
    } catch { setSharing(false); }
  };

  if (loading) return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 className="size-8 animate-spin mx-auto text-clay" />
      </div>
    </Layout>
  );

  if (error || !recipe) return (
    <Layout>
      <div className="max-w-2xl mx-auto p-20 text-center">
        <h1 className="font-display text-3xl">Recipe not found</h1>
        <p className="text-ink/50 mt-2">{error}</p>
        <Link to="/" className="text-clay mt-4 inline-block">Browse recipes →</Link>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <article className="max-w-7xl mx-auto">
        <section className="px-4 sm:px-6 pt-10 pb-6">
          <div className="grid lg:grid-cols-3 gap-10">

            {/* Main content */}
            <div className="lg:col-span-2">
              {/* Image */}
              <div className="aspect-video rounded-3xl bg-paper dark:bg-paper overflow-hidden mb-6">
                <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-clay">{recipe.category}</span>
                {recipe.cuisine && (
                  <span className="text-[11px] font-bold uppercase tracking-widest text-ink/30 dark:text-ink/30">{recipe.cuisine}</span>
                )}
                <div className="flex items-center gap-1">
                  <Star className="size-4 fill-clay text-clay" />
                  <span className="text-sm font-medium text-ink dark:text-ink">{recipe.rating} <span className="text-ink/40">({recipe.reviews} reviews)</span></span>
                </div>
                <div className="flex items-center gap-1 text-ink/40 dark:text-ink/30">
                  <Heart className={`size-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                  <span className="text-sm">{likesCount}</span>
                </div>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl leading-tight text-balance text-ink dark:text-ink">{recipe.title}</h1>
              <p className="mt-6 text-ink/70 dark:text-ink/60 text-lg leading-relaxed max-w-2xl">{recipe.description}</p>

              {/* Stats */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat icon={Clock} label="Prep time" value={recipe.prepTime} />
                <Stat icon={ChefHat} label="Cook time" value={recipe.cookTime} />
                <Stat icon={Users} label="Servings" value={`${recipe.servings}`} />
                <Stat icon={Star} label="Difficulty" value={recipe.difficulty} />
              </div>

              {/* Creator */}
              <div className="mt-10 pt-10 border-t border-ink/6 dark:border-ink/12">
                <div className="flex items-start gap-4">
                  <img src={recipe.creator.avatar} alt={recipe.creator.name} className="size-16 rounded-full object-cover" />
                  <div className="flex-1">
                    <h2 className="font-display text-2xl text-ink dark:text-ink">{recipe.creator.name}</h2>
                    <p className="text-sm text-ink/40 dark:text-ink/30 mt-0.5">{recipe.creator.handle}</p>
                    <p className="text-sm text-ink/60 dark:text-ink/50 mt-2 max-w-sm">{recipe.creator.bio}</p>
                    <Link to="/profile/$username" params={{ username: recipe.creator.username }} className="text-clay text-sm font-medium mt-3 inline-block hover:underline">
                      View profile →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Ingredients & Steps */}
              <div className="mt-12 pt-10 border-t border-ink/6 dark:border-ink/12 grid md:grid-cols-2 gap-12">
                <div>
                  <h3 className="font-display text-3xl mb-6 text-ink dark:text-ink">Ingredients</h3>
                  <ul className="space-y-3">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex gap-3 text-ink/70 dark:text-ink/60">
                        <span className="size-5 rounded-full border border-clay/40 shrink-0 mt-0.5" />
                        <span><span className="font-medium text-ink dark:text-ink">{ing.qty}</span> {ing.item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-display text-3xl mb-6 text-ink dark:text-ink">Instructions</h3>
                  <ol className="space-y-5">
                    {recipe.steps.map((step, i) => (
                      <li key={i} className="flex gap-4">
                        <span className="size-7 rounded-full bg-clay/10 dark:bg-clay/15 text-clay text-sm font-semibold grid place-items-center shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-ink/70 dark:text-ink/60 leading-relaxed">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Comments & Ratings */}
              <CommentSection recipeId={id} recipeOwnerId={recipe.userId} />
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-20 space-y-3">
                {/* Save */}
                <button
                  onClick={handleSave}
                  className={`w-full py-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    saved
                      ? "bg-clay text-cream hover:bg-clay-soft"
                      : "border border-ink/10 dark:border-ink/15 text-ink dark:text-ink hover:border-clay/40 hover:bg-clay/5"
                  }`}
                >
                  {saved ? <BookMarked className="size-5 fill-cream" /> : <Bookmark className="size-5" />}
                  {saved ? "Saved!" : "Save recipe"}
                </button>

                {/* Like */}
                <button
                  onClick={handleLike}
                  className={`w-full py-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all active:scale-95 border ${
                    liked
                      ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300"
                      : "border-ink/10 dark:border-ink/15 text-ink dark:text-ink hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                  }`}
                >
                  <Heart className={`size-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                  {liked ? `Loved · ${likesCount}` : `Love this · ${likesCount}`}
                </button>

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="w-full py-4 border border-ink/10 dark:border-ink/15 rounded-2xl font-medium text-ink dark:text-ink hover:bg-paper dark:hover:bg-paper transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Share2 className="size-5" />
                  {sharing ? "Link copied!" : "Share"}
                </button>

                {/* Tags */}
                {recipe.tags.length > 0 && (
                  <div className="pt-6 mt-4 border-t border-ink/6 dark:border-ink/12">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-ink/40 dark:text-ink/30 mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {recipe.tags.map((tag) => (
                        <span key={tag} className="bg-paper dark:bg-paper px-3 py-1.5 rounded-full text-xs font-medium text-ink/60 dark:text-ink/50">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diet badge */}
                {recipe.diet && recipe.diet !== "Anything" && (
                  <div className="pt-4">
                    <span className="inline-flex items-center gap-1.5 bg-moss/10 dark:bg-moss/15 text-moss text-xs font-semibold px-3 py-1.5 rounded-full">
                      ✓ {recipe.diet}
                    </span>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>

        {/* More recipes */}
        {moreRecipes.length > 0 && (
          <section className="px-4 sm:px-6 py-16 border-t border-ink/6 dark:border-ink/12">
            <h2 className="font-display text-3xl text-ink dark:text-ink mb-8">More recipes</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {moreRecipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          </section>
        )}
      </article>
    </Layout>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="text-center bg-paper dark:bg-paper rounded-2xl p-4">
      <Icon className="size-5 mx-auto text-clay mb-2" />
      <p className="text-xs text-ink/40 dark:text-ink/30 uppercase tracking-widest">{label}</p>
      <p className="font-display text-lg mt-1 text-ink dark:text-ink">{value}</p>
    </div>
  );
}

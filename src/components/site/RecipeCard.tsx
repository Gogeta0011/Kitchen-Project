import { Link } from "@tanstack/react-router";
import { Bookmark, BookMarked, Heart, Star, Clock } from "lucide-react";
import { useState } from "react";
import { saveRecipe, removeSavedRecipe, toggleLike } from "@/lib/kitchenApi";
import { useAuth } from "@/lib/auth-context";
import type { Recipe } from "@/data/mock";

type Props = {
  recipe: Recipe;
  priority?: boolean;
  initialSaved?: boolean;
  initialLiked?: boolean;
};

export function RecipeCard({ recipe, priority = false, initialSaved = false, initialLiked = false }: Props) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(initialSaved);
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(recipe.likesCount ?? 0);
  const [savePending, setSavePending] = useState(false);
  const [likePending, setLikePending] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { window.location.href = "/login"; return; }
    if (savePending) return;
    setSavePending(true);
    try {
      if (saved) {
        await removeSavedRecipe(recipe.id);
        setSaved(false);
      } else {
        await saveRecipe(recipe.id);
        setSaved(true);
      }
    } catch {
      // silently fail — user sees no change
    } finally {
      setSavePending(false);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { window.location.href = "/login"; return; }
    if (likePending) return;
    setLikePending(true);
    // Optimistic update
    setLiked(v => !v);
    setLikesCount(v => liked ? v - 1 : v + 1);
    try {
      const result = await toggleLike(recipe.id);
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch {
      // Revert on failure
      setLiked(v => !v);
      setLikesCount(v => liked ? v + 1 : v - 1);
    } finally {
      setLikePending(false);
    }
  };

  return (
    <article className="group recipe-card-hover rounded-3xl bg-card dark:bg-card overflow-hidden border border-ink/5 dark:border-ink/10 shadow-[var(--shadow-card)]">
      <Link to="/recipe/$id" params={{ id: recipe.id }} className="block relative overflow-hidden aspect-[4/3]">
        <img
          src={recipe.image}
          alt={recipe.title}
          loading={priority ? "eager" : "lazy"}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {/* Rating badge */}
        <div className="absolute top-3 right-3 bg-white/90 dark:bg-ink/80 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 text-ink dark:text-cream">
          <Star className="size-3 fill-clay text-clay" /> {recipe.rating}
        </div>
        {/* Cook time */}
        <div className="absolute bottom-3 left-3 bg-ink/70 dark:bg-ink/80 backdrop-blur-sm text-cream px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <Clock className="size-3" /> {recipe.cookTime}
        </div>
        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={savePending}
          aria-label={saved ? "Unsave recipe" : "Save recipe"}
          className={`absolute top-3 left-3 size-9 rounded-full backdrop-blur-sm grid place-items-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
            saved ? "bg-clay text-cream" : "bg-white/90 dark:bg-ink/70 text-ink/70 dark:text-cream/70"
          }`}
        >
          {saved ? <BookMarked className="size-4 fill-cream" /> : <Bookmark className="size-4" />}
        </button>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to="/recipe/$id" params={{ id: recipe.id }}>
              <h3 className="font-display text-lg leading-tight text-ink dark:text-ink group-hover:text-clay dark:group-hover:text-clay transition-colors line-clamp-2 cursor-pointer">
                {recipe.title}
              </h3>
            </Link>
            <p className="text-xs text-ink/50 dark:text-ink/40 mt-1.5 capitalize">
              {recipe.difficulty} · {recipe.category}
            </p>
          </div>
          {/* Like button */}
          <button
            type="button"
            onClick={handleLike}
            disabled={likePending}
            aria-label={liked ? "Unlike recipe" : "Like recipe"}
            className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-paper dark:hover:bg-paper transition-colors cursor-pointer"
          >
            <Heart className={`size-4 transition-all duration-200 ${liked ? "fill-red-500 text-red-500 scale-110" : "text-ink/30 dark:text-ink/30"}`} />
            {likesCount > 0 && <span className="text-xs text-ink/40 dark:text-ink/30">{likesCount}</span>}
          </button>
        </div>

        <Link to="/profile/$username" params={{ username: recipe.creator.username }} className="flex items-center gap-2 mt-3 group/creator cursor-pointer">
          <img src={recipe.creator.avatar} alt="" className="size-6 rounded-full object-cover ring-1 ring-ink/10" loading="lazy" />
          <span className="text-xs text-ink/50 dark:text-ink/40 group-hover/creator:text-clay transition-colors">
            by {recipe.creator.name}
          </span>
        </Link>
      </div>
    </article>
  );
}

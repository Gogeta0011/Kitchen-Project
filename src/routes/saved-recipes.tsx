import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { RecipeCard } from "@/components/site/RecipeCard";
import { SearchFilter } from "@/components/site/SearchFilter";
import { recipes as fallbackRecipes } from "@/data/mock";
import { getSavedRecipes, removeSavedRecipe, type SavedRecipeRecord } from "@/lib/kitchenApi";
import { Bookmark, CalendarPlus, Grid2X2, List, Trash2, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/saved-recipes")({
  head: () => ({
    meta: [
      { title: "Saved Recipes — The Kitchen Platform" },
      { name: "description", content: "Your personal digital cookbook of saved Kitchen Platform recipes." },
    ],
  }),
  component: SavedRecipesPage,
});

const filters = ["All", "Breakfast", "Dinner", "Quick Meals", "Italian", "Vegan", "Under 30 min"];

function SavedRecipesPage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [savedItems, setSavedItems] = useState<SavedRecipeRecord[]>(
    fallbackRecipes.slice(0, 3).map((recipe, index) => ({
      id: `local-${index}`,
      recipeId: recipe.id,
      collectionName: index === 0 ? "Favorites" : "Quick Meals",
      savedAt: new Date().toISOString(),
      recipe,
    })),
  );
  const [status, setStatus] = useState("");

  const loadSavedRecipes = () => {
    getSavedRecipes()
      .then((data) => {
        setSavedItems(data);
        setStatus("");
      })
      .catch(() => setStatus("Backend offline — showing local preview data."));
  };

  useEffect(() => {
    loadSavedRecipes();
  }, []);

  const collections = useMemo(() => {
    const counts = savedItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.collectionName] = (acc[item.collectionName] || 0) + 1;
      return acc;
    }, {});

    return Object.entries({ Favorites: 0, "Quick Meals": 0, "Weekend Cooking": 0, ...counts }).map(([name, count]) => ({ name, count }));
  }, [savedItems]);

  const filteredItems = useMemo(
    () => savedItems.filter(({ recipe }) => {
      const matchesQuery =
        query === "" ||
        recipe.title.toLowerCase().includes(query.toLowerCase()) ||
        recipe.creator.name.toLowerCase().includes(query.toLowerCase()) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
      const matchesFilter =
        activeFilter === "All" ||
        recipe.category === activeFilter ||
        recipe.tags.includes(activeFilter) ||
        (activeFilter === "Under 30 min" && !recipe.prepTime.includes("day") && !recipe.cookTime.includes("45"));
      return matchesQuery && matchesFilter;
    }),
    [activeFilter, query, savedItems],
  );

  const handleRemove = async (id: string) => {
    setSavedItems((current) => current.filter((item) => item.id !== id));
    try {
      await removeSavedRecipe(id);
      setStatus("Removed from backend cookbook.");
    } catch {
      setStatus("Backend offline — local preview item removed only.");
    }
  };

  return (
    <Layout>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-clay">
              <Bookmark className="size-4 fill-clay" /> Your cookbook
            </span>
            <h1 className="font-display text-5xl sm:text-6xl mt-3">Saved Recipes</h1>
            <p className="mt-3 text-ink/60 dark:text-ink/50 dark:text-ink/40 max-w-xl">Recipes stored in your backend database, organized like a personal digital cookbook.</p>
            {status && <p className="text-sm text-clay font-medium mt-3">{status}</p>}
          </div>
          <Link to="/what-to-cook-today" className="bg-clay text-cream px-6 py-3 rounded-xl font-medium shadow-clay hover:scale-[1.02] active:scale-95 transition-transform inline-flex items-center gap-2 w-fit">
            <Utensils className="size-4" /> Cook something now
          </Link>
        </div>

        <div className="mt-8 flex flex-col lg:flex-row gap-3">
          <SearchFilter
            query={query}
            onQueryChange={setQuery}
            placeholder="Search saved recipes, creators, or tags..."
          />
          <div className="flex bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-full p-1 w-fit">
            <button onClick={() => setView("grid")} className={`size-10 rounded-full grid place-items-center ${view === "grid" ? "bg-ink text-cream" : "hover:bg-paper dark:bg-paper"}`} aria-label="Grid view"><Grid2X2 className="size-4" /></button>
            <button onClick={() => setView("list")} className={`size-10 rounded-full grid place-items-center ${view === "list" ? "bg-ink text-cream" : "hover:bg-paper dark:bg-paper"}`} aria-label="List view"><List className="size-4" /></button>
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm border transition-colors ${activeFilter === filter ? "bg-ink text-cream border-ink" : "bg-card dark:bg-card border-ink/10 dark:border-ink/15 hover:border-clay/40"}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {collections.map((collection) => (
            <button key={collection.name} onClick={() => setActiveFilter(collection.name === "Favorites" ? "All" : collection.name)} className="text-left bg-card dark:bg-card rounded-3xl p-5 shadow-soft border border-ink/5 dark:border-ink/10 dark:border-ink/15 hover:-translate-y-0.5 hover:shadow-lg transition-all">
              <p className="font-display text-xl">{collection.name}</p>
              <p className="text-sm text-ink/50 dark:text-ink/40 mt-1">{collection.count} saved recipes</p>
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {filteredItems.length === 0 ? (
          <div className="bg-paper dark:bg-paper rounded-[2rem] py-20 px-6 text-center">
            <Bookmark className="size-10 mx-auto text-clay" />
            <h2 className="font-display text-3xl mt-4">No saved recipes yet</h2>
            <p className="text-ink/60 dark:text-ink/50 dark:text-ink/40 mt-2 max-w-md mx-auto">Save recipes from the picker and they will show up here from the backend.</p>
            <Link to="/what-to-cook-today" className="inline-flex mt-6 bg-ink text-cream px-6 py-3 rounded-xl font-medium hover:bg-earth transition-colors">Pick a recipe</Link>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {filteredItems.map((item) => (
              <div key={item.id} className="relative group">
                <RecipeCard recipe={item.recipe} />
                <button onClick={() => handleRemove(item.id)} className="absolute top-3 right-3 bg-cream/95 text-clay rounded-full px-3 py-2 text-xs font-bold shadow-soft opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => <SavedRecipeRow key={item.id} item={item} onRemove={handleRemove} />)}
          </div>
        )}
      </section>
    </Layout>
  );
}

function SavedRecipeRow({ item, onRemove }: { item: { id: string; recipe: (typeof fallbackRecipes)[number] }; onRemove: (id: string) => void }) {
  const { recipe } = item;
  return (
    <article className="bg-card dark:bg-card rounded-3xl p-4 sm:p-5 shadow-soft border border-ink/5 dark:border-ink/10 dark:border-ink/15 flex flex-col sm:flex-row gap-4">
      <Link to="/recipe/$id" params={{ id: recipe.id }} className="sm:w-44 aspect-[4/3] rounded-2xl overflow-hidden bg-paper dark:bg-paper shrink-0">
        <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <Link to="/recipe/$id" params={{ id: recipe.id }}><h2 className="font-display text-2xl hover:text-clay transition-colors">{recipe.title}</h2></Link>
            <p className="text-sm text-ink/50 dark:text-ink/40 mt-1">by {recipe.creator.name} · {recipe.prepTime} prep · {recipe.cookTime} cook</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link to="/recipe/$id" params={{ id: recipe.id }} className="bg-ink text-cream px-3.5 py-2 rounded-full text-xs font-bold">View Recipe</Link>
            <button className="bg-paper dark:bg-paper px-3.5 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1"><CalendarPlus className="size-3.5" /> Meal Plan</button>
            <button onClick={() => onRemove(item.id)} className="bg-paper dark:bg-paper px-3.5 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1"><Trash2 className="size-3.5" /> Remove</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {recipe.tags.map((tag) => <span key={tag} className="bg-clay/10 text-clay px-3 py-1 rounded-full text-xs font-bold">{tag}</span>)}
        </div>
      </div>
    </article>
  );
}

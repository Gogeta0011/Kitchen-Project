import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { RecipeCard } from "@/components/site/RecipeCard";
import { BlogCard } from "@/components/site/BlogCard";
import { blogs, creators } from "@/data/mock";
import { getRecipes } from "@/lib/kitchenApi";
import { ArrowRight, ChefHat, Heart, Search, Sparkles, Star, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Recipe } from "@/data/mock";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Kitchen Platform" },
      { name: "description", content: "Stories from the heart of the home. Recipes, blogs, and creators worth following." },
      { property: "og:title", content: "The Kitchen Platform" },
    ],
  }),
  component: HomePage,
});

const CATEGORIES = ["All", "Breakfast", "Lunch", "Dinner", "Desserts", "Vegan", "Healthy", "Quick Meals", "Baking"];

function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [featured, setFeatured] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    getRecipes()
      .then((data) => { setRecipes(data); setFeatured(data[0] ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredRecipes = useMemo(() => {
    if (activeCategory === "All") return recipes;
    return recipes.filter(r =>
      r.category === activeCategory ||
      r.tags.some(t => t.toLowerCase() === activeCategory.toLowerCase())
    );
  }, [recipes, activeCategory]);

  return (
    <Layout>
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col justify-center overflow-hidden">
        {/* Ambient orbs */}
        <div className="hero-orb w-[600px] h-[600px] bg-clay/25 dark:bg-clay/15 top-[-100px] right-[-150px]" />
        <div className="hero-orb w-[400px] h-[400px] bg-moss/20 dark:bg-moss/10 bottom-[0px] left-[-100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full pt-16 pb-20 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: copy */}
          <div className="space-y-8">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-clay bg-clay/10 dark:bg-clay/15 px-3 py-1.5 rounded-full">
                <Sparkles className="size-3" /> The Community Kitchen
              </span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.92] text-ink dark:text-ink text-balance animate-fade-up delay-100">
              Stories from the{" "}
              <span className="italic text-clay">heart</span>{" "}
              of the home.
            </h1>
            <p className="text-lg text-ink/65 dark:text-ink/55 max-w-md leading-relaxed animate-fade-up delay-200">
              Home cooks sharing secret family recipes, modern kitchen experiments, and the stories behind every bite.
            </p>
            <div className="flex flex-wrap gap-3 animate-fade-up delay-300">
              <Link
                to="/community"
                className="bg-clay text-cream px-7 py-3.5 rounded-xl font-medium shadow-clay hover:bg-earth hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                Explore Recipes
              </Link>
              <Link
                to="/upload"
                className="border border-ink/15 dark:border-ink/20 px-7 py-3.5 rounded-xl font-medium text-ink dark:text-ink hover:bg-paper dark:hover:bg-paper hover:border-clay/30 transition-all duration-200"
              >
                Share Your Own
              </Link>
            </div>
            <div className="flex items-center gap-5 pt-1 animate-fade-up delay-400">
              <div className="flex -space-x-2.5">
                {creators.slice(0, 4).map((c) => (
                  <img key={c.username} src={c.avatar} alt="" className="size-9 rounded-full object-cover ring-2 ring-cream dark:ring-cream" loading="lazy" />
                ))}
              </div>
              <div className="text-sm text-ink/55 dark:text-ink/45">
                <span className="font-semibold text-ink dark:text-ink">
                  {loading ? "…" : `${recipes.length} recipes`}
                </span>{" "}already in the kitchen
              </div>
            </div>
          </div>

          {/* Right: featured image */}
          <div className="relative animate-scale-in delay-200">
            {featured ? (
              <Link to="/recipe/$id" params={{ id: featured.id }} className="block">
                <div className="relative w-full aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <img src={featured.image} alt={featured.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center gap-1 mb-2">
                      {[0,1,2,3,4].map(i => <Star key={i} className="size-3 fill-cream/80 text-cream/80" />)}
                    </div>
                    <p className="text-cream font-display text-xl leading-tight">{featured.title}</p>
                    <p className="text-cream/70 text-sm mt-1">by {featured.creator.name}</p>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="w-full aspect-square rounded-[2.5rem] skeleton" />
            )}
            {/* Floating stat cards */}
            <div className="absolute -top-4 -left-6 bg-white dark:bg-card shadow-[var(--shadow-card)] border border-ink/5 dark:border-ink/10 rounded-2xl px-4 py-3 animate-fade-up delay-500">
              <div className="text-xs text-ink/50 dark:text-ink/40 font-medium">This week</div>
              <div className="font-display text-2xl text-clay mt-0.5">{recipes.length || "12"}</div>
              <div className="text-xs text-ink/60 dark:text-ink/50">new recipes</div>
            </div>
            <div className="absolute -bottom-4 -right-6 bg-white dark:bg-card shadow-[var(--shadow-card)] border border-ink/5 dark:border-ink/10 rounded-2xl px-4 py-3 animate-fade-up delay-600">
              <div className="text-xs text-ink/50 dark:text-ink/40">Community</div>
              <div className="font-display text-2xl text-moss mt-0.5">4.9★</div>
              <div className="text-xs text-ink/60 dark:text-ink/50">avg rating</div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in delay-600">
          <span className="text-[10px] uppercase tracking-widest text-ink/30 dark:text-ink/25">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-ink/20 to-transparent" />
        </div>
      </section>

      {/* ── SEARCH BAR ───────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 mb-4 relative z-10">
        <Link
          to="/community"
          className="flex items-center gap-3 w-full bg-white dark:bg-card shadow-[var(--shadow-card)] border border-ink/8 dark:border-ink/12 rounded-2xl px-5 py-4 hover:border-clay/30 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 group"
        >
          <Search className="size-5 text-ink/30 dark:text-ink/25 group-hover:text-clay transition-colors" />
          <span className="text-sm text-ink/40 dark:text-ink/35">Search recipes, chefs, cuisines…</span>
          <kbd className="ml-auto text-[10px] text-ink/25 dark:text-ink/20 border border-ink/10 dark:border-ink/15 rounded px-1.5 py-0.5 hidden sm:block">⌘K</kbd>
        </Link>
      </section>

      {/* ── CATEGORY CHIPS ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-ink dark:bg-clay text-cream border-ink dark:border-clay scale-[1.03]"
                  : "bg-white dark:bg-card border-ink/10 dark:border-ink/15 text-ink/60 dark:text-ink/55 hover:border-clay/30 hover:text-ink dark:hover:text-ink"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        {activeCategory !== "All" && (
          <div className="mt-3 flex items-center gap-2 animate-fade-in">
            <span className="text-xs text-ink/50 dark:text-ink/40">Filtered by:</span>
            <span className="inline-flex items-center gap-1.5 bg-clay/10 dark:bg-clay/15 text-clay text-xs font-semibold px-3 py-1 rounded-full">
              {activeCategory}
              <button onClick={() => setActiveCategory("All")} className="hover:text-clay-soft ml-0.5">×</button>
            </span>
          </div>
        )}
      </section>

      {/* ── TRENDING ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-clay">Trending now</span>
            <h2 className="font-display text-3xl sm:text-4xl mt-2 text-ink dark:text-ink">
              {activeCategory === "All" ? "This week's most cooked" : `Best ${activeCategory} recipes`}
            </h2>
          </div>
          <Link to="/community" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-ink/50 dark:text-ink/40 hover:text-clay dark:hover:text-clay transition-colors group">
            See all <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="aspect-[4/3] rounded-3xl skeleton" />)}
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-20 bg-paper/40 dark:bg-paper/20 rounded-3xl">
            <p className="text-ink/50 dark:text-ink/40 mb-3">No {activeCategory} recipes yet.</p>
            <Link to="/upload" className="text-clay font-medium hover:underline">Be the first to add one!</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.slice(0, 6).map((r, i) => (
              <div key={r.id} className={`animate-slide-up delay-${Math.min(i * 100, 500)}`}>
                <RecipeCard recipe={r} priority={i === 0} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── CREATOR SPOTLIGHT ────────────────────────────── */}
      <section className="bg-paper/50 dark:bg-paper/20 py-20 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-moss">Creators</span>
              <h2 className="font-display text-3xl sm:text-4xl mt-2 text-ink dark:text-ink">Meet the makers</h2>
            </div>
            <Link to="/favorite-chefs" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-ink/50 dark:text-ink/40 hover:text-clay dark:hover:text-clay transition-colors group">
              All chefs <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {creators.map((c, i) => (
              <Link
                key={c.username}
                to="/profile/$username"
                params={{ username: c.username }}
                className={`group bg-white dark:bg-card rounded-3xl p-6 border border-ink/5 dark:border-ink/10 hover:border-clay/20 dark:hover:border-clay/25 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 flex flex-col items-center text-center animate-slide-up delay-${i * 100}`}
              >
                <div className="relative">
                  <img src={c.avatar} alt={c.name} className="size-20 rounded-full object-cover ring-4 ring-cream dark:ring-card group-hover:ring-clay/20 transition-all" loading="lazy" />
                  <div className="absolute -bottom-1 -right-1 bg-clay text-cream text-[9px] font-bold px-1.5 py-0.5 rounded-full">Chef</div>
                </div>
                <h3 className="font-display text-lg mt-4 text-ink dark:text-ink">{c.name}</h3>
                <p className="text-xs text-ink/45 dark:text-ink/35 mt-0.5">{c.handle}</p>
                <p className="text-xs text-ink/55 dark:text-ink/45 mt-3 line-clamp-2 leading-relaxed">{c.bio}</p>
                <span className="mt-4 text-[11px] font-bold uppercase tracking-widest text-clay group-hover:text-clay-soft transition-colors">Follow</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL BANNER ───────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-ink dark:bg-card text-cream dark:text-ink rounded-[2rem] p-10 sm:p-14 relative overflow-hidden border border-transparent dark:border-ink/10">
          <div className="hero-orb w-64 h-64 bg-clay/30 top-[-50px] right-[-30px]" />
          <div className="relative max-w-2xl">
            <div className="flex gap-1 mb-5">
              {[0,1,2,3,4].map(i => <Star key={i} className="size-5 fill-clay text-clay" />)}
            </div>
            <blockquote className="font-display text-2xl sm:text-3xl leading-relaxed text-cream dark:text-ink">
              "I finally mastered sourdough after two years of failing. The community tips here are a game changer."
            </blockquote>
            <p className="mt-6 text-xs uppercase tracking-widest font-bold text-cream/50 dark:text-ink/50">
              — @sourdough_sam · Home Baker
            </p>
          </div>
        </div>
      </section>

      {/* ── FOR YOU MASONRY ──────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-clay">For You</span>
            <h2 className="font-display text-3xl sm:text-4xl mt-2 text-ink dark:text-ink">Handpicked, just your taste</h2>
          </div>
        </div>
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {recipes.slice(3, 7).map(r => (
            <div key={r.id} className="break-inside-avoid"><RecipeCard recipe={r} /></div>
          ))}
          {blogs.slice(0, 2).map(b => (
            <div key={b.id} className="break-inside-avoid"><BlogCard blog={b} /></div>
          ))}
        </div>
      </section>

      {/* ── STATS CTA ────────────────────────────────────── */}
      <section className="bg-ink dark:bg-paper text-cream dark:text-ink py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-clay">Why we gather here</span>
          <h2 className="font-display text-3xl sm:text-5xl mt-3 max-w-2xl mx-auto text-balance">
            The kitchen is <span className="italic text-clay">better</span> when we cook together.
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mt-14 text-left">
            {[
              { icon: Users, n: `${recipes.length || "50"}+`, l: "Recipes in the community" },
              { icon: Heart, n: "∞", l: "Meals inspired this month" },
              { icon: Star, n: "4.9 / 5", l: "Average creator rating" },
            ].map(({ icon: Icon, n, l }) => (
              <div key={l} className="bg-white/6 dark:bg-ink/6 rounded-2xl p-7 border border-white/8 dark:border-ink/10">
                <Icon className="size-6 text-clay" />
                <p className="font-display text-4xl mt-5 text-cream dark:text-ink">{n}</p>
                <p className="text-sm text-cream/55 dark:text-ink/50 mt-2">{l}</p>
              </div>
            ))}
          </div>
          <Link to="/upload" className="inline-flex mt-12 bg-clay text-cream px-8 py-4 rounded-xl font-medium hover:bg-clay-soft hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-clay">
            Share your first recipe
          </Link>
        </div>
      </section>
    </Layout>
  );
}

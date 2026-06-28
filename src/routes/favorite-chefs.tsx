import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { creators as fallbackCreators, recipes as fallbackRecipes } from "@/data/mock";
import { followChef, getFavoriteChefs, unfollowChef, type FavoriteChefRecord } from "@/lib/kitchenApi";
import { ArrowRight, Heart, Search, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/favorite-chefs")({
  head: () => ({
    meta: [
      { title: "Favorite Chefs — The Kitchen Platform" },
      { name: "description", content: "Follow and manage your favorite Kitchen Platform chefs and creators." },
    ],
  }),
  component: FavoriteChefsPage,
});

const suggestedChefs = [
  { username: "david", name: "David Wu", handle: "@davidferments", specialty: "Fermentation", followers: "12.4k" },
  { username: "sarah", name: "Sarah Chen", handle: "@sarahcooks", specialty: "Plant-forward dinners", followers: "18.3k" },
  { username: "elena", name: "Elena Rossi", handle: "@elenarossi", specialty: "Handmade pasta", followers: "24.8k" },
];

function FavoriteChefsPage() {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<FavoriteChefRecord[]>(
    fallbackCreators.slice(0, 2).map((chef, index) => ({
      id: `local-chef-${index}`,
      chefUsername: chef.username,
      followedAt: new Date().toISOString(),
      chef: { ...chef, specialty: index === 0 ? "Handmade pasta" : "Classic baking", recipeCount: fallbackRecipes.filter((recipe) => recipe.creator.username === chef.username).length },
      recentUploads: fallbackRecipes.filter((recipe) => recipe.creator.username === chef.username).slice(0, 2),
    })),
  );
  const [status, setStatus] = useState("");

  const loadFavorites = () => {
    getFavoriteChefs()
      .then((data) => {
        setFavorites(data);
        setStatus("");
      })
      .catch(() => setStatus("Backend offline — showing local preview data."));
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const filteredChefs = useMemo(
    () => favorites.filter(({ chef }) =>
      query === "" ||
      chef.name.toLowerCase().includes(query.toLowerCase()) ||
      chef.handle.toLowerCase().includes(query.toLowerCase()) ||
      chef.bio.toLowerCase().includes(query.toLowerCase()) ||
      chef.specialty?.toLowerCase().includes(query.toLowerCase()),
    ),
    [favorites, query],
  );

  const handleUnfollow = async (id: string) => {
    setFavorites((current) => current.filter((item) => item.id !== id));
    try {
      await unfollowChef(id);
      setStatus("Chef removed from backend favorites.");
    } catch {
      setStatus("Backend offline — local preview chef removed only.");
    }
  };

  const handleFollow = async (username: string) => {
    try {
      const item = await followChef(username);
      setFavorites((current) => current.some((favorite) => favorite.chefUsername === username) ? current : [item, ...current]);
      setStatus("Chef saved to backend favorites.");
    } catch {
      setStatus("Start the backend first, then Follow will store this chef.");
    }
  };

  return (
    <Layout>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-8">
        <div className="grid lg:grid-cols-[1fr_0.8fr] gap-8 items-end">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-clay">
              <Heart className="size-4 fill-clay" /> Creator circle
            </span>
            <h1 className="font-display text-5xl sm:text-6xl mt-3">Favorite Chefs</h1>
            <p className="mt-3 text-ink/60 dark:text-ink/50 dark:text-ink/40 max-w-xl">Followed chefs are loaded from your backend database with recent uploads attached.</p>
            {status && <p className="text-sm text-clay font-medium mt-3">{status}</p>}
          </div>
          <div className="bg-ink text-cream rounded-3xl p-6 shadow-soft">
            <div className="flex items-center gap-3">
              <Users className="size-6 text-clay-soft" />
              <div>
                <p className="font-display text-3xl">{favorites.length} followed</p>
                <p className="text-sm text-cream/60">New recipes from your chef circle every week.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-ink/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chefs by name, specialty, or handle..."
            className="w-full bg-paper dark:bg-paper border border-ink/5 dark:border-ink/10 dark:border-ink/15 rounded-full pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-clay/40"
          />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {filteredChefs.map(({ id, chef, recentUploads }) => (
            <article key={id} className="bg-card dark:bg-card rounded-[2rem] p-5 sm:p-6 shadow-soft border border-ink/5 dark:border-ink/10 dark:border-ink/15 hover:-translate-y-0.5 hover:shadow-lg transition-all">
              <div className="flex gap-4">
                <Link to="/profile/$username" params={{ username: chef.username }} className="size-20 sm:size-24 rounded-3xl overflow-hidden bg-paper dark:bg-paper shrink-0">
                  <img src={chef.avatar} alt={chef.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link to="/profile/$username" params={{ username: chef.username }}><h2 className="font-display text-2xl leading-tight hover:text-clay transition-colors">{chef.name}</h2></Link>
                      <p className="text-xs text-ink/45 mt-1">{chef.handle}</p>
                    </div>
                    <button onClick={() => handleUnfollow(id)} className="bg-clay/10 text-clay px-3 py-1.5 rounded-full text-xs font-bold hover:bg-clay hover:text-cream transition-colors">Unfollow</button>
                  </div>
                  <p className="text-sm text-ink/65 mt-3 line-clamp-2">{chef.bio}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-5">
                <Stat label="Specialty" value={chef.specialty || "Home cooking"} />
                <Stat label="Followers" value={`${(chef.followers / 1000).toFixed(1)}k`} />
                <Stat label="Recipes" value={`${chef.recipeCount ?? recentUploads.length}`} />
              </div>

              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-moss">Recent uploads</p>
                <div className="mt-3 space-y-3">
                  {(recentUploads.length ? recentUploads : fallbackRecipes.slice(0, 2)).map((recipe) => (
                    <Link key={recipe.id} to="/recipe/$id" params={{ id: recipe.id }} className="flex items-center gap-3 group">
                      <img src={recipe.image} alt="" className="size-12 rounded-2xl object-cover" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate group-hover:text-clay transition-colors">{recipe.title}</p>
                        <p className="text-xs text-ink/45">{recipe.cookTime} · {recipe.difficulty}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-6">
                <Link to="/profile/$username" params={{ username: chef.username }} className="bg-ink text-cream px-4 py-2.5 rounded-full text-sm font-medium hover:bg-earth transition-colors">View Profile</Link>
                <Link to="/discover" className="bg-paper dark:bg-paper px-4 py-2.5 rounded-full text-sm font-medium hover:bg-clay/10 transition-colors inline-flex items-center gap-1.5">See Recipes <ArrowRight className="size-4" /></Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-paper/70 py-16 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-clay"><Sparkles className="size-4" /> Discover more chefs</span>
              <h2 className="font-display text-3xl sm:text-4xl mt-2">Creators you may like</h2>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {suggestedChefs.map((chef) => (
              <article key={chef.handle} className="bg-card dark:bg-card rounded-3xl p-6 shadow-soft border border-ink/5 dark:border-ink/10 dark:border-ink/15">
                <div className="size-16 rounded-3xl bg-clay/15 text-clay grid place-items-center font-display text-2xl">
                  {chef.name.split(" ").map((part) => part[0]).join("")}
                </div>
                <h3 className="font-display text-2xl mt-5">{chef.name}</h3>
                <p className="text-xs text-ink/45 mt-1">{chef.handle}</p>
                <p className="text-sm text-ink/65 mt-3">{chef.specialty}</p>
                <div className="flex items-center justify-between mt-5">
                  <span className="text-xs font-bold text-ink/45">{chef.followers} followers</span>
                  <button onClick={() => handleFollow(chef.username)} className="bg-clay text-cream px-4 py-2 rounded-full text-sm font-medium hover:scale-[1.02] active:scale-95 transition-transform">Follow</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper dark:bg-paper rounded-2xl p-3 min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold truncate">{label}</p>
      <p className="font-medium text-sm mt-1 truncate">{value}</p>
    </div>
  );
}

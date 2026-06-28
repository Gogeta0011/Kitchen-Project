import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { RecipeCard } from "@/components/site/RecipeCard";
import { useAuth } from "@/lib/auth-context";
import { getCollections, createCollection, deleteCollection, getCollectionRecipes, removeFromCollection, type Collection } from "@/lib/kitchenApi";
import type { Recipe } from "@/data/mock";
import { BookMarked, Plus, Trash2, ChevronRight, Loader2, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/collections")({
  head: () => ({ meta: [{ title: "Collections — The Kitchen Platform" }] }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeCol, setActiveCol] = useState<string | null>(null);
  const [colRecipes, setColRecipes] = useState<Recipe[]>([]);
  const [colLoading, setColLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getCollections().then(setCollections).finally(() => setLoading(false));
  }, [user]);

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const col = await createCollection(newName.trim());
      setCollections(prev => [col, ...prev]);
      setNewName("");
    } catch (e: any) {
      alert(e.message || "Could not create collection");
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this collection?")) return;
    await deleteCollection(id);
    setCollections(prev => prev.filter(c => c.id !== id));
    if (activeCol === id) { setActiveCol(null); setColRecipes([]); }
  };

  const openCollection = async (id: string) => {
    if (activeCol === id) { setActiveCol(null); setColRecipes([]); return; }
    setActiveCol(id);
    setColLoading(true);
    const { recipes } = await getCollectionRecipes(id);
    setColRecipes(recipes);
    setColLoading(false);
  };

  const handleRemoveFromCol = async (recipeId: string) => {
    if (!activeCol) return;
    await removeFromCollection(activeCol, recipeId);
    setColRecipes(prev => prev.filter(r => r.id !== recipeId));
    setCollections(prev => prev.map(c => c.id === activeCol ? { ...c, recipeCount: Math.max(0, (c.recipeCount || 1) - 1) } : c));
  };

  if (authLoading) return <Layout><div className="h-96 grid place-items-center"><Loader2 className="size-6 animate-spin text-clay" /></div></Layout>;

  if (!user) return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <BookMarked className="size-12 text-ink/20 mx-auto mb-4" />
        <h1 className="font-display text-2xl text-ink dark:text-ink mb-2">Collections</h1>
        <p className="text-ink/50 dark:text-ink/40 mb-6">Sign in to create and manage recipe collections</p>
        <Link to="/login" className="bg-clay text-cream px-6 py-3 rounded-full font-medium hover:bg-clay-soft transition-colors">Sign In</Link>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-ink dark:text-ink">Collections</h1>
            <p className="text-ink/50 dark:text-ink/40 mt-1">Organize recipes into named collections</p>
          </div>
        </div>

        {/* Create collection */}
        <div className="flex gap-3 mb-8">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="New collection name…"
            className="flex-1 bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-sm text-ink dark:text-ink placeholder:text-ink/30 focus:outline-none focus:border-clay"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="flex items-center gap-2 bg-clay text-cream px-5 py-3 rounded-xl font-medium hover:bg-clay-soft active:scale-95 disabled:opacity-50 transition-all"
          >
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-card dark:bg-card rounded-2xl animate-pulse" />)}
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="size-12 text-ink/20 mx-auto mb-3" />
            <p className="text-ink/40 dark:text-ink/30">No collections yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {collections.map(col => (
              <div key={col.id}>
                <div
                  className={`flex items-center justify-between p-4 bg-card dark:bg-card border rounded-2xl cursor-pointer transition-all ${activeCol === col.id ? "border-clay/40 dark:border-clay/30 shadow-soft" : "border-ink/8 dark:border-ink/12 hover:border-ink/15 dark:hover:border-ink/20"}`}
                  onClick={() => openCollection(col.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-clay/10 dark:bg-clay/15 grid place-items-center">
                      <BookMarked className="size-4 text-clay" />
                    </div>
                    <div>
                      <p className="font-medium text-ink dark:text-ink">{col.name}</p>
                      <p className="text-xs text-ink/40 dark:text-ink/30">{col.recipeCount || 0} recipes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(col.id); }}
                      className="size-8 grid place-items-center rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 text-ink/30 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <ChevronRight className={`size-4 text-ink/30 transition-transform ${activeCol === col.id ? "rotate-90" : ""}`} />
                  </div>
                </div>

                {activeCol === col.id && (
                  <div className="mt-3 mb-2 pl-4">
                    {colLoading ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
                        {[1,2,3].map(i => <div key={i} className="h-48 bg-card dark:bg-card rounded-2xl animate-pulse" />)}
                      </div>
                    ) : colRecipes.length === 0 ? (
                      <p className="text-sm text-ink/40 dark:text-ink/30 py-6 text-center">No recipes in this collection yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {colRecipes.map(recipe => (
                          <div key={recipe.id} className="relative group">
                            <RecipeCard recipe={recipe} />
                            <button
                              onClick={() => handleRemoveFromCol(recipe.id)}
                              className="absolute top-2 right-2 size-7 bg-red-500 text-white rounded-full grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

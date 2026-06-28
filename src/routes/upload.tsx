import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { categories } from "@/data/mock";
import { createRecipe } from "@/lib/kitchenApi";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { ImagePlus, Check, Eye, Loader2 } from "lucide-react";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Share your recipe — The Kitchen Platform" },
      { name: "description", content: "Upload a recipe or story. Fast, rewarding, made for the community." },
      { property: "og:title", content: "Share your recipe — The Kitchen Platform" },
      { property: "og:description", content: "Your kitchen, your community." },
    ],
  }),
  component: UploadPage,
});

const IMAGE_KEYS = ["heroPasta", "sourdough", "pesto", "salad", "chocolate", "croissant", "carbonara"];
const DIFFICULTIES = ["Easy", "Intermediate", "Advanced"];
const CUISINES = ["Italian", "French", "Asian", "Mexican", "American", "Mediterranean", "Indian", "International"];
const DIETS = ["Anything", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Low-Carb"];

function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="h-96 grid place-items-center">
          <Loader2 className="size-6 animate-spin text-clay" />
        </div>
      </Layout>
    );
  }
  const [preview, setPreview] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("Dinner");
  const [cuisine, setCuisine] = useState("International");
  const [diet, setDiet] = useState("Anything");
  const [difficulty, setDifficulty] = useState("Easy");
  const [prepTime, setPrepTime] = useState("15 min");
  const [cookTime, setCookTime] = useState("30 min");
  const [servings, setServings] = useState("4");
  const [tags, setTags] = useState("");
  const [imageKey, setImageKey] = useState("heroPasta");
  const [ingredients, setIngredients] = useState([
    { qty: "", item: "" },
    { qty: "", item: "" },
    { qty: "", item: "" },
  ]);
  const [steps, setSteps] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [newRecipeId, setNewRecipeId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Recipe title is required."); return; }
    if (!user) { setError("You must be signed in to upload a recipe."); return; }

    setSubmitting(true);
    setError("");

    try {
      const recipe = await createRecipe({
        title: title.trim(),
        description: desc.trim(),
        category,
        cuisine,
        diet,
        difficulty,
        prepTime,
        cookTime,
        servings: Number(servings) || 4,
        imageKey,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        ingredients: ingredients.filter(i => i.item.trim()),
        steps: steps.filter(s => s.trim()),
      });
      setNewRecipeId(recipe.id);
      setSubmitted(true);
    } catch (err) {
      setError("Could not save recipe. Make sure the backend is running (npm run backend).");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto px-6 py-32 text-center">
          <div className="size-16 rounded-full bg-clay/10 grid place-items-center mx-auto">
            <Check className="size-8 text-clay" />
          </div>
          <h1 className="font-display text-4xl mt-6">It's live.</h1>
          <p className="text-ink/60 dark:text-ink/50 dark:text-ink/40 mt-3">Your recipe is now in the database and visible to the community.</p>
          <div className="flex gap-3 justify-center mt-8">
            <Link to="/recipe/$id" params={{ id: newRecipeId }} className="bg-clay text-cream px-7 py-3.5 rounded-xl font-medium">View Recipe</Link>
            <Link to="/" className="bg-ink text-cream px-7 py-3.5 rounded-xl font-medium">Back to home</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-clay">New recipe</span>
            <h1 className="font-display text-4xl sm:text-5xl mt-3">Share what you cooked.</h1>
            <p className="mt-3 text-ink/60 dark:text-ink/50 dark:text-ink/40">Take 2 minutes. The community is waiting.</p>
          </div>
          <button onClick={() => setPreview(p => !p)} className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-ink/10 dark:border-ink/15 text-sm font-medium hover:bg-paper dark:bg-paper">
            <Eye className="size-4" /> {preview ? "Edit" : "Preview"}
          </button>
        </div>

        {preview ? (
          <div className="mt-10 bg-card dark:bg-card rounded-3xl border border-ink/5 dark:border-ink/10 dark:border-ink/15 overflow-hidden">
            <div className="aspect-[16/9] bg-paper dark:bg-paper grid place-items-center">
              <ImagePlus className="size-10 text-ink/20" />
            </div>
            <div className="p-7">
              <span className="text-[11px] font-bold uppercase tracking-widest text-clay">{category}</span>
              <h2 className="font-display text-3xl mt-2">{title || "Your recipe title"}</h2>
              <p className="mt-3 text-ink/70 dark:text-ink/60">{desc || "Your description will appear here."}</p>
              <div className="flex gap-4 mt-4 text-xs text-ink/50 dark:text-ink/40">
                <span>⏱ Prep: {prepTime}</span>
                <span>🔥 Cook: {cookTime}</span>
                <span>🍽 Serves: {servings}</span>
                <span>📊 {difficulty}</span>
              </div>
              <div className="mt-6 grid sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-display text-lg mb-2">Ingredients</h3>
                  <ul className="text-sm space-y-1.5 text-ink/70 dark:text-ink/60">
                    {ingredients.filter(i => i.item).map((i, k) => <li key={k}>· {i.qty} {i.item}</li>)}
                    {ingredients.filter(i => i.item).length === 0 && <li className="text-ink/30">Nothing yet</li>}
                  </ul>
                </div>
                <div>
                  <h3 className="font-display text-lg mb-2">Method</h3>
                  <ol className="text-sm space-y-1.5 text-ink/70 dark:text-ink/60 list-decimal pl-5">
                    {steps.filter(Boolean).map((s, k) => <li key={k}>{s}</li>)}
                    {steps.filter(Boolean).length === 0 && <li className="text-ink/30 list-none">Nothing yet</li>}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Image picker */}
            <Field label="Recipe image">
              <div className="grid grid-cols-4 gap-2">
                {IMAGE_KEYS.map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setImageKey(key)}
                    className={`aspect-square rounded-2xl border-2 transition-colors text-xs font-medium capitalize py-2 px-1 ${imageKey === key ? "border-clay bg-clay/10 text-clay" : "border-ink/10 dark:border-ink/15 bg-paper dark:bg-paper hover:border-clay/40"}`}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink/40 mt-1">Select a placeholder image (upload support coming soon)</p>
            </Field>

            <Field label="Recipe title *">
              <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Grandma's burnt-garlic arrabbiata" className="w-full bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-clay" />
            </Field>

            <Field label="Description">
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Tell the story behind this dish..." className="w-full bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-clay" />
            </Field>

            <div className="grid sm:grid-cols-2 gap-6">
              <Field label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-clay">
                  {categories.filter(c => c !== "For You").map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Cuisine">
                <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} className="w-full bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-clay">
                  {CUISINES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Diet">
                <select value={diet} onChange={(e) => setDiet(e.target.value)} className="w-full bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-clay">
                  {DIETS.map(d => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Difficulty">
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-clay">
                  {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Prep time">
                <input value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="15 min" className="w-full bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-clay" />
              </Field>
              <Field label="Cook time">
                <input value={cookTime} onChange={(e) => setCookTime(e.target.value)} placeholder="30 min" className="w-full bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-clay" />
              </Field>
              <Field label="Servings">
                <input type="number" min="1" max="100" value={servings} onChange={(e) => setServings(e.target.value)} className="w-full bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-clay" />
              </Field>
              <Field label="Tags (comma separated)">
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vegan, summer, quick" className="w-full bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-clay" />
              </Field>
            </div>

            <Field label="Ingredients">
              <div className="space-y-2">
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={ing.qty}
                      onChange={(e) => { const n = [...ingredients]; n[i] = { ...n[i], qty: e.target.value }; setIngredients(n); }}
                      placeholder="Qty (e.g. 2 cups)"
                      className="w-28 bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-clay"
                    />
                    <input
                      value={ing.item}
                      onChange={(e) => { const n = [...ingredients]; n[i] = { ...n[i], item: e.target.value }; setIngredients(n); }}
                      placeholder={`Ingredient ${i + 1}`}
                      className="flex-1 bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-clay"
                    />
                  </div>
                ))}
                <button type="button" onClick={() => setIngredients([...ingredients, { qty: "", item: "" }])} className="text-sm text-clay font-medium">+ Add ingredient</button>
              </div>
            </Field>

            <Field label="Steps">
              <div className="space-y-2">
                {steps.map((s, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="font-display text-2xl text-clay/60 shrink-0">{i + 1}</span>
                    <textarea value={s} onChange={(e) => { const n = [...steps]; n[i] = e.target.value; setSteps(n); }} rows={2} placeholder="Describe this step..." className="flex-1 bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-clay" />
                  </div>
                ))}
                <button type="button" onClick={() => setSteps([...steps, ""])} className="text-sm text-clay font-medium">+ Add step</button>
              </div>
            </Field>

            <div className="pt-6 flex justify-end gap-3 border-t border-ink/5 dark:border-ink/10 dark:border-ink/15">
              <button type="submit" disabled={submitting} className="bg-clay text-cream px-7 py-3 rounded-xl text-sm font-medium shadow-clay hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60 disabled:scale-100 flex items-center gap-2">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? "Saving..." : "Publish recipe"}
              </button>
            </div>
          </form>
        )}
      </section>
    </Layout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-ink/50 dark:text-ink/40">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

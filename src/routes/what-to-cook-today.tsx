import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { RecipeCard } from "@/components/site/RecipeCard";
import { recipes as fallbackRecipes } from "@/data/mock";
import { getRecipes, pickRecipe, saveRecipe } from "@/lib/kitchenApi";
import {
  ArrowRight,
  Bookmark,
  ChefHat,
  Clock,
  RefreshCw,
  Send,
  Sparkles,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/what-to-cook-today")({
  head: () => ({
    meta: [
      { title: "What Should I Cook Today? — The Kitchen Platform" },
      { name: "description", content: "A playful recipe picker that helps you decide what to cook based on mood, time, diet, and ingredients." },
    ],
  }),
  component: WhatToCookTodayPage,
});

const moods = ["Cozy", "Fresh", "Comfort", "Impressive", "Low-effort"];
const mealTypes = ["Breakfast", "Lunch", "Dinner", "Dessert", "Snack"];
const times = ["15 min", "30 min", "45 min", "Weekend"];
const diets = ["Anything", "Vegetarian", "Vegan", "Light", "Make-ahead"];
const ingredients = ["Pantry staples", "Fresh herbs", "Pasta", "Chocolate", "Bread basics"];

function fallbackReason(recipe: (typeof fallbackRecipes)[number], mood: string, time: string, diet: string, ingredient: string) {
  return [
    `${recipe.difficulty} enough for a ${mood.toLowerCase()} cooking mood`,
    `Fits your ${time.toLowerCase()} time target better than heavier options`,
    diet === "Anything" ? "No diet restriction means we can optimize for flavor" : `Matches your ${diet.toLowerCase()} preference`,
    `Uses a strong ${ingredient.toLowerCase()} flavor direction`,
  ];
}

function WhatToCookTodayPage() {
  const [mood, setMood] = useState(moods[0]);
  const [mealType, setMealType] = useState(mealTypes[2]);
  const [time, setTime] = useState(times[1]);
  const [diet, setDiet] = useState(diets[0]);
  const [ingredient, setIngredient] = useState(ingredients[0]);
  const [allRecipes, setAllRecipes] = useState(fallbackRecipes);
  const [selectedIndex, setSelectedIndex] = useState(2);
  const [chosenRecipe, setChosenRecipe] = useState(fallbackRecipes[2]);
  const [backupRecipes, setBackupRecipes] = useState(fallbackRecipes.slice(0, 3));
  const [whyPicked, setWhyPicked] = useState<string[]>(fallbackReason(fallbackRecipes[2], mood, time, diet, ingredient));
  const [isPicking, setIsPicking] = useState(false);
  const [hasPicked, setHasPicked] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    getRecipes()
      .then((data) => {
        setAllRecipes(data);
        setChosenRecipe(data[2] ?? data[0]);
        setBackupRecipes(data.filter((recipe) => recipe.id !== (data[2] ?? data[0]).id).slice(0, 3));
      })
      .catch(() => setStatus("Backend offline — showing local preview data."));
  }, []);

  const animatedRecipe = allRecipes[selectedIndex % allRecipes.length] ?? chosenRecipe;
  const visibleRecipe = isPicking ? animatedRecipe : chosenRecipe;

  const backups = useMemo(
    () => backupRecipes.length ? backupRecipes : allRecipes.filter((recipe) => recipe.id !== visibleRecipe.id).slice(0, 3),
    [allRecipes, backupRecipes, visibleRecipe.id],
  );

  const handlePick = async () => {
    setIsPicking(true);
    setHasPicked(false);
    setStatus("");

    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setSelectedIndex((current) => (current + step) % Math.max(allRecipes.length, 1));
    }, 95);

    try {
      const result = await pickRecipe({
        mood,
        mealType,
        timeAvailable: time,
        dietPreference: diet,
        ingredientsAvailable: [ingredient],
      });

      window.setTimeout(() => {
        window.clearInterval(timer);
        setChosenRecipe(result.pickedRecipe);
        setBackupRecipes(result.backupRecipes);
        setWhyPicked(result.whyPicked);
        setIsPicking(false);
        setHasPicked(true);
      }, 1000);
    } catch {
      window.setTimeout(() => {
        window.clearInterval(timer);
        const seed = `${mood}-${mealType}-${time}-${diet}-${ingredient}`.length;
        const localRecipe = allRecipes[seed % allRecipes.length] ?? fallbackRecipes[0];
        setChosenRecipe(localRecipe);
        setBackupRecipes(allRecipes.filter((recipe) => recipe.id !== localRecipe.id).slice(0, 3));
        setWhyPicked(fallbackReason(localRecipe, mood, time, diet, ingredient));
        setStatus("Backend offline — picked from local preview data.");
        setIsPicking(false);
        setHasPicked(true);
      }, 1000);
    }
  };

  const handleSave = async () => {
    try {
      await saveRecipe(visibleRecipe.id);
      setStatus("Saved to your backend cookbook.");
    } catch {
      setStatus("Start the backend first, then Save will store this recipe.");
    }
  };

  return (
    <Layout>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-8">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-12 items-center">
          <div className="space-y-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-clay">
              <Sparkles className="size-4" /> Recipe picker
            </span>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.95] text-balance">
              What Should I <span className="italic text-clay">Cook Today?</span>
            </h1>
            <p className="text-lg text-ink/70 dark:text-ink/60 max-w-xl leading-relaxed">
              Skip the scrolling. Tell us your mood, time, and ingredients — then let The Kitchen Platform choose a recipe from your stored backend data.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePick}
                disabled={isPicking}
                className="bg-clay text-cream px-7 py-3.5 rounded-xl font-medium shadow-clay hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-70 disabled:hover:scale-100 inline-flex items-center gap-2"
              >
                <RefreshCw className={`size-4 ${isPicking ? "animate-spin" : ""}`} />
                {isPicking ? "Picking..." : "Pick for Me"}
              </button>
              <Link to="/discover" className="border border-ink/10 dark:border-ink/15 px-7 py-3.5 rounded-xl font-medium hover:bg-paper dark:bg-paper transition-colors inline-flex items-center gap-2">
                Browse Recipes <ArrowRight className="size-4" />
              </Link>
            </div>
            {status && <p className="text-sm text-clay font-medium">{status}</p>}
          </div>

          <div className="relative">
            <div className={`rounded-[2rem] bg-card dark:bg-card shadow-2xl overflow-hidden border border-ink/5 dark:border-ink/10 dark:border-ink/15 ${hasPicked ? "animate-reveal-pop" : ""}`}>
              <div className="relative aspect-[4/3] bg-paper dark:bg-paper overflow-hidden">
                <img
                  src={visibleRecipe.image}
                  alt={visibleRecipe.title}
                  className={`w-full h-full object-cover transition-all duration-500 ${isPicking ? "scale-110 blur-[2px]" : "scale-100 blur-0"}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
                <div className="absolute left-5 right-5 bottom-5 text-cream">
                  <p className="text-xs uppercase tracking-[0.2em] font-bold text-cream/75">Today's pick</p>
                  <h2 className="font-display text-3xl sm:text-4xl mt-1 leading-tight">{visibleRecipe.title}</h2>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <InfoPill icon={Clock} label="Prep" value={visibleRecipe.prepTime} />
                  <InfoPill icon={Utensils} label="Cook" value={visibleRecipe.cookTime} />
                  <InfoPill icon={ChefHat} label="Level" value={visibleRecipe.difficulty} />
                  <InfoPill icon={Sparkles} label="Cuisine" value={visibleRecipe.tags[1] ?? visibleRecipe.category} />
                </div>
                <div className="flex flex-wrap gap-2 mt-5">
                  <Link to="/recipe/$id" params={{ id: visibleRecipe.id }} className="bg-ink text-cream px-4 py-2.5 rounded-full text-sm font-medium hover:bg-earth transition-colors">
                    View Recipe
                  </Link>
                  <button onClick={handleSave} className="bg-paper dark:bg-paper px-4 py-2.5 rounded-full text-sm font-medium hover:bg-clay/10 transition-colors inline-flex items-center gap-1.5"><Bookmark className="size-4" /> Save</button>
                  <button className="bg-paper dark:bg-paper px-4 py-2.5 rounded-full text-sm font-medium hover:bg-clay/10 transition-colors inline-flex items-center gap-1.5"><Send className="size-4" /> Share</button>
                  <button onClick={handlePick} className="bg-paper dark:bg-paper px-4 py-2.5 rounded-full text-sm font-medium hover:bg-clay/10 transition-colors inline-flex items-center gap-1.5"><RefreshCw className="size-4" /> Pick Again</button>
                </div>
              </div>
            </div>
            {isPicking && (
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="bg-cream/95 border border-clay/20 rounded-full px-5 py-3 shadow-soft text-sm font-bold text-clay animate-fade-up">
                  Shuffling stored recipe data...
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-paper/70 rounded-[2rem] p-4 sm:p-6 border border-ink/5 dark:border-ink/10 dark:border-ink/15">
          <div className="grid md:grid-cols-5 gap-4">
            <PickerGroup label="Mood" value={mood} options={moods} onChange={setMood} />
            <PickerGroup label="Meal" value={mealType} options={mealTypes} onChange={setMealType} />
            <PickerGroup label="Time" value={time} options={times} onChange={setTime} />
            <PickerGroup label="Diet" value={diet} options={diets} onChange={setDiet} />
            <PickerGroup label="Ingredients" value={ingredient} options={ingredients} onChange={setIngredient} />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid lg:grid-cols-[0.75fr_1.25fr] gap-8">
          <div className="bg-card dark:bg-card rounded-3xl p-6 shadow-soft border border-ink/5 dark:border-ink/10 dark:border-ink/15 h-fit">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-moss">Why this was picked</span>
            <ul className="mt-5 space-y-3">
              {whyPicked.map((reason) => (
                <li key={reason} className="flex gap-3 text-sm text-ink/70 dark:text-ink/60">
                  <span className="mt-0.5 size-5 rounded-full bg-clay/10 text-clay grid place-items-center shrink-0">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-end justify-between mb-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-clay">Backup ideas</span>
                <h2 className="font-display text-3xl mt-1">Still hungry for options?</h2>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {backups.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function PickerGroup({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-ink/45 mb-2">{label}</p>
      <div className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`shrink-0 px-3.5 py-2 rounded-full text-sm border transition-colors ${
              value === option ? "bg-ink text-cream border-ink" : "bg-card dark:bg-card border-ink/10 dark:border-ink/15 hover:border-clay/40"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoPill({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="bg-paper dark:bg-paper rounded-2xl p-3">
      <Icon className="size-4 text-clay mb-2" />
      <p className="text-[11px] uppercase tracking-widest text-ink/40 font-bold">{label}</p>
      <p className="font-medium text-ink mt-0.5">{value}</p>
    </div>
  );
}

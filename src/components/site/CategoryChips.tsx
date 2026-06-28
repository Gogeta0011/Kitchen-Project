import { categories } from "@/data/mock";

export function CategoryChips({ active = "For You", onChange }: { active?: string; onChange?: (c: string) => void }) {
  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center pb-1">
      {categories.map((c) => {
        const isActive = c === active;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange?.(c)}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm transition-colors shrink-0 ${
              isActive
                ? "bg-ink text-cream"
                : "bg-paper border border-ink/5 hover:border-clay/40 text-ink/80"
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

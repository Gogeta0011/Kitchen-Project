import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink/8 dark:border-ink/10 bg-paper/60 dark:bg-paper/30">
      <div className="mx-auto max-w-7xl px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <span className="font-display text-2xl font-bold text-clay">The Kitchen</span>
          <p className="mt-4 text-sm text-ink/55 dark:text-ink/50 max-w-sm leading-relaxed">
            Preserving the past, seasoning the future. Where recipes, stories, and home cooks come together.
          </p>
          <div className="mt-6 flex gap-3">
            {["Instagram", "Pinterest", "TikTok"].map(s => (
              <span key={s} className="text-xs font-medium text-ink/40 dark:text-ink/35 hover:text-clay dark:hover:text-clay cursor-pointer transition-colors">{s}</span>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest mb-5 text-ink/40 dark:text-ink/35">Explore</h4>
          <ul className="space-y-3 text-sm text-ink/60 dark:text-ink/50">
            {["Latest Recipes", "Blog Stories", "Creator Directory", "Shop Supplies"].map(l => (
              <li key={l} className="hover:text-clay dark:hover:text-clay cursor-pointer transition-colors">{l}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest mb-5 text-ink/40 dark:text-ink/35">Community</h4>
          <ul className="space-y-3 text-sm text-ink/60 dark:text-ink/50">
            {["Guidelines", "Ambassadors", "Events", "Help Center"].map(l => (
              <li key={l} className="hover:text-clay dark:hover:text-clay cursor-pointer transition-colors">{l}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/6 dark:border-ink/10">
        <div className="mx-auto max-w-7xl px-6 py-5 flex flex-col md:flex-row justify-between items-center gap-3 text-[10px] font-medium uppercase tracking-widest text-ink/35 dark:text-ink/30">
          <span>© {new Date().getFullYear()} The Kitchen Platform. All rights reserved.</span>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Cookies"].map(l => (
              <span key={l} className="hover:text-clay dark:hover:text-clay cursor-pointer transition-colors">{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

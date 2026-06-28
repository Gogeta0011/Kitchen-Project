import { Link } from "@tanstack/react-router";
import { Home, Users, ChefHat, Bookmark, Heart } from "lucide-react";

export function MobileBottomBar() {
  return (
    <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-ink/95 dark:bg-paper/95 backdrop-blur-xl text-cream dark:text-ink pl-2 pr-2 py-2 rounded-full shadow-2xl flex items-center gap-1 border border-white/10 dark:border-ink/15">
      <Link to="/" activeProps={{ className: "bg-white/20 dark:bg-ink/20" }} activeOptions={{ exact: true }} className="size-11 grid place-items-center rounded-full hover:bg-white/10 dark:hover:bg-ink/10 transition-colors" aria-label="Home">
        <Home className="size-5" />
      </Link>
      <Link to="/community" activeProps={{ className: "bg-white/20 dark:bg-ink/20" }} className="size-11 grid place-items-center rounded-full hover:bg-white/10 dark:hover:bg-ink/10 transition-colors" aria-label="Community">
        <Users className="size-5" />
      </Link>
      <Link to="/what-to-cook-today" className="size-11 grid place-items-center rounded-full bg-clay text-cream hover:bg-clay-soft hover:scale-105 active:scale-95 transition-all" aria-label="What to cook today">
        <ChefHat className="size-5" />
      </Link>
      <Link to="/saved-recipes" activeProps={{ className: "bg-white/20 dark:bg-ink/20" }} className="size-11 grid place-items-center rounded-full hover:bg-white/10 dark:hover:bg-ink/10 transition-colors" aria-label="Saved recipes">
        <Bookmark className="size-5" />
      </Link>
      <Link to="/favorite-chefs" activeProps={{ className: "bg-white/20 dark:bg-ink/20" }} className="size-11 grid place-items-center rounded-full hover:bg-white/10 dark:hover:bg-ink/10 transition-colors" aria-label="Favorite chefs">
        <Heart className="size-5" />
      </Link>
    </div>
  );
}

import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Plus, ChefHat, Menu, X, LogOut } from "lucide-react";
import { DarkModeToggle } from "./DarkModeToggle";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, setToken, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links: { to: string; label: string }[] = [
    { to: "/", label: "Home" },
    { to: "/community", label: "Community" },
    { to: "/what-to-cook-today", label: "Cook Today" },
    { to: "/saved-recipes", label: "Saved" },
    { to: "/favorite-chefs", label: "Chefs" },
  ];

  return (
    <>
      <nav
        className={`sticky top-0 z-50 w-full transition-all duration-500 ${
          scrolled
            ? "bg-cream/98 dark:bg-cream/99 border-b border-ink/8 dark:border-ink/12 shadow-sm py-0"
            : "bg-cream/95 dark:bg-cream/98 py-2"
        }`}
      >
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between transition-all duration-500 ${scrolled ? "h-14" : "h-20"}`}>
          {/* Logo */}
          <Link
            to="/"
            className={`font-display font-bold text-clay shrink-0 tracking-tight transition-all duration-500 ${scrolled ? "text-2xl" : "text-4xl"}`}
          >
            The Kitchen
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "bg-ink/8 text-ink dark:bg-ink/20" }}
                activeOptions={to === "/" ? { exact: true } : undefined}
                className="px-4 py-2 rounded-full text-sm font-medium text-ink/60 hover:text-ink hover:bg-ink/5 dark:hover:bg-ink/10 transition-all duration-200"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <DarkModeToggle />

            {!loading && (
              <>
                {user ? (
                  <>
                    <Link
                      to="/what-to-cook-today"
                      className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-clay bg-clay/10 hover:bg-clay/20 dark:bg-clay/15 dark:hover:bg-clay/25 px-3 py-2 rounded-full transition-colors"
                    >
                      <ChefHat className="size-3.5" /> Pick for me
                    </Link>
                    <Link
                      to="/upload"
                      className="flex items-center gap-1.5 bg-ink dark:bg-clay text-cream text-sm font-medium pl-3 pr-4 py-2 rounded-full hover:bg-earth dark:hover:bg-clay-soft hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Plus className="size-4" /> Upload
                    </Link>
                    <Link
                      to="/profile/$username"
                      params={{ username: user.username }}
                      className="flex items-center gap-1.5 text-ink/60 dark:text-ink/50 hover:text-ink dark:hover:text-ink px-3 py-2 rounded-full hover:bg-paper dark:hover:bg-paper transition-colors text-xs"
                    >
                      {user.username}
                    </Link>
                    <button
                      onClick={() => {
                        setToken(null);
                        navigate({ to: "/" });
                      }}
                      className="flex items-center gap-1.5 text-ink/60 dark:text-ink/50 hover:text-ink dark:hover:text-ink px-2 py-2 rounded-full hover:bg-paper dark:hover:bg-paper transition-colors"
                      title="Sign out"
                    >
                      <LogOut className="size-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-ink/60 hover:text-ink px-4 py-2 rounded-full transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className="flex items-center gap-1.5 bg-clay text-cream text-sm font-medium pl-3 pr-4 py-2 rounded-full hover:bg-clay-soft hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Plus className="size-4" /> Sign Up
                    </Link>
                  </>
                )}
              </>
            )}

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden size-9 grid place-items-center rounded-full hover:bg-paper transition-colors"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`md:hidden fixed inset-0 z-40 transition-all duration-300 ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        <div className={`absolute top-0 right-0 h-full w-72 bg-cream dark:bg-cream shadow-2xl flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between p-5 border-b border-ink/8">
            <span className="font-display text-xl text-clay">Menu</span>
            <button onClick={() => setMobileOpen(false)} className="size-8 grid place-items-center rounded-full hover:bg-paper">
              <X className="size-4" />
            </button>
          </div>
          <nav className="flex-1 p-5 flex flex-col gap-1">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                activeProps={{ className: "bg-clay/10 text-clay" }}
                activeOptions={to === "/" ? { exact: true } : undefined}
                className="px-4 py-3 rounded-xl text-sm font-medium text-ink/70 hover:text-ink hover:bg-paper transition-all"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="p-5 border-t border-ink/8 space-y-2">
            {user ? (
              <>
                <div className="text-xs text-ink/50 px-4 py-2">Signed in as {user.username}</div>
                <Link to="/upload" onClick={() => setMobileOpen(false)} className="w-full flex items-center justify-center gap-2 bg-clay text-cream py-3 rounded-xl font-medium">
                  <Plus className="size-4" /> Upload Recipe
                </Link>
                <button
                  onClick={() => {
                    setToken(null);
                    setMobileOpen(false);
                    navigate({ to: "/" });
                  }}
                  className="w-full flex items-center justify-center gap-2 text-ink/60 hover:text-ink py-3 rounded-xl font-medium"
                >
                  <LogOut className="size-4" /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full flex items-center justify-center gap-2 text-ink/60 hover:text-ink py-3 rounded-xl font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="w-full flex items-center justify-center gap-2 bg-clay text-cream py-3 rounded-xl font-medium"
                >
                  <Plus className="size-4" /> Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

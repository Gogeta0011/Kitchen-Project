import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored ? stored === "dark" : prefersDark;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="relative flex items-center gap-2 h-9 px-3 rounded-full border border-ink/10 bg-paper hover:border-clay/40 transition-all duration-300 group overflow-hidden"
    >
      <span className={`transition-all duration-300 ${isDark ? "opacity-100 scale-100" : "opacity-0 scale-75 absolute"}`}>
        <Sun className="size-4 text-clay" />
      </span>
      <span className={`transition-all duration-300 ${!isDark ? "opacity-100 scale-100" : "opacity-0 scale-75 absolute"}`}>
        <Moon className="size-4 text-ink/60 group-hover:text-ink" />
      </span>
      <span className="text-xs font-medium text-ink/60 group-hover:text-ink transition-colors">
        {isDark ? "Light" : "Dark"}
      </span>
    </button>
  );
}

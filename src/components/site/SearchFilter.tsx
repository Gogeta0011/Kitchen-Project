import { Search } from "lucide-react";

export function SearchFilter({
  query,
  onQueryChange,
  placeholder = "Search recipes...",
}: {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex-1 relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-ink/40" />
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-paper border border-ink/5 rounded-full pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-clay/40"
      />
    </div>
  );
}

import { Component, type ReactNode } from "react";
import { ChefHat } from "lucide-react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="size-16 bg-clay/10 dark:bg-clay/15 rounded-full grid place-items-center">
            <ChefHat className="size-8 text-clay" />
          </div>
          <h2 className="font-display text-2xl text-ink dark:text-ink">Something went wrong</h2>
          <p className="text-ink/50 dark:text-ink/40 max-w-sm">
            This section ran into an unexpected issue. Try refreshing the page.
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            className="bg-clay text-cream px-6 py-2.5 rounded-full font-medium hover:bg-clay-soft transition-colors"
          >
            Refresh page
          </button>
          {import.meta.env.DEV && (
            <details className="mt-4 text-left max-w-lg w-full">
              <summary className="text-xs text-ink/30 cursor-pointer">Error details (dev only)</summary>
              <pre className="mt-2 text-xs bg-paper dark:bg-paper p-3 rounded-lg overflow-auto text-red-600 dark:text-red-400">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

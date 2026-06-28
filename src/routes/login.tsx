import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { login } from "@/lib/kitchenApi";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(username, password);
      setToken(result.token);
      setUser(result);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-card dark:bg-card border border-ink/5 dark:border-ink/10 rounded-3xl p-8">
          <h1 className="font-display text-3xl text-ink dark:text-ink mb-2">Sign In</h1>
          <p className="text-sm text-ink/50 dark:text-ink/40 mb-6">Welcome back to the kitchen</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl flex gap-2 text-sm text-red-700 dark:text-red-200">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-ink/50 dark:text-ink/40">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="elena"
                className="w-full mt-1 bg-paper dark:bg-paper border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-ink dark:text-ink placeholder:text-ink/30 focus:outline-none focus:border-clay"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-ink/50 dark:text-ink/40">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full mt-1 bg-paper dark:bg-paper border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-ink dark:text-ink placeholder:text-ink/30 focus:outline-none focus:border-clay"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-clay text-cream py-3 rounded-xl font-medium hover:bg-clay-soft active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-ink/60 dark:text-ink/50">
            Don't have an account?{" "}
            <button
              onClick={() => navigate({ to: "/signup" })}
              className="text-clay hover:underline font-medium"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

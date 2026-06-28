import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { signup } from "@/lib/kitchenApi";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signup(username, email, password);
      setToken(result.token);
      setUser(result);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-card dark:bg-card border border-ink/5 dark:border-ink/10 rounded-3xl p-8">
          <h1 className="font-display text-3xl text-ink dark:text-ink mb-2">Create Account</h1>
          <p className="text-sm text-ink/50 dark:text-ink/40 mb-6">Join the kitchen community</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl flex gap-2 text-sm text-red-700 dark:text-red-200">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-ink/50 dark:text-ink/40">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="maria_cooks"
                className="w-full mt-1 bg-paper dark:bg-paper border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-ink dark:text-ink placeholder:text-ink/30 focus:outline-none focus:border-clay"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-ink/50 dark:text-ink/40">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria@kitchen.com"
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
                minLength={6}
              />
              <p className="text-xs text-ink/40 dark:text-ink/30 mt-1">At least 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-clay text-cream py-3 rounded-xl font-medium hover:bg-clay-soft active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-ink/60 dark:text-ink/50">
            Already have an account?{" "}
            <button
              onClick={() => navigate({ to: "/login" })}
              className="text-clay hover:underline font-medium"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

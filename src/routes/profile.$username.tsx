import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { RecipeCard } from "@/components/site/RecipeCard";
import { useAuth } from "@/lib/auth-context";
import { followChef, unfollowChef, updateProfile, deleteRecipe, uploadImage } from "@/lib/kitchenApi";
import { Loader2, Edit2, Trash2, Camera, Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const Route = createFileRoute("/profile/$username")({
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isMe = user?.username === username;

  const [chef, setChef] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [tab, setTab] = useState<"recipes" | "about">("recipes");

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/chefs/${encodeURIComponent(username)}`, {
      headers: user ? { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setLoading(false); return; }
        setChef(data.chef);
        setRecipes(data.recipes || []);
        setFollowing(data.isFollowing || false);
        setAvatarUrl(data.chef.avatarUrl || null);
        setEditName(data.chef.name || "");
        setEditBio(data.chef.bio || "");
        setEditSpecialty(data.chef.specialty || "");
      })
      .finally(() => setLoading(false));
  }, [username, user]);

  const handleFollow = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    setFollowPending(true);
    try {
      if (following) {
        await unfollowChef(username);
        setFollowing(false);
        setChef((c: any) => ({ ...c, followers: Math.max(0, (c.followers || 1) - 1) }));
      } else {
        await followChef(username);
        setFollowing(true);
        setChef((c: any) => ({ ...c, followers: (c.followers || 0) + 1 }));
      }
    } catch { /* silent */ }
    finally { setFollowPending(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, "kitchen/avatars");
      setAvatarUrl(url);
    } catch { alert("Image upload failed. Check Cloudinary settings."); }
  };

  const handleSaveProfile = async () => {
    setEditSaving(true);
    try {
      await updateProfile({ name: editName, bio: editBio, specialty: editSpecialty });
      setChef((c: any) => ({ ...c, name: editName, bio: editBio, specialty: editSpecialty, avatarUrl }));
      setEditing(false);
    } catch { alert("Could not save profile."); }
    finally { setEditSaving(false); }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm("Delete this recipe? This cannot be undone.")) return;
    try {
      await deleteRecipe(recipeId);
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
    } catch { alert("Could not delete recipe."); }
  };

  if (loading) return (
    <Layout>
      <div className="h-96 grid place-items-center">
        <Loader2 className="size-6 animate-spin text-clay" />
      </div>
    </Layout>
  );

  if (!chef) return (
    <Layout>
      <div className="max-w-2xl mx-auto p-20 text-center">
        <h1 className="font-display text-3xl text-ink dark:text-ink">Chef not found</h1>
        <Link to="/" className="text-clay mt-4 inline-block">Go home →</Link>
      </div>
    </Layout>
  );

  const displayAvatar = avatarUrl || chef.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${chef.username}`;

  return (
    <Layout>
      {/* Banner */}
      <div className="h-40 sm:h-52 bg-gradient-to-br from-clay/20 via-paper dark:via-paper to-moss/15 dark:to-moss/10" />

      <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-5">
          {/* Avatar */}
          <div className="relative group w-fit">
            <img
              src={displayAvatar}
              alt={chef.name}
              className="size-32 rounded-full object-cover ring-4 ring-cream dark:ring-paper shadow-lg"
            />
            {isMe && editing && (
              <>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-ink/50 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="size-6 text-white" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </>
            )}
          </div>

          {/* Name + actions */}
          <div className="flex-1 sm:pb-2">
            {editing ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="font-display text-3xl bg-transparent border-b-2 border-clay focus:outline-none text-ink dark:text-ink w-full"
                placeholder="Your name"
              />
            ) : (
              <h1 className="font-display text-4xl sm:text-5xl text-ink dark:text-ink">{chef.name}</h1>
            )}
            <p className="text-ink/40 dark:text-ink/30 mt-1 text-sm">{chef.handle || `@${chef.username}`}</p>
            {chef.specialty && !editing && (
              <p className="text-xs font-semibold uppercase tracking-widest text-clay mt-1">{chef.specialty}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 sm:pb-2">
            {isMe ? (
              editing ? (
                <>
                  <button
                    onClick={handleSaveProfile}
                    disabled={editSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-clay text-cream rounded-full text-sm font-medium hover:bg-clay-soft transition-colors cursor-pointer"
                  >
                    {editSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-2 px-5 py-2.5 border border-ink/10 dark:border-ink/15 rounded-full text-sm font-medium hover:bg-paper dark:hover:bg-paper transition-colors cursor-pointer"
                  >
                    <X className="size-4" /> Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-ink/10 dark:border-ink/15 rounded-full text-sm font-medium hover:bg-paper dark:hover:bg-paper transition-colors cursor-pointer"
                >
                  <Edit2 className="size-4" /> Edit Profile
                </button>
              )
            ) : (
              <button
                onClick={handleFollow}
                disabled={followPending}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  following
                    ? "bg-paper dark:bg-paper border border-ink/10 dark:border-ink/15 text-ink dark:text-ink"
                    : "bg-clay text-cream hover:bg-clay-soft"
                }`}
              >
                {followPending ? <Loader2 className="size-4 animate-spin inline" /> : following ? "Following" : "Follow"}
              </button>
            )}
          </div>
        </div>

        {/* Bio editing */}
        {editing ? (
          <div className="mt-6 space-y-3 max-w-xl">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-ink/40 dark:text-ink/30">Bio</label>
              <textarea
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Tell the community about yourself…"
                className="mt-1 w-full bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-sm text-ink dark:text-ink placeholder:text-ink/30 focus:outline-none focus:border-clay resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-ink/40 dark:text-ink/30">Specialty</label>
              <input
                value={editSpecialty}
                onChange={e => setEditSpecialty(e.target.value)}
                maxLength={100}
                placeholder="e.g. Italian cooking, Vegan baking…"
                className="mt-1 w-full bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-sm text-ink dark:text-ink placeholder:text-ink/30 focus:outline-none focus:border-clay"
              />
            </div>
          </div>
        ) : (
          chef.bio && <p className="mt-5 text-ink/70 dark:text-ink/60 max-w-2xl leading-relaxed">{chef.bio}</p>
        )}

        {/* Stats */}
        <div className="mt-6 flex gap-8 text-sm">
          <div>
            <span className="font-display text-2xl text-ink dark:text-ink">{(chef.followers || 0).toLocaleString()}</span>
            <span className="text-ink/40 dark:text-ink/30 ml-1.5">followers</span>
          </div>
          <div>
            <span className="font-display text-2xl text-ink dark:text-ink">{chef.following || 0}</span>
            <span className="text-ink/40 dark:text-ink/30 ml-1.5">following</span>
          </div>
          <div>
            <span className="font-display text-2xl text-ink dark:text-ink">{recipes.length}</span>
            <span className="text-ink/40 dark:text-ink/30 ml-1.5">recipes</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-10 border-b border-ink/8 dark:border-ink/12 flex gap-8">
          {(["recipes", "about"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 -mb-px transition-colors cursor-pointer ${
                tab === t ? "border-clay text-ink dark:text-ink" : "border-transparent text-ink/40 dark:text-ink/30 hover:text-ink dark:hover:text-ink"
              }`}
            >
              {t} {t === "recipes" && `(${recipes.length})`}
            </button>
          ))}
        </div>

        {/* Recipes tab */}
        {tab === "recipes" && (
          <div className="mt-8">
            {recipes.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-ink/40 dark:text-ink/30 mb-4">No recipes uploaded yet.</p>
                {isMe && (
                  <Link to="/upload" className="bg-clay text-cream px-6 py-3 rounded-full font-medium hover:bg-clay-soft transition-colors">
                    Upload your first recipe →
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map(r => (
                  <div key={r.id} className="relative group/card">
                    <RecipeCard recipe={r} />
                    {isMe && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity flex gap-1 z-10">
                        <Link
                          to="/recipe/$id"
                          params={{ id: r.id }}
                          className="size-8 bg-white dark:bg-ink/80 rounded-full grid place-items-center shadow text-ink/60 hover:text-clay transition-colors cursor-pointer"
                          title="View recipe"
                        >
                          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </Link>
                        <button
                          onClick={() => handleDeleteRecipe(r.id)}
                          className="size-8 bg-white dark:bg-ink/80 rounded-full grid place-items-center shadow text-ink/40 hover:text-red-500 transition-colors cursor-pointer"
                          title="Delete recipe"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* About tab */}
        {tab === "about" && (
          <div className="mt-8 max-w-xl space-y-5">
            <div className="bg-card dark:bg-card border border-ink/8 dark:border-ink/12 rounded-2xl p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink/30 dark:text-ink/25 mb-1">Specialty</p>
                <p className="text-ink dark:text-ink">{chef.specialty || "Not set"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink/30 dark:text-ink/25 mb-1">Bio</p>
                <p className="text-ink/70 dark:text-ink/60 leading-relaxed">{chef.bio || "No bio yet."}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink/30 dark:text-ink/25 mb-1">Member since</p>
                <p className="text-ink/70 dark:text-ink/60">The Kitchen Platform</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
}

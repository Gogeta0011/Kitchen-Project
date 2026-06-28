import { useState, useEffect } from "react";
import { Star, Send, Trash2, Loader2 } from "lucide-react";
import { getComments, postComment, deleteComment, rateRecipe, getMyRating, type Comment } from "@/lib/kitchenApi";
import { useAuth } from "@/lib/auth-context";
import { chefAvatar } from "@/lib/foodAssets";

type Props = { recipeId: string; recipeOwnerId?: string };

export function CommentSection({ recipeId, recipeOwnerId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getComments(recipeId),
      user ? getMyRating(recipeId) : Promise.resolve({ stars: null }),
    ]).then(([c, r]) => {
      setComments(c);
      setMyRating(r.stars);
    }).finally(() => setLoading(false));
  }, [recipeId, user]);

  const handlePost = async () => {
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      const comment = await postComment(recipeId, body.trim());
      setComments(prev => [...prev, comment]);
      setBody("");
    } catch { alert("Could not post comment. Make sure you're signed in."); }
    finally { setPosting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteComment(id);
      setComments(prev => prev.filter(c => c.id !== id));
    } catch { alert("Could not delete comment."); }
  };

  const handleRate = async (stars: number) => {
    if (!user) return alert("Sign in to rate recipes.");
    try {
      await rateRecipe(recipeId, stars);
      setMyRating(stars);
    } catch { alert("Could not submit rating."); }
  };

  return (
    <div className="mt-12 space-y-8">
      {/* Star Rating */}
      <div className="bg-card dark:bg-card border border-ink/8 dark:border-ink/12 rounded-2xl p-6">
        <h3 className="font-display text-lg text-ink dark:text-ink mb-3">Rate this recipe</h3>
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(s => (
            <button
              key={s}
              onClick={() => handleRate(s)}
              onMouseEnter={() => setHoverRating(s)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={`size-7 transition-colors ${
                  s <= (hoverRating || myRating || 0)
                    ? "fill-clay text-clay"
                    : "fill-transparent text-ink/20 dark:text-ink/20"
                }`}
              />
            </button>
          ))}
          {myRating && (
            <span className="ml-2 text-sm text-ink/50 dark:text-ink/40">Your rating: {myRating}/5</span>
          )}
        </div>
      </div>

      {/* Comments */}
      <div>
        <h3 className="font-display text-xl text-ink dark:text-ink mb-5">
          Comments {!loading && <span className="text-ink/40 text-base font-sans">({comments.length})</span>}
        </h3>

        {/* Post a comment */}
        {user ? (
          <div className="flex gap-3 mb-8">
            <img
              src={chefAvatar(undefined)}
              alt=""
              className="size-9 rounded-full object-cover shrink-0 mt-0.5"
            />
            <div className="flex-1">
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Share your thoughts on this recipe…"
                rows={2}
                className="w-full bg-card dark:bg-card border border-ink/10 dark:border-ink/15 rounded-xl px-4 py-3 text-sm text-ink dark:text-ink placeholder:text-ink/30 focus:outline-none focus:border-clay resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handlePost}
                  disabled={!body.trim() || posting}
                  className="flex items-center gap-2 bg-clay text-cream px-4 py-2 rounded-full text-sm font-medium hover:bg-clay-soft active:scale-95 disabled:opacity-50 transition-all"
                >
                  {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Post
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-paper dark:bg-paper rounded-xl text-sm text-ink/60 dark:text-ink/50 text-center">
            <a href="/login" className="text-clay hover:underline font-medium">Sign in</a> to leave a comment
          </div>
        )}

        {/* Comment list */}
        {loading ? (
          <div className="space-y-4">
            {[1,2].map(i => <div key={i} className="h-16 bg-paper dark:bg-paper rounded-xl animate-pulse" />)}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-ink/40 dark:text-ink/30 text-sm text-center py-8">No comments yet. Be the first!</p>
        ) : (
          <div className="space-y-5">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3 group">
                <img
                  src={c.author.avatarUrl || chefAvatar(c.author.avatarKey || undefined)}
                  alt={c.author.name}
                  className="size-9 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-ink dark:text-ink">{c.author.name || c.author.username}</span>
                    <span className="text-xs text-ink/35 dark:text-ink/30">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-ink/80 dark:text-ink/70 leading-relaxed">{c.body}</p>
                </div>
                {(user?.username === c.author.username) && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-ink/30 hover:text-red-500 self-start mt-1"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

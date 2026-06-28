import { useState, useEffect, useRef } from "react";
import { Bell, Check, MessageCircle, Heart, Star, UserPlus } from "lucide-react";
import { getNotifications, markAllRead, markRead, type Notification } from "@/lib/kitchenApi";
import { useAuth } from "@/lib/auth-context";

const iconMap: Record<string, React.ReactNode> = {
  comment: <MessageCircle className="size-3.5 text-blue-500" />,
  like: <Heart className="size-3.5 text-red-500" />,
  rating: <Star className="size-3.5 text-clay" />,
  follow: <UserPlus className="size-3.5 text-moss" />,
};

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = () => getNotifications().then(d => { setNotifications(d.notifications); setUnread(d.unread); }).catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open && unread > 0) {
      markAllRead().then(() => {
        setUnread(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
      }).catch(() => {});
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative size-9 grid place-items-center rounded-full hover:bg-paper dark:hover:bg-paper transition-colors"
      >
        <Bell className="size-4 text-ink/60 dark:text-ink/50" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 size-2 bg-clay rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-card dark:bg-card border border-ink/8 dark:border-ink/12 rounded-2xl shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink/6 dark:border-ink/10">
            <span className="text-sm font-semibold text-ink dark:text-ink">Notifications</span>
            {notifications.some(n => !n.read) && (
              <button onClick={() => markAllRead().then(() => { setUnread(0); setNotifications(prev => prev.map(n => ({ ...n, read: 1 }))); })} className="text-xs text-clay hover:underline flex items-center gap-1">
                <Check className="size-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ink/40 dark:text-ink/30">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-ink/4 dark:border-ink/8 last:border-0 transition-colors ${!n.read ? "bg-clay/5 dark:bg-clay/8" : ""}`}
                >
                  <div className="mt-0.5 shrink-0 size-5 grid place-items-center">
                    {iconMap[n.type] || <Bell className="size-3.5 text-ink/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink/80 dark:text-ink/70 leading-snug">{n.body}</p>
                    <p className="text-xs text-ink/35 dark:text-ink/30 mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</p>
                  </div>
                  {!n.read && <div className="size-1.5 bg-clay rounded-full mt-1.5 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

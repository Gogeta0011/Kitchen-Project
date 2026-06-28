import { Link } from "@tanstack/react-router";
import type { Blog } from "@/data/mock";

export function BlogCard({ blog }: { blog: Blog }) {
  return (
    <article className="group">
      <Link to="/blog/$id" params={{ id: blog.id }} className="block relative overflow-hidden rounded-3xl mb-4 bg-paper aspect-[4/5]">
        <img src={blog.image} alt={blog.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      </Link>
      <span className="text-xs font-bold text-clay uppercase tracking-widest">{blog.tag}</span>
      <Link to="/blog/$id" params={{ id: blog.id }}>
        <h3 className="font-display text-2xl mt-2 group-hover:text-clay transition-colors leading-tight">{blog.title}</h3>
      </Link>
      <p className="text-sm text-ink/60 mt-3 line-clamp-2">{blog.excerpt}</p>
      <div className="flex items-center gap-2 mt-4">
        <img src={blog.creator.avatar} alt="" className="size-6 rounded-full object-cover" loading="lazy" width={24} height={24} />
        <span className="text-xs text-ink/60">{blog.creator.name} · {blog.readTime}</span>
      </div>
    </article>
  );
}

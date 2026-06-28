import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { BlogCard } from "@/components/site/BlogCard";
import { findBlog, blogs, type Blog } from "@/data/mock";
import { Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";

export const Route = createFileRoute("/blog/$id")({
  loader: ({ params }) => {
    const blog = findBlog(params.id);
    if (!blog) throw notFound();
    return { blog };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.blog.title} — The Kitchen Platform` },
          { name: "description", content: loaderData.blog.excerpt },
          { property: "og:title", content: loaderData.blog.title },
          { property: "og:description", content: loaderData.blog.excerpt },
          { property: "og:image", content: loaderData.blog.image },
          { name: "twitter:image", content: loaderData.blog.image },
        ]
      : [],
  }),
  component: BlogPage,
  notFoundComponent: () => (
    <Layout>
      <div className="max-w-2xl mx-auto p-20 text-center">
        <h1 className="font-display text-3xl">Story not found</h1>
        <Link to="/discover" className="text-clay mt-4 inline-block">Browse stories →</Link>
      </div>
    </Layout>
  ),
});

function BlogPage() {
  const { blog } = Route.useLoaderData() as { blog: Blog };
  const related = blogs.filter((b) => b.id !== blog.id);

  return (
    <Layout>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-12">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-clay">{blog.tag}</span>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl mt-4 leading-[1.05] text-balance">{blog.title}</h1>
        <div className="mt-8 flex items-center justify-between border-y border-ink/5 dark:border-ink/10 dark:border-ink/15 py-5">
          <Link to="/profile/$username" params={{ username: blog.creator.username }} className="flex items-center gap-3">
            <img src={blog.creator.avatar} alt="" className="size-11 rounded-full object-cover" width={44} height={44} />
            <div>
              <p className="text-sm font-semibold">{blog.creator.name}</p>
              <p className="text-xs text-ink/50 dark:text-ink/40">{blog.readTime} · {blog.creator.handle}</p>
            </div>
          </Link>
          <div className="flex gap-1.5">
            <button className="size-10 rounded-full grid place-items-center hover:bg-paper dark:bg-paper" aria-label="Like"><Heart className="size-4" /></button>
            <button className="size-10 rounded-full grid place-items-center hover:bg-paper dark:bg-paper" aria-label="Save"><Bookmark className="size-4" /></button>
            <button className="size-10 rounded-full grid place-items-center hover:bg-paper dark:bg-paper" aria-label="Share"><Share2 className="size-4" /></button>
          </div>
        </div>
      </article>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-10">
        <div className="rounded-[2rem] overflow-hidden aspect-[16/9] bg-paper dark:bg-paper">
          <img src={blog.image} alt={blog.title} className="w-full h-full object-cover" />
        </div>
      </div>

      <article className="max-w-2xl mx-auto px-4 sm:px-6 mt-12 prose-lg">
        <p className="font-display text-2xl leading-snug text-ink/80 italic">{blog.excerpt}</p>
        <div className="mt-8 space-y-6 text-ink/80 leading-[1.8] text-[17px]">
          {blog.content.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </article>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 mt-16 bg-paper/60 rounded-3xl p-7">
        <div className="flex items-center gap-2 mb-5">
          <MessageCircle className="size-5" />
          <h3 className="font-display text-xl">Join the conversation</h3>
        </div>
        <textarea placeholder="Add your thoughts..." rows={3} className="w-full bg-card dark:bg-card rounded-2xl p-4 text-sm border border-ink/5 dark:border-ink/10 dark:border-ink/15 focus:outline-none focus:border-clay/40" />
        <div className="mt-3 flex justify-end">
          <button className="bg-ink text-cream px-5 py-2.5 rounded-full text-sm font-medium hover:bg-earth">Post comment</button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-24">
        <h2 className="font-display text-3xl mb-8">More from the journal</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {related.map((b) => <BlogCard key={b.id} blog={b} />)}
        </div>
      </section>
    </Layout>
  );
}

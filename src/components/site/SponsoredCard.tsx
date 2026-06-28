import { sponsored } from "@/data/mock";

export function SponsoredCard() {
  return (
    <article className="bg-moss/5 border border-moss/10 rounded-3xl p-7 flex flex-col justify-between min-h-full">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-moss/70">{sponsored.label} · Sponsored</span>
        <h3 className="font-display text-2xl mt-4 text-earth leading-tight">{sponsored.title}</h3>
        <p className="text-sm text-earth/70 mt-2 leading-relaxed">{sponsored.copy}</p>
      </div>
      <div className="overflow-hidden rounded-xl my-6 aspect-video bg-moss/10">
        <img src={sponsored.image} alt="Handcrafted ceramic bowls" loading="lazy" className="w-full h-full object-cover" />
      </div>
      <button className="w-full py-3 bg-moss text-cream rounded-xl text-sm font-medium hover:bg-earth transition-colors">
        {sponsored.cta}
      </button>
    </article>
  );
}

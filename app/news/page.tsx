"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PublicMetric, PublicPageHero } from "@/components/site/PublicChrome";
import SiteIcon from "@/components/site/SiteIcon";

function StorySeparator() {
  return (
    <div className="flex items-center gap-4 py-2">
      <span className="flex-1 h-px bg-gradient-to-r from-transparent to-white/8" />
      <Image
        src="/images/millstadt-ems/crest.png"
        alt=""
        width={16}
        height={16}
        className="shrink-0 opacity-30"
        style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.2)" }}
      />
      <span className="flex-1 h-px bg-gradient-to-l from-transparent to-white/8" />
    </div>
  );
}

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  image: string | null;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/millstadt-news")
      .then(r => r.json())
      .then(d => {
        if (d.ok) setItems(d.items);
        else setError(true);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return (
    <>
      <PublicPageHero
        eyebrow="Local News"
        title="Millstadt"
        accent="News"
        description={(
          <>
            Latest stories from{" "}
            <a href="https://www.millstadtnews.com" target="_blank" rel="noopener noreferrer" className="text-slate-200 hover:text-white underline underline-offset-4 transition-colors">
              millstadtnews.com
            </a>
            , updated automatically.
          </>
        )}
      >
        <PublicMetric label="Source" value="Local" tone="gold" />
        <PublicMetric label="Refresh" value="Auto" tone="cyan" />
      </PublicPageHero>

      <section className="py-14 bg-[#040d1a]">
        <div className="wrap max-w-4xl">
          {loading && (
            <div className="space-y-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-36 rounded-2xl bg-white/3 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-20 border border-white/10 rounded-2xl bg-[#071428]/60">
              <span className="mems-icon-tile mx-auto mb-4"><SiteIcon name="newspaper" /></span>
              <p className="text-slate-300 font-bold">Couldn&apos;t load news right now.</p>
              <p className="text-slate-700 text-sm mt-2">Check back in a few minutes or visit millstadtnews.com directly.</p>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="text-center py-20 border border-white/10 rounded-2xl bg-[#071428]/60">
              <span className="mems-icon-tile mx-auto mb-4"><SiteIcon name="file" /></span>
              <p className="text-slate-300 font-bold">No news stories found.</p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div>
              {items.map((item, i) => (
                <div key={i}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-5 bg-[#071428] hover:bg-[#0a1c38] border border-white/8 hover:border-white/14 rounded-2xl p-5 transition-all duration-200"
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt=""
                        className="w-28 h-20 object-cover rounded-xl shrink-0 bg-white/5"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <div className="flex flex-col justify-between min-w-0">
                      <div>
                        <h2 className="text-white font-black text-base leading-snug mb-1.5 group-hover:text-[#f0b429] transition-colors line-clamp-2">
                          {item.title}
                        </h2>
                        {item.description && (
                          <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-slate-500 text-xs">{timeAgo(item.pubDate)}</span>
                        <span className="flex items-center gap-1 text-slate-500 group-hover:text-[#f0b429] text-xs font-bold transition-colors">
                          Read more
                          <SiteIcon name="external" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </a>
                  {i < items.length - 1 && <StorySeparator />}
                </div>
              ))}
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="mt-10 text-center">
              <a
                href="https://www.millstadtnews.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold transition-colors"
              >
                View all stories on millstadtnews.com
                <SiteIcon name="external" className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </section>
      </>
  );
}

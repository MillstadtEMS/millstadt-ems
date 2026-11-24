import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import verified from "@/lib/millstadt-news/verified.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publisher = "https://www.millstadtnews.com";
const words: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };

function plain(input: string) {
  return input.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1").replace(/<[^>]*>/g, " ")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, key: string) => {
      if (key[0] !== "#") return words[key.toLowerCase()] ?? match;
      const code = key[1].toLowerCase() === "x" ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }).replace(/\s+/g, " ").trim();
}

function article(title: string, link: string, date: string, excerpt: string) {
  let url: URL;
  try { url = new URL(link); } catch { return null; }
  const text = plain(title);
  if (!text || url.protocol !== "https:" || !["www.millstadtnews.com", "millstadtnews.com"].includes(url.host) ||
      url.username || url.password || !Number.isFinite(Date.parse(date))) return null;
  return { title: text, link: url.href, pubDate: new Date(date).toISOString(), description: plain(excerpt).slice(0, 200), image: null };
}

async function request(path: string, accept: string) {
  const res = await fetch(publisher + path, {
    cache: "no-store", signal: AbortSignal.timeout(3500),
    headers: { Accept: accept, "User-Agent": "MillstadtEMS-NewsFeed/1.0 (+https://www.millstadtems.org/news)" },
  });
  if (!res.ok) throw new Error(`Publisher returned ${res.status}`);
  return res;
}

async function wordpress() {
  const response = await request("/wp-json/wp/v2/posts?per_page=12&orderby=date&order=desc&_fields=title,link,date_gmt,excerpt", "application/json");
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw new Error("Unexpected publisher response");
  return rows.flatMap(row => {
    if (typeof row?.title?.rendered !== "string" || typeof row?.link !== "string" || typeof row?.date_gmt !== "string") return [];
    const item = article(row.title.rendered, row.link, row.date_gmt + "Z", typeof row.excerpt?.rendered === "string" ? row.excerpt.rendered : "");
    return item ? [item] : [];
  });
}

async function rss() {
  const xml = await (await request("/feed/", "application/rss+xml, application/xml")).text();
  const items = [];
  for (const [, block] of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const tag = (name: string) => block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"))?.[1]?.trim() ?? "";
    const item = article(tag("title"), plain(tag("link")), tag("pubDate"), tag("description"));
    if (item) items.push(item);
    if (items.length === 12) break;
  }
  return items;
}

// Cache only a successful, validated publication. A failed revalidation leaves the previous data in place.
const latest = unstable_cache(async () => {
  for (const read of [wordpress, rss]) {
    try {
      const items = await read();
      if (items.length) return { checkedAt: new Date().toISOString(), items };
    } catch { /* Try the publisher's other public format. */ }
  }
  throw new Error("Publisher temporarily unavailable");
}, ["millstadt-publisher-news-v2"], { revalidate: 1800 });

export async function GET() {
  try {
    const data = await latest();
    return NextResponse.json({ ok: true, ...data, stale: Date.now() - Date.parse(data.checkedAt) > 3_600_000 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: true, ...verified, stale: true }, { headers: { "Cache-Control": "no-store" } });
  }
}

/**
 * GET /api/millstadt-news
 * Server-side scrape of millstadtnews.com RSS feed.
 * Cached for 30 minutes so we don't hammer their server.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 1800; // 30 min cache

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  image: string | null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "").trim();
}

function extractImage(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

export async function GET() {
  try {
    const res = await fetch("https://www.millstadtnews.com/feed/", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MillstadtEMS/1.0)" },
      next: { revalidate: 1800 },
    });

    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);

    const xml  = await res.text();
    const items: NewsItem[] = [];

    // Parse RSS items
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of itemMatches) {
      const block = match[1];

      const title    = stripHtml(block.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/)?.[1] ?? block.match(/<title>(.+?)<\/title>/)?.[1] ?? "");
      const link     = block.match(/<link>(.+?)<\/link>/)?.[1]?.trim() ?? block.match(/<guid[^>]*>(.+?)<\/guid>/)?.[1]?.trim() ?? "";
      const pubDate  = block.match(/<pubDate>(.+?)<\/pubDate>/)?.[1]?.trim() ?? "";
      const descRaw  = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ?? block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "";
      const image    = extractImage(block.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ?? descRaw) ?? extractImage(block.match(/<media:content[^>]+url=["']([^"']+)["']/)?.[0] ?? "");
      const description = stripHtml(descRaw).slice(0, 200).trim();

      if (title && link) items.push({ title, link, pubDate, description, image });
      if (items.length >= 12) break;
    }

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    return NextResponse.json({ ok: false, items: [], error: String(err) });
  }
}

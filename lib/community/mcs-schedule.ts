import "server-only";

import { z } from "zod";
import { sql } from "@/lib/neon";
import {
  parseMcsScheduleArticle,
  type McsScheduleArticle,
  type McsScheduleEvent,
} from "@/lib/community/mcs-schedule-parser";

const MCS_ARTICLES_FEED_URL =
  "https://thrillshare-cmsv2.services.thrillshare.com/api/v2/s/35714/articles?page_size=20";
const REFRESH_AFTER_MS = 15 * 60 * 1000;

const articlesFeedSchema = z.object({
  articles: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string(),
    published_at: z.string(),
    content: z.string(),
  })),
});

const scheduleEventSchema = z.object({
  id: z.string(),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string(),
  timeLabel: z.string().nullable(),
  startsAt: z.string(),
});

const snapshotSchema = z.object({
  sourceArticleId: z.string(),
  sourceTitle: z.string(),
  sourceUrl: z.string(),
  publishedAt: z.string(),
  fetchedAt: z.string(),
  events: z.array(scheduleEventSchema),
});

export type McsScheduleSnapshot = z.infer<typeof snapshotSchema>;

let schemaPromise: Promise<void> | null = null;

function ensureMcsScheduleSchema() {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS mcs_schedule_snapshots (
        source_article_id TEXT PRIMARY KEY,
        source_title      TEXT NOT NULL,
        source_url        TEXT NOT NULL,
        published_at      TIMESTAMPTZ NOT NULL,
        events            JSONB NOT NULL,
        fetched_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await db`
      CREATE INDEX IF NOT EXISTS mcs_schedule_snapshots_published_idx
      ON mcs_schedule_snapshots (published_at DESC)
    `;
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

function isoValue(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  return date.toISOString();
}

async function loadSavedSnapshot(): Promise<McsScheduleSnapshot | null> {
  await ensureMcsScheduleSchema();
  const db = sql();
  const rows = await db`
    SELECT source_article_id, source_title, source_url, published_at, events, fetched_at
    FROM mcs_schedule_snapshots
    ORDER BY published_at DESC
    LIMIT 1
  ` as unknown as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row) return null;

  const parsed = snapshotSchema.safeParse({
    sourceArticleId: row.source_article_id,
    sourceTitle: row.source_title,
    sourceUrl: row.source_url,
    publishedAt: isoValue(row.published_at),
    fetchedAt: isoValue(row.fetched_at),
    events: typeof row.events === "string" ? JSON.parse(row.events) : row.events,
  });
  return parsed.success ? parsed.data : null;
}

async function saveSnapshot(snapshot: McsScheduleSnapshot) {
  await ensureMcsScheduleSchema();
  const db = sql();
  await db`
    INSERT INTO mcs_schedule_snapshots (
      source_article_id, source_title, source_url, published_at, events, fetched_at
    ) VALUES (
      ${snapshot.sourceArticleId},
      ${snapshot.sourceTitle},
      ${snapshot.sourceUrl},
      ${snapshot.publishedAt},
      ${JSON.stringify(snapshot.events)}::jsonb,
      ${snapshot.fetchedAt}
    )
    ON CONFLICT (source_article_id) DO UPDATE SET
      source_title = EXCLUDED.source_title,
      source_url = EXCLUDED.source_url,
      published_at = EXCLUDED.published_at,
      events = EXCLUDED.events,
      fetched_at = EXCLUDED.fetched_at
  `;
}

async function fetchArticles() {
  const response = await fetch(MCS_ARTICLES_FEED_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Millstadt EMS website schedule monitor (millstadtems.org)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`MCS announcements returned ${response.status}`);
  const parsed = articlesFeedSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("MCS announcements response did not match the expected shape");
  return parsed.data.articles;
}

function scheduleSnapshot(articles: Awaited<ReturnType<typeof fetchArticles>>): McsScheduleSnapshot {
  const candidates = articles
    .filter((article) => /^Student Announcements\b/i.test(article.title.trim()))
    .sort((left, right) => Date.parse(right.published_at) - Date.parse(left.published_at));

  for (const article of candidates) {
    const normalized: McsScheduleArticle = {
      id: String(article.id),
      title: article.title.trim(),
      publishedAt: new Date(article.published_at).toISOString(),
      content: article.content,
    };
    const events: McsScheduleEvent[] = parseMcsScheduleArticle(normalized);
    if (!events.length) continue;

    return {
      sourceArticleId: normalized.id,
      sourceTitle: normalized.title,
      sourceUrl: `https://www.mccsd160.com/article/${normalized.id}`,
      publishedAt: normalized.publishedAt,
      fetchedAt: new Date().toISOString(),
      events,
    };
  }

  throw new Error("No current MCS announcement contained a usable athletics schedule");
}

export async function refreshMcsSchedule(): Promise<McsScheduleSnapshot> {
  const snapshot = scheduleSnapshot(await fetchArticles());
  try {
    await saveSnapshot(snapshot);
  } catch (error) {
    console.warn("MCS schedule log could not be updated", error instanceof Error ? error.message : error);
  }
  return snapshot;
}

export async function getMcsScheduleSnapshot(): Promise<McsScheduleSnapshot> {
  let saved: McsScheduleSnapshot | null = null;
  try {
    saved = await loadSavedSnapshot();
  } catch (error) {
    console.warn("MCS saved schedule could not be read", error instanceof Error ? error.message : error);
  }

  const fetchedAt = saved ? Date.parse(saved.fetchedAt) : Number.NaN;
  if (saved && Number.isFinite(fetchedAt) && Date.now() - fetchedAt < REFRESH_AFTER_MS) return saved;

  try {
    return await refreshMcsSchedule();
  } catch (error) {
    if (saved) return saved;
    throw error;
  }
}

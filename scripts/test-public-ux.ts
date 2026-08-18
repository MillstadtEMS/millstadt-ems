import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  isPublicMediaCollection,
  toPublicMediaItems,
} from "../lib/public-media";

const root = process.cwd();
const source = (path: string) => readFile(resolve(root, path), "utf8");

async function main() {
  assert.equal(isPublicMediaCollection("hero"), true);
  assert.equal(isPublicMediaCollection("gallery"), true);
  assert.equal(isPublicMediaCollection("draft"), false);
  assert.equal(isPublicMediaCollection(null), false);

  assert.deepEqual(toPublicMediaItems([]), []);
  assert.deepEqual(
    toPublicMediaItems([
      {
        id: "internal-id",
        collection: "hero",
        sortOrder: 8,
        url: "https://example.public.blob.vercel-storage.com/hero.jpg",
        altText: "  Ambulance crew  ",
        brightness: 0.7,
      },
      { url: "", altText: "Unpublished empty row" },
      { url: "/images/millstadt-ems/draft.jpg", published: false },
      { url: "https://unapproved.example/photo.jpg" },
    ]),
    [{
      url: "https://example.public.blob.vercel-storage.com/hero.jpg",
      altText: "Ambulance crew",
      brightness: 0.7,
    }],
  );
  assert.deepEqual(
    toPublicMediaItems([{ url: "/images/millstadt-ems/hero.jpg", brightness: 5 }]),
    [{ url: "/images/millstadt-ems/hero.jpg", altText: "", brightness: 1 }],
  );

  const [nav, footer, pwa, worker, hero, gallery, publicMediaRoute, adminMediaRoute] = await Promise.all([
    source("components/Nav.tsx"),
    source("components/Footer.tsx"),
    source("components/PwaRegistration.tsx"),
    source("public/sw.js"),
    source("components/HeroCarousel.tsx"),
    source("app/gallery/GalleryGrid.tsx"),
    source("app/api/public/media/route.ts"),
    source("app/api/admin/media/route.ts"),
  ]);

  const clearWeatherStart = nav.indexOf("Desktop, all-clear");
  const clearWeatherEnd = nav.indexOf("</span>", nav.indexOf("</span>", clearWeatherStart) + 1);
  assert.ok(clearWeatherStart > -1 && clearWeatherEnd > clearWeatherStart);
  assert.doesNotMatch(nav.slice(clearWeatherStart, clearWeatherEnd), /✓/);
  assert.match(nav, /⚠/);

  for (const destination of [
    "/about",
    "/weather",
    "/traffic",
    "/fleet",
    "/medical-control",
    "/community-education",
    "/events",
    "/kids-club",
    "/billing",
    "/financials-information-hub",
    "/donate",
    "/forms",
    "/contact",
    "/privacy",
  ]) {
    assert.ok(footer.includes(`"${destination}"`), `Footer is missing ${destination}`);
  }
  assert.match(footer, /100 E Laurel St, Millstadt, IL 62260/);
  assert.match(footer, /mailto:millstadtems@gmail\.com/);
  assert.match(footer, /SITE_VERSION/);
  assert.match(footer, /SITE_BUILD_REVISION/);
  assert.match(footer, /millstadt:open-privacy/);
  assert.match(footer, /aria-controls="footer-details"/);
  assert.match(footer, /aria-expanded=\{open\}/);
  assert.match(footer, /title=\{open/);
  assert.match(footer, /min-h-11/);
  assert.doesNotMatch(footer, /position:\s*"fixed"|PEEK|onMouseEnter/);

  assert.match(pwa, /process\.env\.NODE_ENV !== "production"/);
  assert.match(pwa, /localhost|127\.0\.0\.1|::1/);
  assert.match(pwa, /\.filter\(isMillstadtRegistration\)/);
  assert.match(pwa, /startsWith\(MILLSTADT_PUBLIC_CACHE_PREFIX\)/);
  assert.match(pwa, /updateViaCache:\s*"none"/);
  assert.match(pwa, /SITE_BUILD_REVISION/);

  assert.match(worker, /searchParams\.get\("revision"\)/);
  assert.match(worker, /IS_LOOPBACK/);
  assert.match(worker, /credentials:\s*"omit"/);
  assert.match(worker, /no-store\|private/);
  assert.match(worker, /pathname\.startsWith\(`\$\{prefix\}\/`\)/);
  assert.match(worker, /cache\.match\("\/offline"\)/);

  assert.match(publicMediaRoute, /export async function GET/);
  assert.doesNotMatch(publicMediaRoute, /export async function (?:POST|PUT|PATCH|DELETE)|requireAdmin/);
  assert.match(publicMediaRoute, /isPublicMediaCollection/);
  assert.match(publicMediaRoute, /toPublicMediaItems/);
  assert.match(publicMediaRoute, /public, max-age=60, s-maxage=300/);
  assert.match(adminMediaRoute, /export async function POST/);
  assert.match(adminMediaRoute, /export async function DELETE/);
  assert.match(adminMediaRoute, /requireAdmin/);

  assert.match(hero, /fetch\("\/api\/public\/media\?collection=hero"/);
  assert.doesNotMatch(hero, /\/api\/admin\/media/);
  assert.match(hero, /images\.length < 2/);
  assert.match(hero, /prefers-reduced-motion: reduce/);
  assert.match(hero, /visibilitychange/);
  assert.match(hero, /timeouts\.forEach\(\(timeoutId\) => window\.clearTimeout\(timeoutId\)\)/);
  assert.match(hero, /controller\.abort\(\)/);

  assert.match(gallery, /fetch\("\/api\/public\/media\?collection=gallery"/);
  assert.doesNotMatch(gallery, /\/api\/admin\/media/);
  assert.match(gallery, /controller\.abort\(\)/);

  console.log("Focused public UX checks passed (media, weather, footer, PWA, hero, gallery)." );
}

void main();

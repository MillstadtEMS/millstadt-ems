// Reproducible, explicitly invoked source packaging. No network or secrets.
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const sourceRoot = process.argv[2] && resolve(process.argv[2]);
if (!sourceRoot)
  throw new Error(
    "Usage: node scripts/vendor-ten-eight.mjs /absolute/path/to/ten-eight",
  );
const files = [
  "index.html",
  "app.js",
  "styles.css",
  "operational-map.js",
  "operational-map.css",
  "voice.js",
  "radio-player.js",
  "private-note-vault.js",
  "ten-eight-mark.svg",
  "ten-eight-mark-light.svg",
  "icons/app-icon.svg",
  "icons/apple-touch-icon.png",
  "icons/fire.svg",
  "icons/ems.svg",
  "icons/police.svg",
  "icons/mixed.svg",
  "vendor/leaflet/leaflet.js",
  "vendor/leaflet/leaflet.css",
  "vendor/leaflet/LICENSE",
];
const mime = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
};
const assets = {},
  sourceHashes = {},
  packagedHashes = {};
const digest = (value) => createHash("sha256").update(value).digest("hex");
function replaceOnce(text, before, after) {
  if (text.split(before).length !== 2)
    throw new Error(`Packaging anchor changed: ${before.slice(0, 60)}`);
  return text.replace(before, after);
}
for (const name of files) {
  let bytes = await readFile(join(sourceRoot, "web", name));
  sourceHashes[name] = digest(bytes);
  const ext = name.split(".").pop();
  if (["html", "js", "css", "svg"].includes(ext)) {
    let text = bytes.toString("utf8");
    if (name === "index.html") {
      text = text
        .replace(/^.*rel="manifest".*\n/gm, "")
        .replace(/^.*src="\/install.js".*\n/gm, "")
        .replace(
          '<script type="module" src="/app.js"></script>',
          '<script type="module" src="/app.js"></script>\n    <script type="module" src="/portal.js"></script>',
        );
      text = text.replace(
        "<title>Ten-Eight by Flux911</title>",
        '<title>Ten-Eight · Millstadt EMS portal</title>\n    <meta name="robots" content="noindex,nofollow">',
      );
    }
    if (name === "app.js") {
      text = replaceOnce(
        text,
        '      state.view = "command";\n      location.hash = "#command";',
        '      const portalDispatch = location.pathname.replace(/\\/$/, "") === "/ten-eight/dispatch";\n      state.view = portalDispatch ? "settings" : "command";\n      state.selected = portalDispatch ? "dispatch-test" : null;\n      location.hash = portalDispatch ? "#settings/dispatch-test" : "#command";',
      );
      text = replaceOnce(
        text,
        "    if (options.text) {",
        '    if (res.headers.get("X-Ten-Eight-Portal") === "signin") {\n      clearSession();\n      location.replace(location.pathname.endsWith("/dispatch") ? "/ten-eight/dispatch" : "/ten-eight");\n      throw new Error("The website portal session ended.");\n    }\n    if (options.text) {',
      );
      text = text.replaceAll("App installation", "Website portal & sign out");
    }
    // Rewrite only known local entry points; provider URLs and hash navigation
    // remain unchanged. Dynamic resource icons use the explicit icons prefix.
    text = text.replace(
      /(["'`=])\/(api\/v1|icons\/|vendor\/|(?:app|styles|operational-map|voice|radio-player|private-note-vault|portal)\.(?:js|css)|ten-eight-mark(?:-light)?\.svg)/g,
      "$1/ten-eight/$2",
    );
    bytes = Buffer.from(text);
  }
  assets[name] = {
    contentType: mime[ext] || "text/plain; charset=utf-8",
    base64: bytes.toString("base64"),
  };
  packagedHashes[name] = digest(bytes);
}
const portalScript = `// This website edition is online-only; it never registers a service worker.
document.addEventListener("click", (event) => {
  const trigger = event.target.closest?.("[data-install-app]");
  if (!trigger) return;
  event.preventDefault();
  document.querySelector("#dialog")?.close();
  const dialog = document.querySelector("#install-dialog");
  dialog.innerHTML = '<button type="button" class="icon ghost dialog-close" aria-label="Close portal information">×</button><div class="eyebrow">MILLSTADT EMS WEBSITE</div><h2 id="install-heading">Your Ten-Eight portal</h2><p>This browser edition requires a connection. App installation and offline operation are disabled here.</p><p>The shared fictional exercise is separate from live dispatch. Your website sign-in expires after eight hours.</p><form method="post" action="/ten-eight/session/logout"><div class="form-actions"><button type="submit">Sign out of website portal</button></div></form>';
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.showModal();
});
`;
assets["portal.js"] = {
  contentType: "text/javascript; charset=utf-8",
  base64: Buffer.from(portalScript).toString("base64"),
};
packagedHashes["portal.js"] = digest(portalScript);
await writeFile(
  "lib/ten-eight-portal/vendor-assets.ts",
  "// Generated by scripts/vendor-ten-eight.mjs. Edit upstream or the packaging script.\nexport const portalAssets: Record<string, { contentType: string; base64: string }> = " +
    JSON.stringify(assets, null, 2) +
    ";\n",
);
let sourceRevision = "unavailable";
try {
  sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: sourceRoot,
    encoding: "utf8",
  }).trim();
} catch {}
await writeFile(
  "lib/ten-eight-portal/source-manifest.json",
  JSON.stringify(
    {
      sourceRevision,
      sourceHashes,
      packagedHashes,
      basePath: "/ten-eight",
      realm: "public-demo",
      pwa: "disabled",
      note: "Per-file hashes identify the exact source, including approved work not yet committed. No source credentials or configuration are packaged.",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Packaged ${Object.keys(assets).length} assets under /ten-eight; no network requests.`,
);

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const expectedFileHashes = {
  "app/api/cad/poll/route.ts":
    "fa5918fb0bf2f46ac5c58beecbea5c9220b749c0c1c19598f4215a0c86fed63c",
  "components/cad/CallTicker.tsx":
    "119b2cd80079463b0cf0ac07f2a1d70272908c3ee084a9a9ddf9dc21e06e5756",
};

const expectedFinancialHashes = [
  "3d94ea2a14dfcc6e243321d2c9a7a5ea1b9287fc6890262ea3a4aebb198c3dcf",
];
const expectedNavHash =
  "312b9cb33439630cec0851b960c2f9329975278835d50356464138ff332c7249";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fail(message) {
  console.error(`PROTECTED AREA FAILURE: ${message}`);
  process.exitCode = 1;
}

for (const [relativePath, expectedHash] of Object.entries(expectedFileHashes)) {
  const contents = await readFile(resolve(root, relativePath), "utf8");
  const actualHash = sha256(contents);
  if (actualHash !== expectedHash) {
    fail(`${relativePath} changed (expected ${expectedHash}, received ${actualHash}).`);
  }
}

const ticker = await readFile(resolve(root, "components/cad/CallTicker.tsx"), "utf8");
if (!ticker.includes("const ACTIVE_MINUTES = 120;")) {
  fail("CallTicker no longer preserves ACTIVE_MINUTES = 120.");
}

const homepage = await readFile(resolve(root, "app/page.tsx"), "utf8");
const financialBlocks = [
  ...homepage.matchAll(
    /<Link\s+href="\/financials-information-hub"[\s\S]*?<\/Link>/g,
  ),
].map((match) => match[0]);

if (financialBlocks.length !== expectedFinancialHashes.length) {
  fail(
    `Expected ${expectedFinancialHashes.length} homepage Financial Information entries; found ${financialBlocks.length}.`,
  );
} else {
  financialBlocks.forEach((block, index) => {
    const actualHash = sha256(block);
    if (actualHash !== expectedFinancialHashes[index]) {
      fail(`Homepage Financial Information entry ${index + 1} changed.`);
    }
  });
}

const nav = await readFile(resolve(root, "components/Nav.tsx"), "utf8");
const navEntry = nav.match(
  /\{ href: "\/financials-information-hub", label: "Financial Information" \}/,
)?.[0];

if (!navEntry || sha256(navEntry) !== expectedNavHash) {
  fail("Navigation Financial Information entry changed.");
}

if (!process.exitCode) {
  console.log("Elite protected-area invariants verified.");
}

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readBoundedJson } from "../lib/security/http";
import {
  REVALIDATABLE_PATHS,
  hasValidBearerSecret,
  selectRevalidationPaths,
} from "../lib/security/operational";
import {
  MAX_SIGNATURE_IMAGE_BYTES,
  validateSignatureImageDataUrl,
} from "../lib/security/signature-image";

const root = process.cwd();
const source = (path: string) => readFile(resolve(root, path), "utf8");
const VALID_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function main() {
  assert.equal(hasValidBearerSecret("Bearer undefined", undefined), false);
  assert.equal(hasValidBearerSecret("Bearer ", "secret"), false);
  assert.equal(hasValidBearerSecret("Basic secret", "secret"), false);
  assert.equal(hasValidBearerSecret("Bearer wrong", "secret"), false);
  assert.equal(hasValidBearerSecret("Bearer secret", "secret"), true);

  const newsletterCron = await source("app/api/cron/fetch-newsletters/route.ts");
  const revalidationRoute = await source("app/api/revalidate/route.ts");
  for (const route of [newsletterCron, revalidationRoute]) {
    assert.match(route, /if \(!secret\?\.trim\(\)\)/);
    assert.match(route, /hasValidBearerSecret\(req\.headers\.get\("authorization"\), secret\)/);
    assert.match(route, /status:\s*503/);
    assert.match(route, /status:\s*401/);
  }
  assert.match(revalidationRoute, /selectRevalidationPaths\(input\)/);
  assert.match(revalidationRoute, /for \(const path of selection\.paths\)/);
  assert.match(revalidationRoute, /revalidatePath\(path\)/);

  assert.deepEqual(selectRevalidationPaths(undefined), { ok: true, paths: [...REVALIDATABLE_PATHS] });
  assert.deepEqual(selectRevalidationPaths({ paths: ["/about", "/about", "/gallery"] }), {
    ok: true,
    paths: ["/about", "/gallery"],
  });
  assert.equal(selectRevalidationPaths({ paths: ["/admin"] }).ok, false);
  assert.equal(selectRevalidationPaths({ paths: ["/about"], tags: ["all"] }).ok, false);

  const bounded = await readBoundedJson(new Request("http://localhost/test", {
    method: "POST",
    body: JSON.stringify({ ok: true }),
  }), 64);
  assert.deepEqual(bounded, { ok: true, value: { ok: true } });

  const oversizedStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{\"value\":\""));
      controller.enqueue(new Uint8Array(128));
      controller.enqueue(new TextEncoder().encode("\"}"));
      controller.close();
    },
  });
  const oversizedJson = await readBoundedJson(new Request("http://localhost/test", {
    method: "POST",
    body: oversizedStream,
    duplex: "half",
  } as RequestInit & { duplex: "half" }), 64);
  assert.deepEqual(oversizedJson, { ok: false, reason: "too_large" });

  const validSignature = validateSignatureImageDataUrl(VALID_PNG);
  assert.equal(validSignature.ok, true);
  if (validSignature.ok) {
    assert.equal(validSignature.image.mimeType, "image/png");
    assert.equal(validSignature.image.width, 1);
    assert.equal(validSignature.image.height, 1);
  }
  assert.equal(validateSignatureImageDataUrl("data:image/svg+xml;base64,PHN2Zy8+").ok, false);
  assert.equal(validateSignatureImageDataUrl("data:image/png;base64,not-base64").ok, false);

  const pngBytes = Buffer.from(VALID_PNG.slice("data:image/png;base64,".length), "base64");
  const dimensionBomb = Buffer.from(pngBytes);
  dimensionBomb.writeUInt32BE(4097, 16);
  assert.equal(validateSignatureImageDataUrl(`data:image/png;base64,${dimensionBomb.toString("base64")}`).ok, false);

  const spoofedMime = `data:image/jpeg;base64,${pngBytes.toString("base64")}`;
  assert.equal(validateSignatureImageDataUrl(spoofedMime).ok, false);
  const oversizedImage = Buffer.alloc(MAX_SIGNATURE_IMAGE_BYTES + 1, 0);
  assert.equal(validateSignatureImageDataUrl(`data:image/png;base64,${oversizedImage.toString("base64")}`).ok, false);

  const contact = await source("app/api/contact/route.ts");
  const storageCall = contact.indexOf("await createFormSubmission");
  const storageFailure = contact.indexOf("protected submission store failed");
  const notification = contact.indexOf("await notifyAdminsInLounge");
  const email = contact.indexOf("await sendGmailMessage");
  assert.ok(storageCall >= 0 && storageFailure > storageCall);
  assert.match(contact.slice(storageFailure, notification), /status:\s*503/);
  assert.ok(notification > storageFailure && email > notification);
  assert.doesNotMatch(contact, /dbSaved/);

  for (const routePath of [
    "app/api/lounge/acks/[id]/ack/route.ts",
    "app/api/board/meetings/minutes/finalize/route.ts",
  ]) {
    const route = await source(routePath);
    assert.match(route, /readBoundedJson/);
    assert.match(route, /MAX_SIGNATURE_REQUEST_BYTES/);
    assert.match(route, /validateSignatureImageDataUrl/);
    assert.doesNotMatch(route, /startsWith\(["']data:image\//);
  }

  const visualEditor = await source("app/api/admin/visual-editor/content/route.ts");
  assert.match(visualEditor, /Authorization:\s*`Bearer \$\{revalidationSecret\}`/);

  console.log("Operational correctness checks passed (cron, revalidation, storage, and signature boundaries).");
}

void main();

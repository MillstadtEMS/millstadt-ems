import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  composeGmailMessage,
  outboundEmailAllowed,
  plainTextFromHtml,
} from "@/lib/reports/gmail-message";

const outputDir = path.join(process.cwd(), "tmp", "email");

function withEmailEnvironment(
  values: Partial<Record<"NODE_ENV" | "VERCEL_ENV" | "DISABLE_OUTBOUND_EMAIL" | "ALLOW_DEVELOPMENT_OUTBOUND_EMAIL", string | undefined>>,
  callback: () => void,
) {
  const environment = process.env as Record<string, string | undefined>;
  const keys = Object.keys(values) as Array<keyof typeof values>;
  const previous = Object.fromEntries(keys.map((key) => [key, environment[key]]));
  try {
    for (const key of keys) {
      const value = values[key];
      if (value === undefined) delete environment[key];
      else environment[key] = value;
    }
    callback();
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete environment[key];
      else environment[key] = value;
    }
  }
}

async function main() {
  const html = "<p>Fictional &amp; safe review</p><p>Line two &lt;verified&gt;.</p>";
  const text = plainTextFromHtml(html);
  assert.equal(text, "Fictional & safe review\n\nLine two <verified>.");

  const pdf = Buffer.from("%PDF-1.4\n% Fictional test attachment only\n%%EOF\n", "ascii");
  const encoded = composeGmailMessage(
    {
      fromName: "Millstadt EMS\r\nBcc: injected@example.test",
      to: ["reviewer@example.test", "reviewer@example.test", "invalid-address"],
      subject: "Fictional résumé report\r\nBcc: injected@example.test",
      text,
      html,
      attachments: [{
        filename: "fictional report\r\nunsafe.pdf",
        contentType: "application/pdf",
        content: pdf,
      }],
    },
    "millstadtems@example.test",
  );
  const raw = Buffer.from(encoded, "base64url").toString("utf8");
  const compactRaw = raw.replace(/\r\n/g, "");

  assert.match(raw, /^From: Millstadt EMS Bcc: injected@example\.test <millstadtems@example\.test>\r$/m);
  assert.match(raw, /^To: reviewer@example\.test\r$/m);
  assert.match(raw, /^Subject: =\?UTF-8\?B\?/m);
  assert.equal((raw.match(/^To:/gm) ?? []).length, 1);
  assert.equal((raw.match(/^Bcc:/gm) ?? []).length, 0);
  assert.match(raw, /Content-Type: multipart\/mixed;/);
  assert.match(raw, /Content-Type: multipart\/alternative;/);
  assert.match(raw, /Content-Type: text\/plain; charset=utf-8/);
  assert.match(raw, /Content-Type: text\/html; charset=utf-8/);
  assert.match(raw, /Content-Type: application\/pdf; name="fictional_report__unsafe\.pdf"/);
  assert.match(raw, /Content-Disposition: attachment; filename="fictional_report__unsafe\.pdf"/);
  assert.ok(compactRaw.includes(Buffer.from(text, "utf8").toString("base64")));
  assert.ok(compactRaw.includes(Buffer.from(html, "utf8").toString("base64")));
  assert.ok(compactRaw.includes(pdf.toString("base64")));

  withEmailEnvironment(
    { NODE_ENV: "development", VERCEL_ENV: undefined, DISABLE_OUTBOUND_EMAIL: undefined, ALLOW_DEVELOPMENT_OUTBOUND_EMAIL: undefined },
    () => assert.equal(outboundEmailAllowed(), false),
  );
  withEmailEnvironment(
    { NODE_ENV: "development", VERCEL_ENV: undefined, DISABLE_OUTBOUND_EMAIL: undefined, ALLOW_DEVELOPMENT_OUTBOUND_EMAIL: "true" },
    () => assert.equal(outboundEmailAllowed(), true),
  );
  withEmailEnvironment(
    { NODE_ENV: "production", VERCEL_ENV: "preview", DISABLE_OUTBOUND_EMAIL: undefined, ALLOW_DEVELOPMENT_OUTBOUND_EMAIL: "true" },
    () => assert.equal(outboundEmailAllowed(), false),
  );
  withEmailEnvironment(
    { NODE_ENV: "production", VERCEL_ENV: "production", DISABLE_OUTBOUND_EMAIL: "true", ALLOW_DEVELOPMENT_OUTBOUND_EMAIL: "true" },
    () => assert.equal(outboundEmailAllowed(), false),
  );

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "fictional-report.eml"), raw, "utf8");
  process.stdout.write("Email output checks passed (14 assertions; no message sent).\n");
}

main().catch((error) => {
  console.error("Email output checks failed:", error);
  process.exitCode = 1;
});

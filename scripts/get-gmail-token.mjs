/**
 * One-time script to get a Gmail refresh token for millstadtcad@gmail.com.
 *
 * Run: node scripts/get-gmail-token.mjs
 *
 * Prereq: add http://localhost:4567/oauth-callback as an Authorized redirect URI
 * in Google Cloud Console -> Clients -> your OAuth 2.0 Client -> Edit.
 */

import { createServer } from "http";
import { createInterface } from "readline";
import { google } from "googleapis";

const PORT = 4567;
const REDIRECT_URI = `http://localhost:${PORT}/oauth-callback`;

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

console.log("\n── Gmail OAuth2 Token Generator ──────────────────────────\n");
console.log(`Make sure ${REDIRECT_URI} is added as an Authorized redirect URI`);
console.log("in Google Cloud Console -> Clients -> your OAuth Client -> Edit.\n");

const clientId     = await ask("Paste your CLIENT ID:     ");
const clientSecret = await ask("Paste your CLIENT SECRET: ");
rl.close();

const auth = new google.auth.OAuth2(
  clientId.trim(),
  clientSecret.trim(),
  REDIRECT_URI,
);

const url = auth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.modify"],
});

console.log("\n── Step 1 ────────────────────────────────────────────────");
console.log("Open this URL in your browser, sign in as millstadtcad@gmail.com,");
console.log("and click Allow. You'll be redirected back to localhost.\n");
console.log(url);
console.log("\nListening on " + REDIRECT_URI + " ...\n");

const code = await new Promise((resolve, reject) => {
  const server = createServer((req, res) => {
    if (!req.url?.startsWith("/oauth-callback")) {
      res.writeHead(404); res.end("Not found"); return;
    }
    const qs = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const authCode = qs.get("code");
    const err      = qs.get("error");
    if (err) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`<h1>OAuth error: ${err}</h1><p>You can close this tab.</p>`);
      server.close(); reject(new Error(err)); return;
    }
    if (!authCode) {
      res.writeHead(400); res.end("No code in callback"); return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h1>Got it.</h1><p>You can close this tab and return to the terminal.</p>");
    server.close(); resolve(authCode);
  });
  server.listen(PORT);
});

try {
  const { tokens } = await auth.getToken(code);

  console.log("\n── Done! Add these to .env.local and Vercel env vars ─────\n");
  console.log(`GMAIL_CLIENT_ID=${clientId.trim()}`);
  console.log(`GMAIL_CLIENT_SECRET=${clientSecret.trim()}`);
  console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`GMAIL_USER=millstadtcad@gmail.com`);
  console.log("\n──────────────────────────────────────────────────────────\n");
} catch (err) {
  console.error("\nFailed to exchange token:", err.message);
}

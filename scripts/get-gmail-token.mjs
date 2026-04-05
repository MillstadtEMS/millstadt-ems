/**
 * One-time script to get a Gmail refresh token for millstadtcad@gmail.com.
 *
 * Run: node scripts/get-gmail-token.mjs
 *
 * You need your Client ID and Client Secret from Google Cloud Console first.
 * Have them ready before running this.
 */

import { createInterface } from "readline";
import { google } from "googleapis";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

console.log("\n── Gmail OAuth2 Token Generator ──────────────────────────\n");
console.log("You need your Google Cloud OAuth2 credentials.");
console.log("Get them at: https://console.cloud.google.com\n");

const clientId     = await ask("Paste your CLIENT ID:     ");
const clientSecret = await ask("Paste your CLIENT SECRET: ");

const auth = new google.auth.OAuth2(
  clientId.trim(),
  clientSecret.trim(),
  "urn:ietf:wg:oauth:2.0:oob"
);

const url = auth.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/gmail.modify"],
});

console.log("\n── Step 1 ────────────────────────────────────────────────");
console.log("Open this URL in your browser and sign in as millstadtcad@gmail.com:\n");
console.log(url);
console.log("\n── Step 2 ────────────────────────────────────────────────");

const code = await ask("\nPaste the authorization code Google gives you: ");

try {
  const { tokens } = await auth.getToken(code.trim());

  console.log("\n── Done! Add these to your .env file ────────────────────\n");
  console.log(`GMAIL_CLIENT_ID=${clientId.trim()}`);
  console.log(`GMAIL_CLIENT_SECRET=${clientSecret.trim()}`);
  console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`GMAIL_USER=millstadtcad@gmail.com`);
  console.log("\n──────────────────────────────────────────────────────────\n");
} catch (err) {
  console.error("\nFailed to exchange token:", err.message);
  console.error("Make sure you pasted the full auth code and try again.");
}

rl.close();

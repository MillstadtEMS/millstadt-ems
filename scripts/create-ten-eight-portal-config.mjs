// Never accepts a password as a command-line argument or prints credentials.
import { open } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { hashPortalPassword } from "../lib/ten-eight-portal/auth.ts";
if (process.stdin.isTTY || process.argv.length !== 3)
  throw new Error(
    "Pipe a password from a private source on stdin and provide one new private output-file path. Do not pass the password as an argument.",
  );
let password = "";
for await (const chunk of process.stdin) {
  password += chunk;
  if (Buffer.byteLength(password) > 1026)
    throw new Error("Password input is too long.");
}
password = password.replace(/\r?\n$/, "");
const hash = await hashPortalPassword(password);
password = "";
const destination = resolve(process.argv[2]);
const file = await open(destination, "wx", 0o600);
try {
  await file.writeFile(
    `TEN_EIGHT_PORTAL_PASSWORD_HASH='${hash}'\nTEN_EIGHT_PORTAL_SESSION_SECRET='${randomBytes(48).toString("base64url")}'\n`,
  );
} finally {
  await file.close();
}
console.log(
  "Portal configuration written to the requested private file. Values were not printed.",
);

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { resolveWebAuthnRequestContext } from "../lib/lounge/webauthn";

const originalRpID = process.env.WEBAUTHN_RP_ID;

after(() => {
  if (originalRpID === undefined) delete process.env.WEBAUTHN_RP_ID;
  else process.env.WEBAUTHN_RP_ID = originalRpID;
});

test("production subdomain uses the configured stable RP ID and exact request origin", () => {
  process.env.WEBAUTHN_RP_ID = "millstadtems.org";
  assert.deepEqual(
    resolveWebAuthnRequestContext("www.millstadtems.org", "https://www.millstadtems.org"),
    { rpID: "millstadtems.org", origin: "https://www.millstadtems.org" },
  );
});

test("an unrelated host cannot claim the configured RP ID", () => {
  process.env.WEBAUTHN_RP_ID = "millstadtems.org";
  assert.deepEqual(
    resolveWebAuthnRequestContext("preview.example.net", "https://preview.example.net"),
    { rpID: "preview.example.net", origin: "https://preview.example.net" },
  );
});

test("a mismatched Origin header is ignored", () => {
  process.env.WEBAUTHN_RP_ID = "millstadtems.org";
  assert.deepEqual(
    resolveWebAuthnRequestContext("www.millstadtems.org", "https://attacker.example"),
    { rpID: "millstadtems.org", origin: "https://www.millstadtems.org" },
  );
});

test("localhost remains usable for development", () => {
  process.env.WEBAUTHN_RP_ID = "millstadtems.org";
  assert.deepEqual(
    resolveWebAuthnRequestContext("localhost:3000", "http://localhost:3000"),
    { rpID: "localhost", origin: "http://localhost:3000" },
  );
});

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
}

const read = (file: string) => readFile(path.resolve(file), "utf8");

async function main() {
const [loungeRoutes, boardRoutes, loungePages, boardPages] = await Promise.all([
  walk("app/api/lounge").then((files) => files.filter((file) => file.endsWith("/route.ts"))),
  walk("app/api/board").then((files) => files.filter((file) => file.endsWith("/route.ts"))),
  walk("app/lounge").then((files) => files.filter((file) => file.endsWith("/page.tsx"))),
  walk("app/board/(portal)").then((files) => files.filter((file) => file.endsWith("/page.tsx"))),
]);

assert.ok(loungeRoutes.length >= 70, "Lounge API inventory unexpectedly shrank");
assert.ok(boardRoutes.length >= 15, "Board API inventory unexpectedly shrank");
assert.ok(loungePages.length >= 20, "Lounge page inventory unexpectedly shrank");
assert.ok(boardPages.length >= 15, "Board page inventory unexpectedly shrank");

const expectedPreauthRoutes = new Set([
  "app/api/lounge/login/route.ts",
  "app/api/lounge/setup-2fa/route.ts",
  "app/api/lounge/sms-login-code/send/route.ts",
  "app/api/lounge/sms-login-code/verify/route.ts",
  "app/api/lounge/verify-2fa/route.ts",
  "app/api/lounge/webauthn/assert-finish/route.ts",
  "app/api/lounge/webauthn/assert-start/route.ts",
]);

for (const file of loungeRoutes) {
  const source = await read(file);
  const normalized = file.replaceAll(path.sep, "/");
  const hasEmployeeAuth = /currentEmployee|readPreauthChallenge|consumePreauthChallenge/.test(source);
  const intentionallyPublicVersion = normalized === "app/api/lounge/version/route.ts";
  assert.ok(
    hasEmployeeAuth || expectedPreauthRoutes.has(normalized) || intentionallyPublicVersion,
    `${normalized} has no recognized Lounge authorization boundary`,
  );
}

for (const file of boardRoutes) {
  const source = await read(file);
  const normalized = file.replaceAll(path.sep, "/");
  const isLogin = normalized === "app/api/board/login/route.ts";
  assert.ok(isLogin || /currentBoardUser/.test(source), `${normalized} has no Board authorization boundary`);
}

const proxy = await read("proxy.ts");
assert.match(proxy, /\["POST", "PUT", "PATCH", "DELETE"\]/);
assert.match(proxy, /pathname\.startsWith\("\/api\/lounge\/"\)/);
assert.match(proxy, /pathname\.startsWith\("\/api\/board\/"\)/);
assert.match(proxy, /isProtectedBrowserMutation && !isSameOriginRequest\(req\)/);

const boardAuth = await read("lib/board/auth.ts");
const boardLogin = await read("app/api/board/login/route.ts");
assert.match(boardAuth, /NODE_ENV === "production" && user\.isDevLogin/);
assert.match(boardLogin, /productionDevLogin/);

const messages = await read("lib/lounge/messages.ts");
const messageRoute = await read("app/api/lounge/messages/[id]/route.ts");
assert.match(messages, /getConversationReadInfo\([\s\S]*viewerId/);
assert.match(messages, /AND \$\{viewerId\} = ANY\(participant_ids\)/);
assert.match(messages, /conversation_id = \$\{input\.conversationId\}/);
assert.match(messageRoute, /getConversationReadInfo\(id, me\.id\)/);

const acknowledgments = await read("lib/lounge/acks.ts");
assert.match(acknowledgments, /target_employee_id IS NULL OR a\.target_employee_id = \$\{userId\}/);
assert.match(acknowledgments, /target_employee_id IS NULL OR a\.target_employee_id = \$\{input\.userId\}/);

const intentionalClientGates = new Set([
  "app/lounge/change-password/page.tsx",
  "app/lounge/forms/[id]/page.tsx",
  "app/lounge/goodbye/page.tsx",
  "app/lounge/login/page.tsx",
]);
for (const file of loungePages) {
  const normalized = file.replaceAll(path.sep, "/");
  const source = await read(file);
  assert.ok(
    intentionalClientGates.has(normalized) || /currentEmployee|redirect\("\/lounge"\)/.test(source),
    `${normalized} has no recognized page authorization boundary`,
  );
}

for (const file of boardPages) {
  const source = await read(file);
  assert.ok(
    /currentBoardUser|redirect\("\/board"\)|getWorkbookAccessContext/.test(source),
    `${file} has no recognized Board page authorization boundary`,
  );
}

console.log(
  `Lounge/Board boundary checks passed (${loungePages.length + boardPages.length} pages, ${loungeRoutes.length + boardRoutes.length} APIs).`,
);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

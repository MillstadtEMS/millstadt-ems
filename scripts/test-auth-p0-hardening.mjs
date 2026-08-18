import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const loungeAuth = read("lib/lounge/auth.ts");
const loungeLogin = read("app/api/lounge/login/route.ts");
const loungeSetup = read("app/api/lounge/setup-2fa/route.ts");
const loungeVerify = read("app/api/lounge/verify-2fa/route.ts");
const loungeSmsVerify = read("app/api/lounge/sms-login-code/verify/route.ts");
const loungeEmployees = read("lib/lounge/employees.ts");
const loungeReset = read("app/api/admin/employees/[id]/reset-password/route.ts");
const boardAuth = read("lib/board/auth.ts");
const boardLogin = read("app/api/board/login/route.ts");
const proxy = read("proxy.ts");

assert.match(loungeAuth, /type PreauthPurpose = "verify_totp" \| "verify_sms" \| "enroll_totp"/);
assert.match(loungeAuth, /INSERT INTO lounge_preauth_challenges/);
assert.match(loungeAuth, /used_at IS NULL/);
assert.match(loungeAuth, /revoked_at IS NULL/);
assert.match(loungeLogin, /issuePreauthChallenge/);
assert.doesNotMatch(loungeLogin, /makePreauthToken/);

assert.match(loungeSetup, /readPreauthChallenge\(cookie, "enroll_totp"\)/);
assert.match(loungeSetup, /completeTotpEnrollmentChallenge/);
assert.doesNotMatch(loungeSetup, /secret = existing\.secret/);
assert.match(loungeVerify, /readPreauthChallenge\(cookie, "verify_totp"\)/);
assert.match(loungeVerify, /consumePreauthChallenge/);
assert.match(loungeSmsVerify, /readPreauthChallenge\(cookie, "verify_sms"\)/);
assert.match(loungeSmsVerify, /consumePreauthChallenge/);
assert.match(loungeVerify, /body\.trustDevice === true/);
assert.match(loungeSmsVerify, /body\.trustDevice === true/);

assert.match(loungeEmployees, /generateSetupToken/);
assert.match(loungeEmployees, /setup_token_expires_at/);
assert.doesNotMatch(loungeEmployees, /defaultInitialPassword/);
assert.match(loungeReset, /setupToken/);
assert.match(loungeReset, /revokedTrustedDevices/);
assert.match(loungeReset, /revokedPreauthChallenges/);

assert.match(loungeAuth, /if \(emp\.mustChangePassword && !options\?\.allowPasswordChangeRequired\) return null/);
assert.match(boardAuth, /if \(user\.mustChangePassword && !options\?\.allowPasswordChangeRequired\) return null/);
assert.match(proxy, /PASSWORD_CHANGE_REQUIRED/);
assert.match(proxy, /\/lounge\/change-password/);
assert.match(proxy, /\/board\/change-password/);

assert.match(boardAuth, /verifyBoardLoginCredential/);
assert.match(boardLogin, /consumeBoardSetupToken/);
assert.match(boardLogin, /setup_token_consumed/);

console.log("P0 auth hardening regression checks passed.");

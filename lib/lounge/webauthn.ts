/**
 * Server-side WebAuthn (passkey) plumbing for the Employee Lounge.
 *
 * Lets a crew member who has already authenticated with password+TOTP
 * register a passkey for this device. After that, the next session on
 * that device can be unlocked with Face ID / Touch ID / Windows Hello,
 * no password required.
 */
import { randomUUID } from "crypto";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { sql } from "./db";

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS lounge_webauthn_credentials (
      id              TEXT PRIMARY KEY,
      employee_id     TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      credential_id   TEXT NOT NULL UNIQUE,
      public_key      TEXT NOT NULL,
      counter         BIGINT NOT NULL DEFAULT 0,
      transports      TEXT,
      device_label    TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at    TIMESTAMPTZ
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_webauthn_employee_idx ON lounge_webauthn_credentials (employee_id)`;
  await db`
    CREATE TABLE IF NOT EXISTS lounge_webauthn_challenges (
      id              TEXT PRIMARY KEY,
      employee_id     TEXT REFERENCES lounge_employees(id) ON DELETE CASCADE,
      challenge       TEXT NOT NULL,
      purpose         TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at      TIMESTAMPTZ NOT NULL
    )
  `;
  schemaEnsured = true;
}

/**
 * Origin allowed for WebAuthn ceremonies. Tries (in order):
 *   1. NEXT_PUBLIC_SITE_URL if set
 *   2. The Host header on this request (so prod just works on any
 *      domain Vercel hosts us under)
 *   3. localhost fallback for local dev
 */
function originAndRp(host?: string | null): { rpID: string; origin: string } {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) {
    try {
      const u = new URL(explicit);
      return { rpID: u.hostname, origin: explicit.replace(/\/$/, "") };
    } catch { /* fall through */ }
  }
  if (host) {
    const cleanHost = host.trim().toLowerCase();
    const proto = cleanHost.startsWith("localhost") || cleanHost.startsWith("127.")
      ? "http"
      : "https";
    return { rpID: cleanHost.split(":")[0], origin: `${proto}://${cleanHost}` };
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel) return { rpID: vercel.split(":")[0], origin: `https://${vercel}` };
  return { rpID: "localhost", origin: "http://localhost:3000" };
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

async function saveChallenge(challenge: string, purpose: string, employeeId: string | null) {
  await ensureSchema();
  const db = sql();
  const id = randomUUID();
  const expires = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  await db`
    INSERT INTO lounge_webauthn_challenges (id, employee_id, challenge, purpose, expires_at)
    VALUES (${id}, ${employeeId}, ${challenge}, ${purpose}, ${expires})
  `;
}
async function popChallenge(challenge: string, purpose: string): Promise<{ employeeId: string | null } | null> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT id, employee_id, expires_at FROM lounge_webauthn_challenges
    WHERE challenge = ${challenge} AND purpose = ${purpose}
    LIMIT 1
  `) as unknown as { id: string; employee_id: string | null; expires_at: string }[];
  if (rows.length === 0) return null;
  await db`DELETE FROM lounge_webauthn_challenges WHERE id = ${rows[0].id}`;
  if (new Date(rows[0].expires_at).getTime() < Date.now()) return null;
  return { employeeId: rows[0].employee_id };
}

interface DbCredentialRow {
  id: string;
  employee_id: string;
  credential_id: string;
  public_key: string;
  counter: string | number; // bigint comes back as string sometimes
  transports: string | null;
}

export async function listCredentialsForEmployee(employeeId: string): Promise<{
  id: string;
  credentialId: string;
  deviceLabel: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT id, credential_id, device_label, created_at, last_used_at
    FROM lounge_webauthn_credentials
    WHERE employee_id = ${employeeId}
    ORDER BY created_at DESC
  `) as unknown as { id: string; credential_id: string; device_label: string | null; created_at: string; last_used_at: string | null }[];
  return rows.map((r) => ({
    id: r.id,
    credentialId: r.credential_id,
    deviceLabel: r.device_label,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
  }));
}

export async function deleteCredential(employeeId: string, credentialRowId: string): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`DELETE FROM lounge_webauthn_credentials WHERE id = ${credentialRowId} AND employee_id = ${employeeId}`;
}

// ── Registration ────────────────────────────────────────────────────────

export async function startRegistration(employeeId: string, userName: string, displayName: string, host?: string | null) {
  await ensureSchema();
  const { rpID } = originAndRp(host);
  const db = sql();
  const existing = (await db`
    SELECT credential_id, transports FROM lounge_webauthn_credentials WHERE employee_id = ${employeeId}
  `) as unknown as { credential_id: string; transports: string | null }[];

  const options = await generateRegistrationOptions({
    rpName: "Millstadt EMS Employee Lounge",
    rpID,
    userID: new TextEncoder().encode(employeeId),
    userName,
    userDisplayName: displayName,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credential_id,
      transports: c.transports ? (c.transports.split(",") as AuthenticatorTransportFuture[]) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
  });
  await saveChallenge(options.challenge, "register", employeeId);
  return options;
}

export async function finishRegistration(
  employeeId: string,
  response: RegistrationResponseJSON,
  deviceLabel?: string,
  host?: string | null,
): Promise<{ verified: boolean; reason?: string }> {
  await ensureSchema();
  const { rpID, origin } = originAndRp(host);
  const challenge = response.response.clientDataJSON
    ? JSON.parse(Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8")).challenge
    : null;
  if (!challenge) return { verified: false, reason: "no challenge" };
  const popped = await popChallenge(challenge, "register");
  if (!popped) return { verified: false, reason: "challenge expired" };
  if (popped.employeeId !== employeeId) return { verified: false, reason: "wrong user" };

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (e) {
    return { verified: false, reason: e instanceof Error ? e.message : "verify failed" };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { verified: false, reason: "not verified" };
  }

  const reg = verification.registrationInfo;
  const credId = (reg as { credential?: { id?: string } }).credential?.id ?? (reg as { credentialID?: string }).credentialID ?? "";
  const pubKeyBuf = (reg as { credential?: { publicKey?: Uint8Array } }).credential?.publicKey
    ?? (reg as { credentialPublicKey?: Uint8Array }).credentialPublicKey;
  const counter = (reg as { credential?: { counter?: number } }).credential?.counter
    ?? (reg as { counter?: number }).counter ?? 0;
  if (!credId || !pubKeyBuf) return { verified: false, reason: "missing credential fields" };
  const publicKeyB64 = Buffer.from(pubKeyBuf).toString("base64");
  const transports = response.response.transports?.join(",") ?? null;

  const db = sql();
  await db`
    INSERT INTO lounge_webauthn_credentials
      (id, employee_id, credential_id, public_key, counter, transports, device_label)
    VALUES
      (${randomUUID()}, ${employeeId}, ${credId}, ${publicKeyB64}, ${counter}, ${transports}, ${deviceLabel ?? null})
    ON CONFLICT (credential_id) DO NOTHING
  `;
  return { verified: true };
}

// ── Assertion (passwordless sign-in) ─────────────────────────────────────

export async function startAuthentication(employeeIdHint?: string, host?: string | null) {
  await ensureSchema();
  const { rpID } = originAndRp(host);
  const db = sql();
  let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] = [];
  if (employeeIdHint) {
    const rows = (await db`
      SELECT credential_id, transports FROM lounge_webauthn_credentials WHERE employee_id = ${employeeIdHint}
    `) as unknown as { credential_id: string; transports: string | null }[];
    allowCredentials = rows.map((r) => ({
      id: r.credential_id,
      transports: r.transports ? (r.transports.split(",") as AuthenticatorTransportFuture[]) : undefined,
    }));
  }
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials,
  });
  await saveChallenge(options.challenge, "assert", employeeIdHint ?? null);
  return options;
}

export async function finishAuthentication(
  response: AuthenticationResponseJSON,
  host?: string | null,
): Promise<{ verified: boolean; employeeId?: string; reason?: string }> {
  await ensureSchema();
  const { rpID, origin } = originAndRp(host);
  const challenge = response.response.clientDataJSON
    ? JSON.parse(Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8")).challenge
    : null;
  if (!challenge) return { verified: false, reason: "no challenge" };
  const popped = await popChallenge(challenge, "assert");
  if (!popped) return { verified: false, reason: "challenge expired" };

  const credId = response.id;
  const db = sql();
  const rows = (await db`
    SELECT id, employee_id, credential_id, public_key, counter, transports
    FROM lounge_webauthn_credentials
    WHERE credential_id = ${credId}
    LIMIT 1
  `) as unknown as DbCredentialRow[];
  if (rows.length === 0) return { verified: false, reason: "credential not registered" };
  const row = rows[0];

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: row.credential_id,
        publicKey: new Uint8Array(Buffer.from(row.public_key, "base64")),
        counter: Number(row.counter),
        transports: row.transports ? (row.transports.split(",") as AuthenticatorTransportFuture[]) : undefined,
      },
    });
  } catch (e) {
    return { verified: false, reason: e instanceof Error ? e.message : "verify failed" };
  }

  if (!verification.verified) return { verified: false, reason: "not verified" };

  await db`
    UPDATE lounge_webauthn_credentials
    SET counter = ${verification.authenticationInfo.newCounter},
        last_used_at = NOW()
    WHERE id = ${row.id}
  `;
  return { verified: true, employeeId: row.employee_id };
}

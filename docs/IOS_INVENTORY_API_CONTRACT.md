# Millstadt EMS iOS Inventory API Contract

Status: security baseline implemented for the existing web API; native session issuance is not yet implemented.

This contract keeps the existing Neon inventory database and business logic as the source of truth. A QR code identifies an item. It never grants permission to change inventory.

## Security Rules

- Every write is tied to a named, active employee or a revocable native-app session tied to that employee.
- QR tokens are identifiers only.
- Permanent shared secrets must not be stored in the iOS application.
- Existing inventory cookies are browser sessions and must not be reused as native bearer tokens.
- Web mutations require a same-origin request, JSON content type, bounded body, employee session, rate limit, and idempotency key.
- Native mutations must use a short-lived employee-bound access token issued through an approved sign-in flow.
- Device credentials belong in the iOS Keychain and must be invalidated on logout, employee deactivation, password reset, or administrator revocation.

## Existing Web Endpoints

### Public QR Lookup

`GET /api/inventory/scan/{qrToken}`

Authentication: optional.

Unauthenticated response:

```json
{
  "id": "stable-item-id",
  "name": "Item name",
  "categoryName": "Category",
  "requiresAuthentication": true
}
```

The public response excludes quantities, par levels, notes, vendor data, audit history, exact location, version, and other operational data.

An authenticated active employee receives the item location, par, current stock, expired quantity, quantity to order, version, and last-modified time.

### QR Count Update

`PATCH /api/inventory/scan/{qrToken}`

Authentication: active Employee Lounge session.

Required headers:

```text
Content-Type: application/json
Idempotency-Key: <16-128 character unique key>
```

Request:

```json
{
  "version": 7,
  "currentStock": 12,
  "expiredQty": 0,
  "notes": "Optional note"
}
```

Validation:

- `version` is a positive integer.
- Quantities are whole numbers from 0 through 100000.
- Notes are at most 500 characters and cannot contain null bytes.
- Unknown fields are rejected.
- At least one mutable field is required.

The server derives employee identity from the session. A client-supplied employee name is never trusted.

### Item List and Incremental Sync

`GET /api/inventory/items?type={type}&category={slug}&since={ISO-8601}`

Authentication: browser inventory session backed by an active Lounge session.

- Omit `since` for the current collection.
- Supply `since` to retrieve rows whose `updated_at` is newer than that value.
- The client must retain each item's `version` and `updatedAt` values.
- Pagination is not yet required by the current catalog size. Before the catalog exceeds 500 rows, add cursor pagination without changing item identifiers.

### Item Read

`GET /api/inventory/items/{itemId}`

Authentication: browser inventory session backed by an active Lounge session.

Returns the current item, category metadata, stock fields, version, and `updatedAt`.

### Item Count Update

`PATCH /api/inventory/items/{itemId}`

Authentication: named, active Employee Lounge session.

Headers, request fields, validation, idempotency, conflict handling, and audit behavior match the QR count update. The general employee route cannot change item definitions or par levels.

### Submission Summary

`POST /api/inventory/submit`

Authentication: named, active Employee Lounge session.

Required header: `Idempotency-Key`.

Purpose values:

- `inventory_backstock`
- `inventory_state`
- `qr-batch`

Signed backstock and state submissions require a bounded image-data signature. QR batches are signature-free because each item mutation is already employee-authenticated and audited. The server supplies the employee name and employee ID.

## Conflict and Replay Behavior

- `409 Conflict` means the supplied item version is stale, the idempotency key is already processing, or the key was reused with different request data.
- A stale-version response includes the latest item when available.
- Repeating the same completed request with the same employee, scope, key, and body returns the stored response with `Idempotent-Replay: true`.
- A replay never applies the stock change or sends the submission email twice.
- Clients must generate a fresh UUID-style idempotency key for each intended user action and retain it while retrying that action.

## Audit Event

Every item change writes one audit row per changed field with:

- stable item ID;
- field changed;
- old value;
- new value;
- `employee:{employeeId}:{username}` actor identity;
- server timestamp.

Item creation, definition edits, reorder changes, QR creation/revocation, resets, and deletion also write audit events. Deleting an item retains its prior audit rows and writes an `item_deleted` snapshot before removing the live item.

## Error Codes

| Status | Meaning |
| --- | --- |
| `400` | Invalid ID, body, quantity, note, version, or idempotency key |
| `401` | No active employee/native session |
| `403` | Role denied or cross-origin browser request |
| `404` | Item or QR token not found/revoked |
| `409` | Stale version, replay conflict, or request still processing |
| `413` | Request body exceeds the endpoint limit |
| `415` | JSON content type required |
| `429` | Mutation rate limit reached |
| `500` | Server failed without confirming the mutation |

## Native v1 Surface

Do not expose the current browser cookie or inventory password as native bearer authentication. The repository does not yet contain an approved native identity exchange, device registration, or revocation service, so production `/api/mobile/inventory/v1/**` write routes must not be added until that foundation is selected.

The smallest justified native surface is:

```text
POST /api/mobile/inventory/v1/session/exchange
POST /api/mobile/inventory/v1/session/revoke
GET  /api/mobile/inventory/v1/items
GET  /api/mobile/inventory/v1/items/{itemId}
GET  /api/mobile/inventory/v1/lookup/qr/{qrToken}
PATCH /api/mobile/inventory/v1/items/{itemId}
```

Native session exchange requirements:

- authorization-code flow with PKCE or another owner-approved employee identity provider;
- short-lived access token and rotating refresh token;
- server-side session record containing employee ID, device ID, issued time, last-used time, and revoked time;
- active-employee and role check on every write;
- no secret shared by all installations;
- no employee identity accepted from request JSON;
- immediate revocation when the employee is inactive.

The native item response and patch request should reuse the current field names and version model. Native list responses must add an opaque cursor and `nextCursor`; incremental sync continues to use `updatedAt` plus a stable tie-breaker ID.

## Data Model Mapping

Current Neon tables remain authoritative:

| Domain | Current storage |
| --- | --- |
| Stable item IDs, catalog, categories | `inventory_items`, `inventory_categories` |
| Current quantity, par, expired quantity | `inventory_items` |
| Locations and backstock/state grouping | `inventory_items.location`, `inventory_categories.inventory_type` |
| QR mappings | `inventory_qr_tokens` |
| Optimistic version and last modified | `inventory_items.version`, `inventory_items.updated_at` |
| Adjustments and employee identity | `inventory_audit_log` |
| Submission summaries | `inventory_submissions` |

The following native requirements are not represented as structured fields today and must use additive migrations in the same Neon database:

- unit of measure;
- barcode, GTIN, NDC, and alias codes;
- medication/equipment/disposable classification;
- lot number and lot-specific expiration;
- station, ambulance, bag, and compartment hierarchy;
- transfers, waste/removal reasons, and transaction-level quantity deltas;
- item photos and administrative configuration links.

Recommended additive tables:

```text
inventory_item_codes
inventory_locations
inventory_item_lots
inventory_transactions
inventory_item_photos
inventory_native_sessions
```

These tables must reference the existing stable `inventory_items.id`. Do not copy the catalog into a second database and do not overload the free-text `notes` or `location` columns with structured native data.

## Native Device Assumptions

- iOS Keychain stores only device/session credentials, never a shared inventory password.
- TLS is required for every request.
- App logs must not contain QR tokens, session tokens, signatures, NDC/lot details, or full response bodies.
- Lost-device response revokes the device session server-side.
- Offline mutations remain queued with their original idempotency key and item version.
- After a `409`, the app displays the current server value and requires an explicit employee decision before submitting a new mutation.

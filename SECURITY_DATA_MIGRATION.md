# Legacy Sensitive-Data Migration Plan

This is an owner-approved production operation, not an automatic startup migration. Run it only from a protected maintenance environment with a current encrypted backup, vendor approval, a tested rollback, and a maintenance window.

## Scope

- Public blob URLs in incident, personnel attachment, employee file, certification, profile-change, onboarding, finalized form, write-up, acknowledgment, message/wall, policy, and truck-check records.
- Legacy plaintext public-form payloads, incident payload/media/admin notes/location, profile-change text, and employee medical/sensitive fields.

## Private Object Procedure

1. Freeze writes for the affected namespace and export row IDs, owning employee/record IDs, visibility, MIME, size, and current object URL without copying file contents into logs.
2. Fetch each object from the trusted migration worker, enforce a size cap, inspect file signature, calculate SHA-256, and reject unexpected content.
3. Upload to private object storage under a new server-generated pathname. Store only the `private-blob:v1:` reference in the database.
4. Update the database in bounded transactions with an append-only migration audit row containing record ID, old/new object identifiers, hashes, operator, and timestamp.
5. Test administrator access, authorized employee access where applicable, unauthorized denial, no-store headers, and audit creation.
6. Reconcile source/destination counts, byte sizes, and SHA-256 values. Perform a sample restore from backup.
7. After the approved rollback period, delete old public objects and verify their former URLs no longer return content.

## Encryption Procedure

1. Inventory rows that do not carry the current version marker. Do not log decrypted values.
2. Read each legacy value through the compatibility decoder, encrypt it with the current application key and versioned envelope, and update by primary key in bounded transactions.
3. Record only row ID, field family, old/new version, operator, and timestamp in the migration audit.
4. Reconcile counts and test authorized reads, unauthorized denial, key-unavailable failure behavior, backup, and restore.
5. Retain the legacy read path only for the approved rollback period, then remove it in a separately reviewed release.

## Stop Conditions

Stop immediately on hash mismatch, unexpected MIME/signature, authorization regression, audit failure, backup failure, count mismatch, provider error, or any sign that source objects are being deleted before verification. Escalate through `INCIDENT_RESPONSE.md` if confidentiality or integrity may have been affected.

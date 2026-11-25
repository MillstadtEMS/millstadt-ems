import { z } from "zod";

/** Keys in site_content that hold secrets (e.g. inventory_password_hash, station_password_hash). */
export const isSecretContentKey = (key: string) => /_password_hash$/i.test(key.trim());
const contentKey = z.string().trim().min(1).max(120).regex(/^[a-z0-9._-]+$/i)
  .refine(key => !isSecretContentKey(key), "Not an editable content key");
const contentValue = z.string().max(50_000);
const draft = z.object({ key: contentKey, value: contentValue }).strict();

export const visualEditorPasswordSchema = z.object({
  password: z.string().min(1).max(256),
}).strict();

export const visualEditorDraftSchema = z.union([
  draft,
  z.object({ drafts: z.array(draft).min(1).max(150) }).strict(),
]);

export const visualEditorPublishSchema = z.object({
  keys: z.array(contentKey).min(1).max(150).optional(),
}).strict();

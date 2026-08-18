import { z } from "zod";

const contentKey = z.string().trim().min(1).max(120).regex(/^[a-z0-9._-]+$/i);
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

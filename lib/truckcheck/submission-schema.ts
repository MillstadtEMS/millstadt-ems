import { z } from "zod";

const shortText = (maximum: number) => z.string().trim().max(maximum);
const optionalShortText = (maximum: number) => shortText(maximum).optional().default("");
const nullableShortText = (maximum: number) => shortText(maximum).nullable();
const finiteNumber = z.number().finite().min(-100_000).max(100_000);
const signature = z.string().max(1_500_000).refine(
  (value) => value === "" || /^data:image\/(?:png|jpeg|webp);base64,/i.test(value),
  "Signature image is invalid",
);

const photoUrl = z.string().url().max(4_096);

const submittedItemSchema = z.object({
  itemKey: shortText(100).min(1),
  label: shortText(240).min(1),
  category: shortText(120).min(1),
  responseType: shortText(60).min(1),
  status: nullableShortText(80),
  numericValue: finiteNumber.nullable(),
  unitOfMeasure: nullableShortText(40),
  amountAdded: finiteNumber.nullable(),
  amountUnit: nullableShortText(40),
  comment: shortText(2_000),
  photos: z.array(photoUrl).max(10).optional().default([]),
  isAbnormal: z.boolean(),
  requiresFollowUp: z.boolean(),
  trendGroup: nullableShortText(80),
  checkedAt: z.string().datetime({ offset: true }),
});

const photoSchema = z.object({
  url: photoUrl,
  caption: nullableShortText(240).optional().default(null),
  itemKey: shortText(100).optional(),
});

const attendantSchema = z.object({
  id: nullableShortText(100).optional().default(null),
  name: shortText(120).min(1),
  signature: signature.optional().default(""),
});

const categoryCommentsSchema = z.record(shortText(80), shortText(2_000))
  .refine((value) => Object.keys(value).length <= 40, "Too many category comments")
  .default({});

export const truckCheckSubmissionSchema = z.object({
  unitNumber: optionalShortText(32),
  truckNumber: optionalShortText(32),
  attendant1Name: optionalShortText(120),
  attendant2Name: optionalShortText(120),
  attendant1Signature: signature.optional().default(""),
  attendant2Signature: signature.optional().default(""),
  startedAt: z.string().datetime({ offset: true }).optional(),
  submittedAt: z.string().datetime({ offset: true }).optional(),
  durationSeconds: z.number().finite().min(0).max(43_200).optional(),
  items: z.array(submittedItemSchema).max(300).default([]),
  photos: z.array(photoSchema).max(40).default([]),
  categoryComments: categoryCommentsSchema,
  refillRequest: z.preprocess((value) => value === null ? "" : value, optionalShortText(5_000)),
  attendants: z.array(attendantSchema).max(6).default([]),
  notes: optionalShortText(5_000),
});

export type TruckCheckSubmission = z.infer<typeof truckCheckSubmissionSchema>;

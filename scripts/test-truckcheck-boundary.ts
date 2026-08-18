import assert from "node:assert/strict";
import { privateBlobReference } from "@/lib/lounge/private-blobs";
import { isPrivateTruckPhotoUrl } from "@/lib/truckcheck/photo-reference";
import { truckCheckSubmissionSchema } from "@/lib/truckcheck/submission-schema";

const origin = "https://preview.example.test";
const reference = privateBlobReference("truckcheck/photos/fictional-photo.jpg");
const photoUrl = `${origin}/api/truckcheck/photo?ref=${encodeURIComponent(reference)}`;
const item = {
  itemKey: "fictional-item",
  label: "Fictional item",
  category: "Fictional category",
  responseType: "passfail",
  status: "Pass",
  numericValue: null,
  unitOfMeasure: null,
  amountAdded: null,
  amountUnit: null,
  comment: "Fictional test only",
  photos: [photoUrl],
  isAbnormal: false,
  requiresFollowUp: false,
  trendGroup: null,
  checkedAt: "2026-08-17T14:30:00.000Z",
};
const valid = {
  unitNumber: "TEST-3926",
  attendant1Name: "Fictional Reviewer",
  startedAt: "2026-08-17T14:00:00.000Z",
  submittedAt: "2026-08-17T14:30:00.000Z",
  durationSeconds: 1_800,
  items: [item],
  photos: [{ url: photoUrl, caption: "Fictional photo" }],
  notes: "Fictional test only",
};

const fullFieldSubmission = {
  ...valid,
  truckNumber: "TEST-3926",
  attendant1Name: "Untrusted client display name",
  attendant2Name: "Fictional Partner",
  attendant1Signature: "data:image/png;base64,ZmFrZQ==",
  attendant2Signature: "data:image/png;base64,ZmFrZTI=",
  categoryComments: { Cab: "Fictional category note" },
  refillRequest: "Fictional refill request",
  attendants: [{
    id: "fictional-employee-2",
    name: "Fictional Partner",
    signature: "data:image/png;base64,ZmFrZTI=",
  }],
};

assert.equal(truckCheckSubmissionSchema.safeParse(valid).success, true);
assert.equal(truckCheckSubmissionSchema.safeParse({ ...valid, submittedAt: "not-a-date" }).success, false);
assert.equal(truckCheckSubmissionSchema.safeParse({ ...valid, durationSeconds: 99_999 }).success, false);
assert.equal(truckCheckSubmissionSchema.safeParse({ ...valid, items: Array.from({ length: 301 }, () => item) }).success, false);
assert.equal(truckCheckSubmissionSchema.safeParse({ ...valid, notes: "x".repeat(5_001) }).success, false);
assert.equal(isPrivateTruckPhotoUrl(photoUrl, origin), true);
assert.equal(isPrivateTruckPhotoUrl(photoUrl, "https://different.example.test"), false);
assert.equal(isPrivateTruckPhotoUrl("https://attacker.example.test/photo.jpg", origin), false);

const fullParsed = truckCheckSubmissionSchema.parse(fullFieldSubmission);
for (const field of [
  "unitNumber",
  "truckNumber",
  "attendant1Name",
  "attendant2Name",
  "attendant1Signature",
  "attendant2Signature",
  "startedAt",
  "submittedAt",
  "durationSeconds",
  "items",
  "photos",
  "categoryComments",
  "refillRequest",
  "attendants",
  "notes",
] as const) {
  assert.deepEqual(fullParsed[field], fullFieldSubmission[field]);
}

process.stdout.write("Truck-check boundary checks passed (8 boundaries + full-field preservation).\n");

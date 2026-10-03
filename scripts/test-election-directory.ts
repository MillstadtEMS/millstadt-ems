import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac, randomBytes, scryptSync } from "node:crypto";
import directory from "../data/election-directory/directory.json";
import { calculateEmsTax, type TaxArea } from "../lib/esd-tax";
import { createReviewToken, REVIEW_SECONDS, safeReviewPath, verifyReviewPassword, verifyReviewToken } from "../lib/election-review-auth";

test("every directory amount matches the calculator and each parcel appears once", () => {
  const pins=new Set<string>();
  for(const a of directory.addresses) for(const p of a.parcels) {
    assert(!pins.has(p.pin)); pins.add(p.pin);
    const t=calculateEmsTax({area:p.area as TaxArea,mode:"bill",taxableValue:p.taxable});
    assert.deepEqual([p.before,p.after,p.increase],[t.before,t.after,t.increase]);
    assert.equal(Math.round(p.after*100)-Math.round(p.before*100),Math.round(p.increase*100));
  }
  assert.equal(pins.size,4416);
});
test("streets, numbers and subdivision membership remain ordered and complete", () => {
  const collator=new Intl.Collator("en-US",{numeric:true,sensitivity:"base"});
  const map=new Map(directory.addresses.map(a=>[a.id,a]));
  assert.equal(map.size,directory.addresses.length);
  assert.deepEqual(directory.streets.map(s=>s.name),directory.streets.map(s=>s.name).sort(collator.compare));
  const seen=new Set<string>();
  for(const s of directory.streets) {
    const addresses=s.addressIds.map(id=>map.get(id)!);
    assert(addresses.every(a=>a && a.street===s.name));
    assert.deepEqual(addresses.map(a=>a.number),addresses.map(a=>a.number).sort(collator.compare));
    for(const a of addresses){assert(!seen.has(a.id)); seen.add(a.id);}
  }
  assert.equal(seen.size,map.size);
  for(const a of map.values()) for(const p of a.parcels) assert(directory.groups.some(g=>g.id===p.group&&g.addressIds.includes(a.id)));
  for(const g of directory.groups) for(const id of g.addressIds) assert(map.get(id)!.parcels.some(p=>p.group===g.id));
});
test("Traver Tine uses county net value; shared addresses remain separate parcels", () => {
  const p=directory.addresses.flatMap(a=>a.parcels).find(p=>p.pin==="12100414002")!;
  assert.deepEqual([p.taxable,p.before,p.after,p.increase],["105899",95.31,317.70,222.39]);
  assert.equal(directory.addresses.filter(a=>a.parcels.length>1).length,285);
});
test("password, signed cookie, expiration, tampering and absent configuration", () => {
  const salt=randomBytes(16).toString("hex");
  process.env.ELECTION_REVIEW_PASSWORD_HASH=salt+":"+scryptSync("test-only-password",salt,32).toString("hex");
  process.env.ELECTION_REVIEW_SESSION_KEY=randomBytes(32).toString("hex");
  assert(verifyReviewPassword("test-only-password")); assert(!verifyReviewPassword("wrong"));
  const now=1791000000000; const token=createReviewToken(now);
  const oldPayload=token.split(".").slice(0,2).join(".");
  const oldToken=oldPayload+"."+createHmac("sha256",process.env.ELECTION_REVIEW_SESSION_KEY).update(oldPayload).digest("base64url");
  assert(!verifyReviewToken(oldToken,now), "sessions from the previous review release must be locked out");
  assert.equal(REVIEW_SECONDS,3600);
  assert(verifyReviewToken(token,now)); assert(!verifyReviewToken(token,now+REVIEW_SECONDS*1000));
  assert(!verifyReviewToken(token.slice(0,-1)+(token.endsWith("a")?"b":"a"),now));
  assert(!verifyReviewToken("true",now));
  process.env.ELECTION_REVIEW_SESSION_KEY="";
  assert(!verifyReviewToken(token,now)); assert(!verifyReviewPassword("test-only-password"));
});
test("review redirects allow only election pages and valid parcel IDs", () => {
  for(const path of ["https://attacker.invalid","//attacker.invalid","/api/admin","/election-information.evil","/election-information/../admin"]) assert.equal(safeReviewPath(path),"/election-information");
  assert.equal(safeReviewPath("/election-information/address-directory?address=12100414002"),"/election-information/address-directory?address=12100414002");
});

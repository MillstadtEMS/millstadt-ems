"use client";

// One act per person at a time. Every act (popping out of a snowbank, skating out for a triple axel,
// waving from behind a truck, pelting snowballs from the village) claims its person first; a second
// act with the same person waits until the first one leaves. The crew hanging from the Christmas
// lights don't count: they stay up there until a visitor knocks them down.

const holders = new Map<string, symbol>();

/** Claim a person for an appearance. Returns a release function, or null if they are already out. */
export function claimPerson(person: string): (() => void) | null {
  if (holders.has(person)) return null;
  const token = Symbol(person);
  holders.set(person, token);
  return () => { if (holders.get(person) === token) holders.delete(person); };
}

export function isPersonOut(person: string) {
  return holders.has(person);
}

/** Claim a group (the caroler trio, say) all or nothing. Returns one release for everyone, or null if anyone is out. */
export function claimPeople(people: readonly string[]): (() => void) | null {
  const releases: Array<() => void> = [];
  for (const person of people) {
    const release = claimPerson(person);
    if (!release) {
      releases.forEach((undo) => undo());
      return null;
    }
    releases.push(release);
  }
  return () => releases.forEach((undo) => undo());
}

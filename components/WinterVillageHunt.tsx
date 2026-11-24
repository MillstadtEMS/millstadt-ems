"use client";

import Image from "next/image";
import {
  createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore,
  type CSSProperties, type KeyboardEvent, type ReactNode,
} from "react";
import styles from "./WinterVillageHunt.module.css";

type Cover = "window" | "sill" | "bough" | "post" | "snow" | "rail" | "full";
type Spot = {
  id: string; name: string; clue: string;
  x: number; y: number; width: number; cover: Cover;
  flip?: boolean; light?: "amber" | "shade"; lean?: number;
};

// Coordinates on the uncropped 2:1 town. x is the position of his glasses,
// y the top of his hat. Paint the guest before the fleet, crowd and snowbanks.
const spots: Spot[] = [
  { id: "cottage", name: "Gingerbread shop doorway", clue: "My doorway looks sweet enough to eat.",
    x: 5.8, y: 60.1, width: 2.75, cover: "post", light: "amber" },
  { id: "wreath", name: "The garland by the corner lamp", clue: "I'll borrow a little holly and a streetlamp's glow where biscuit meets brick.",
    x: 11.9, y: 54.9, width: 2.85, cover: "bough", flip: true, lean: -3 },
  { id: "snowman", name: "The snowman's shoulder", clue: "My neighbor is wearing a hat too. Come spring he will melt away.",
    x: 2.4, y: 63.4, width: 3.2, cover: "bough", light: "shade" },
  { id: "tower", name: "Tin Man water tower railing", clue: "Our Tin Man wears the town's name on his chest. I slipped up to his belt.",
    x: 20.95, y: 17.6, width: 1.95, cover: "rail", flip: true, light: "shade" },
  { id: "eave", name: "Roof below the water tower", clue: "The Tin Man looks down on my perch. Colored bulbs trace the edge beneath my boots.",
    x: 17.6, y: 41.2, width: 2.45, cover: "sill", lean: -5, light: "shade" },
  { id: "west-window", name: "Corner store, left upstairs window", clue: "Above the shop, choose the pane that wakes up closer to the water.",
    x: 29.6, y: 45.6, width: 2.3, cover: "window", light: "amber" },
  { id: "east-window", name: "Corner store, right upstairs window", clue: "Above the shop, choose the pane nearer the old hoses and helmets.",
    x: 37.5, y: 46.8, width: 2.15, cover: "window", flip: true, light: "amber" },
  { id: "store", name: "The corner store entrance", clue: "Overnight shoppers would bump into me before crossing this threshold.",
    x: 29.7, y: 60.7, width: 2.8, cover: "post", light: "amber" },
  { id: "carol", name: "The singers outside the store", clue: "Nobody can hear my footfalls above the harmony.",
    x: 25.95, y: 59.9, width: 2.7, cover: "full", flip: true, light: "amber" },
  { id: "flag", name: "Roof beside the flagpole", clue: "One neighbor has groceries and the other kept ladders. A banner snaps above me.",
    x: 45.0, y: 49.8, width: 2.38, cover: "sill", light: "shade" },
  { id: "cupola", name: "The firehouse cupola", clue: "The old engine house wears a small pointed cap. Guess where I took shelter.",
    x: 60.65, y: 45.5, width: 2.18, cover: "rail", flip: true, light: "shade" },
  { id: "fire-door", name: "Old firehouse doorway", clue: "Long before the parade, crews used to hurry past this threshold to answer the bell.",
    x: 67.15, y: 60.3, width: 2.65, cover: "post", light: "amber" },
  { id: "belfry", name: "St. James bell tower", clue: "If the bells ring, the whole village will hear them. I'll hear them first.",
    x: 77.43, y: 33.3, width: 2.05, cover: "window", flip: true, light: "shade" },
  { id: "church", name: "The church's side windows", clue: "The steeple casts its shadow behind me. A row of arches glows along this wall.",
    x: 91.05, y: 55.9, width: 2.5, cover: "post", flip: true, light: "amber" },
  { id: "pine", name: "The evergreen near St. James", clue: "There are needles in my coat and a tall steeple nearby.",
    x: 95.58, y: 55.9, width: 2.85, cover: "bough", lean: -4, light: "shade" },
  { id: "gifts", name: "Santa's wrapped presents", clue: "I brought one parcel. A neighbor in the same uniform brought a whole stack.",
    x: 94.5, y: 67.1, width: 3.0, cover: "bough", flip: true, light: "amber" },
  { id: "left-unit", name: "The white Transit ambulance", clue: "My getaway has a white coat, a high van roof and a unit number ending in five.",
    x: 17.4, y: 57.3, width: 2.9, cover: "full", light: "shade" },
  { id: "gold-unit", name: "The yellow paramedic ambulance", clue: "My hiding place wears midnight and sunshine. It's on duty even during the holidays.",
    x: 42.9, y: 53.2, width: 2.95, cover: "full", flip: true, light: "shade" },
  { id: "engine", name: "Old No. 5 fire engine", clue: "Today's parade gives me a hiding place painted to match my coat. It has been rolling for generations.",
    x: 63.0, y: 54.4, width: 2.95, cover: "full", light: "shade" },
  { id: "right-unit", name: "The white box ambulance", clue: "This neighbor is white and boxy. Look for the unit with the number that ends in six.",
    x: 83.8, y: 55.2, width: 2.85, cover: "full", flip: true, light: "shade" },
  { id: "west-drift", name: "The snowbank near Snoopy", clue: "There's a little red house nearby. Its owner may bark if the drift gives me away.",
    x: 13.8, y: 84.0, width: 3.8, cover: "snow", light: "shade", lean: -5 },
  { id: "east-drift", name: "The snowbank near the Grinch", clue: "There's someone green after my loot. I'll keep still until the fresh powder settles.",
    x: 84.5, y: 84.3, width: 3.55, cover: "snow", flip: true, light: "shade", lean: 3 },
];

function broadHint(spot: Spot) {
  if (spot.y < 51) return "Try looking above street level.";
  if (spot.y > 79) return "Fresh snow can hide more than footprints.";
  if (spot.light === "amber") return "Look for a little warmth among the lights.";
  return "Look where shadows break up the outline of a red coat.";
}

const aliases: Record<string, string[]> = {
  cottage: ["gingerbread house", "gingerbread shop", "gingerbread cottage"],
  wreath: ["garland by streetlamp", "corner streetlamp", "corner lamp", "wreath by lamp"],
  snowman: ["snowman", "snowman shoulder"],
  tower: ["water tower", "tin man", "tin man water tower", "water tower catwalk"],
  eave: ["rooftop under water tower", "water tower roof", "store roof", "shop roof"],
  "west-window": ["left upstairs window", "left shop window", "west window", "left store window"],
  "east-window": ["right upstairs window", "right shop window", "east window", "right store window"],
  store: ["corner store", "store entrance", "shop door", "store door"],
  carol: ["carolers", "choir", "singers", "carollers"],
  flag: ["flagpole", "flag", "flag pole"],
  cupola: ["firehouse cupola", "cupola", "firehouse roof", "fire station tower"],
  "fire-door": ["old firehouse", "firehouse door", "fire station door", "firehouse entrance"],
  belfry: ["bell tower", "church tower", "belfry", "church steeple", "st james tower"],
  church: ["church windows", "side windows", "church arches", "side of church"],
  pine: ["christmas tree", "pine tree", "evergreen tree", "tree near church", "church evergreen"],
  gifts: ["presents", "wrapped presents", "santa's presents", "santa's gifts", "gift pile"],
  "left-unit": ["3925", "transit", "transit ambulance", "white van"],
  "gold-unit": ["3935", "yellow ambulance", "yellow paramedic unit", "black and yellow ambulance"],
  engine: ["old number five", "old no 5", "old no five", "fire truck", "fire engine", "old number 5"],
  "right-unit": ["3926", "white box ambulance", "box ambulance", "white box truck"],
  "west-drift": ["snowbank near snoopy", "snoopy's doghouse", "snoopy", "left snowbank", "doghouse"],
  "east-drift": ["snowbank near grinch", "grinch", "right snowbank", "grinch snowbank"],
};

function normalizeAnswer(value: string) {
  return value.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(?:the|a|an|behind|beside|near|under|on|in|at|of|by)\b/g, " ").trim().replace(/\s+/g, " ");
}

const guestArt = "/images/winter/hidden-guest.webp";
const storageKey = "millstadt:christmas-hunt:deck:v1";
type Deck = { last: string; remaining: string[] };

let visit: Spot | undefined;
let memoryDeck: Deck | undefined;
function drawVisit() {
  let deck: Deck | undefined;
  let saved: unknown;
  try { saved = JSON.parse(sessionStorage.getItem(storageKey) || "null"); } catch { /* Try history storage below. */ }
  if (!saved) {
    try { saved = history.state?.[storageKey]; } catch { /* A randomized in-memory round still works. */ }
  }
  saved ??= memoryDeck;
  if (saved && typeof saved === "object" && "last" in saved && "remaining" in saved &&
      typeof saved.last === "string" && Array.isArray(saved.remaining)) {
    const valid = new Set(spots.map(({ id }) => id));
    const remaining = saved.remaining.filter((id): id is string => typeof id === "string" && valid.has(id) && id !== saved.last);
    deck = { last: saved.last, remaining: [...new Set(remaining)] };
  }
  if (!deck?.remaining.length) {
    const ids = spots.map(({ id }) => id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    if (ids[ids.length - 1] === deck?.last) [ids[0], ids[ids.length - 1]] = [ids[ids.length - 1], ids[0]];
    deck = { last: "", remaining: ids };
  }
  const next = deck.remaining.pop()!;
  deck.last = next;
  memoryDeck = deck;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(deck));
  } catch {
    try { history.replaceState({ ...history.state, [storageKey]: deck }, ""); } catch { /* Storage blocked. */ }
  }
  visit = spots.find(({ id }) => id === next)!;
  return visit;
}

const noSubscription = () => () => {};
const serverVisit = () => null;
const getVisit = () => visit ?? drawVisit();
const escapeHits = 5;
type HuntState = { spot: Spot | null; found: boolean; hits: number; rounds: number; finish: () => void; fire: () => void };
const HuntContext = createContext<HuntState | null>(null);

export function WinterVillageHuntProvider({ children }: { children: ReactNode }) {
  const first = useSyncExternalStore<Spot | null>(noSubscription, getVisit, serverVisit);
  const [nextSpot, setNextSpot] = useState<Spot | null>(null);
  const [found, setFound] = useState(false);
  const [hits, setHits] = useState(0);
  const [rounds, setRounds] = useState(0);
  const fire = useCallback(() => {
    if (found) setHits((value) => Math.min(escapeHits, value + 1));
  }, [found]);
  const finish = useCallback(() => setFound(true), []);
  useEffect(() => {
    if (hits !== escapeHits) return;
    const timer = window.setTimeout(() => {
      setNextSpot(drawVisit());
      setFound(false);
      setHits(0);
      setRounds((value) => value + 1);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [hits]);
  return <HuntContext.Provider value={{ spot: nextSpot ?? first, found, hits, rounds, finish, fire }}>{children}</HuntContext.Provider>;
}

function useHunt() {
  const state = useContext(HuntContext);
  if (!state) throw new Error("The Christmas village hunt needs its provider.");
  return state;
}

type Point = { x: number; y: number };
const startPoint = { x: 50, y: 58 };
const clamp = (n: number) => Math.min(99.5, Math.max(.5, n));

function SnowballButton({ className, style, children }: {
  className: string; style?: CSSProperties; children?: ReactNode;
}) {
  const { fire } = useHunt();
  const repeat = useRef<number>(undefined);
  const gesture = useRef<{ x: number; y: number; held: boolean } | null>(null);
  const stop = useCallback(() => window.clearInterval(repeat.current), []);
  useEffect(() => {
    const cancel = () => { stop(); gesture.current = null; };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    return () => {
      stop();
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancel);
    };
  }, [stop]);
  return <button type="button" className={className} style={style} aria-label="Throw snowballs at the gift thief"
    onPointerDown={(e) => {
      if (!e.isPrimary || e.button !== 0) return;
      stop();
      gesture.current = { x: e.clientX, y: e.clientY, held: false };
      e.currentTarget.setPointerCapture(e.pointerId);
      repeat.current = window.setInterval(() => {
        if (gesture.current) { gesture.current.held = true; fire(); }
      }, 160);
    }}
    onPointerMove={(e) => {
      const start = gesture.current;
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) { stop(); start.held = true; }
    }}
    onPointerUp={stop} onPointerCancel={() => { stop(); gesture.current = null; }} onLostPointerCapture={stop}
    onContextMenu={(e) => e.preventDefault()}
    onClick={(e) => {
      if (!e.detail || (gesture.current && !gesture.current.held)) fire();
      gesture.current = null;
    }}>{children}</button>;
}

export function WinterVillageHuntTarget() {
  const { spot, found, finish, hits, fire } = useHunt();
  const layer = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLSpanElement>(null);
  const [searching, setSearching] = useState(false);
  const [cursor, setCursor] = useState<Point>(startPoint);
  const [miss, setMiss] = useState(0);
  const discovery = useRef<{ x: number; y: number; at: number } | null>(null);

  // Use the face, present and shushing hand as the hit area. Clothing below
  // the foreground objects is never a clickable giveaway.
  const check = useCallback((x: number, y: number, touch: boolean) => {
    if (!face.current || found) return false;
    const box = face.current.getBoundingClientRect();
    const padX = Math.max(2, ((touch ? 38 : 17) - box.width) / 2);
    const padY = Math.max(2, ((touch ? 38 : 17) - box.height) / 2);
    const hit = x >= box.left - padX && x <= box.right + padX && y >= box.top - padY && y <= box.bottom + padY;
    if (hit) finish();
    return hit;
  }, [found, finish]);

  useEffect(() => {
    const scene = layer.current?.closest<HTMLElement>("[data-hunt-scene]") ?? layer.current?.parentElement;
    if (!scene || !spot) return;
    let start: { pointerId: number; x: number; y: number } | undefined;
    function down(e: PointerEvent) {
      if (found || (e.target instanceof Element && e.target.closest("[data-snow-chief] button"))) {
        start = undefined;
        return;
      }
      if (e.isPrimary && e.button === 0) start = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
    }
    function up(e: PointerEvent) {
      if (start?.pointerId !== e.pointerId) return;
      if (Math.hypot(start.x - e.clientX, start.y - e.clientY) < 8 && check(e.clientX, e.clientY, e.pointerType !== "mouse")) {
        discovery.current = { x: e.clientX, y: e.clientY, at: performance.now() };
      }
      start = undefined;
    }
    // Finding him in the belfry consumes that tap, leaving the bell ready for its own gesture.
    function clicked(e: MouseEvent) {
      const last = discovery.current;
      discovery.current = null;
      if (last && e.detail > 0 && performance.now() - last.at < 480 && Math.hypot(last.x - e.clientX, last.y - e.clientY) < 8) {
        e.stopPropagation();
        e.preventDefault();
      }
    }
    function cancel() { start = undefined; }
    scene.addEventListener("click", clicked, true);
    scene.addEventListener("pointerdown", down, true);
    scene.addEventListener("pointerup", up, true);
    scene.addEventListener("pointercancel", cancel);
    return () => {
      scene.removeEventListener("click", clicked, true);
      scene.removeEventListener("pointerdown", down, true);
      scene.removeEventListener("pointerup", up, true);
      scene.removeEventListener("pointercancel", cancel);
    };
  }, [check, found, spot]);

  function keySearch(e: KeyboardEvent<HTMLDivElement>) {
    if (!layer.current || !spot || e.target !== e.currentTarget) return;
    const bounds = layer.current.getBoundingClientRect();
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      if (found) fire();
      else if (!check(bounds.left + bounds.width * cursor.x / 100, bounds.top + bounds.height * cursor.y / 100, false)) setMiss((n) => n + 1);
      return;
    }
    if (found) return;
    const moves: Record<string, Point> = {
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -2 }, ArrowDown: { x: 0, y: 2 },
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    e.stopPropagation();
    const step = e.shiftKey ? .48 : 2;
    const next = { x: clamp(cursor.x + move.x * step), y: clamp(cursor.y + move.y * step) };
    setCursor(next);
    const view = layer.current.closest<HTMLElement>("#winter-village-picture");
    if (view && view.scrollWidth > view.clientWidth) {
      const edges = view.getBoundingClientRect();
      const screenX = bounds.left + bounds.width * next.x / 100;
      if (screenX < edges.left + 24) view.scrollLeft -= edges.left + 24 - screenX;
      if (screenX > edges.right - 24) view.scrollLeft += screenX - edges.right + 24;
    }
  }

  // Project the center of the visible face from the 276:630 sprite onto the 2:1 postcard.
  const aim = spot && { left: `${spot.x + spot.width * (spot.flip ? .225 : -.225)}%`, top: `${spot.y + spot.width * .80}%` };
  return (
    <div ref={layer} className={styles.layer} role="group" tabIndex={0}
      aria-label="Search the Christmas postcard" aria-describedby="winter-hunt-key-help"
      onFocus={() => setSearching(true)} onBlur={() => setSearching(false)} onKeyDown={keySearch}>
      <span id="winter-hunt-key-help" className={styles.sr}>Use arrow keys to move the search lens. Hold Shift for a fine step. Enter checks the spot and throws snowballs after you find him. A landmark clue is available below the picture.</span>
      {spot && (
        <div aria-hidden="true" className={styles.guest} data-light={spot.light} data-cover={spot.cover} data-found={found}
          style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.width}%`,
            "--anchor": spot.flip ? "-20%" : "-80%", "--flip": spot.flip ? -1 : 1, "--lean": `${spot.lean ?? 0}deg`,
          } as CSSProperties}>
          <div className={styles.silhouette} data-escaping={hits === escapeHits}><Image src={guestArt} alt="" width={276} height={630} loading="eager" unoptimized /></div>
          <span ref={face} data-hunt-face="" className={styles.face} style={{ left: spot.flip ? "5%" : "20%" }} />
        </div>
      )}
      {found && aim && <>
        <SnowballButton className={styles.aim} style={aim} />
        {Array.from({ length: hits }, (_, i) => (
          <span key={i} className={styles.shot} aria-hidden="true"
            style={{ ...aim, "--from-x": `${(i % 2 ? 1 : -1) * (40 + i * 9)}px` } as CSSProperties}>
            <i className={styles.ball} /><i className={styles.powder} />
          </span>
        ))}
      </>}
      {searching && !found && <span aria-hidden="true" className={styles.reticle} style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }} />}
      <span role="status" className={styles.sr}>{searching && miss > 0 && `Search ${miss}. Nothing there yet.`}</span>
    </div>
  );
}

export function WinterVillageHuntControls() {
  const { spot, found, finish, hits, rounds } = useHunt();
  const [guess, setGuess] = useState("");
  const [wrong, setWrong] = useState(false);
  return (
    <div className={styles.bar}>
      <div className={styles.intro}>
        <div className={styles.sample} aria-hidden="true"><Image src={guestArt} alt="" width={276} height={630} loading="lazy" unoptimized /></div>
        <div><h3>Find the gift thief</h3><p>{found ? "Tap him fast or hold to throw a flurry of snowballs." : "Look for the green fellow with round glasses, a crooked nose and a sack of presents."}</p></div>
      </div>
      <span role="status" className={styles.success}>{found ? (hits ? `Snowballs ${hits}/${escapeHits}` : "You found him!") : rounds ? `He ducked away! Times chased off: ${rounds}.` : ""}</span>
      {found && <SnowballButton className={styles.throwButton}>Throw snowballs</SnowballButton>}
      {!found && spot && <details className={styles.clue}>
        <summary>Get a clue</summary>
        <div className={styles.clueBody}>
          <p>{broadHint(spot)}</p>
          <details className={styles.wordGame}>
            <summary>Play the word puzzle</summary>
            <p>{spot.clue}</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const answer = normalizeAnswer(guess);
              if (!answer) return;
              if ([spot.name, ...aliases[spot.id]].some((name) => normalizeAnswer(name) === answer)) {
                setGuess(""); setWrong(false); finish();
              }
              else setWrong(true);
            }}>
              <label htmlFor="winter-hunt-landmark">Where is he hiding?</label>
              <div>
                <input id="winter-hunt-landmark" value={guess} autoComplete="off" maxLength={72}
                  onChange={(e) => { setGuess(e.target.value); setWrong(false); }} />
                <button type="submit" disabled={!guess.trim()}>Check</button>
              </div>
              <span role="status">{wrong ? "That doesn't fit the clue. Try another spot." : ""}</span>
            </form>
          </details>
        </div>
      </details>}
    </div>
  );
}

"use client";

import { isSnowballTimeout } from "./snowballTimeout";

// Shake your phone or tablet and the crew hanging from the Christmas lights feel it. One
// devicemotion listener serves the whole lineup: it turns the sensor into the push the light
// string gets in screen coordinates (so the swing follows inertia: jerk the phone right and their
// feet trail left), and into a running strain that builds the longer and harder you shake. Each
// person on the lights has a breaking point drawn at random when a shake starts, so sometimes
// they all let go together, sometimes one by one, sometimes in twos and threes.
//
// Phones and tablets only. iPhones and iPads ask for motion access from a tap first (the "Shake
// the lights" chip); Android delivers motion right away. Call Time Out and reduced motion turn it
// all off. ?preview=ve&shake=1 enables it with a mouse (dispatch DeviceMotionEvents from the
// console; window.__memsCrewShake() reports the strain); &shake=ios also rehearses the iPhone
// permission chip, and &shake-plan=all or &shake-plan=one picks how they let go.

export type ShakeAccess = "idle" | "listening" | "ask" | "on" | "denied";

const G = 9.80665;
// Strain: a hard shake (about 15 m/s² rms) adds one unit per second, and no shake adds more, so
// even the wildest shaking takes a couple of seconds to break the first grip. Gentle jiggles,
// walking and car bumps stay under the floor and add nothing.
const STRAIN_FLOOR = 4.5, STRAIN_SPAN = 10, STRAIN_MAX_RATE = 1;
// After a short breather the crew recover, a little at a time.
const RECOVER_AFTER = .9, RECOVER_RATE = .25;
// After a start the filter spends a moment learning where gravity sits, then fades the shake in.
const SETTLE = .4, FADE_IN = .3;

type Member = { fall: () => void; at?: number; fired?: boolean };
const members = new Map<string, Member>();
const wakers = new Set<() => void>();
const accessListeners = new Set<() => void>();

const state = {
  access: "idle" as ShakeAccess,
  // Some platforms (iOS) report the opposite sign to the spec; gravity tells us which.
  flip: 1,
  gravityUp: 0,
  low: [0, 0, 0],
  // The first readings after a start, averaged: where gravity sits.
  sum: [0, 0, 0],
  span: 0,
  primed: false,
  settle: 0,
  // Running integrals of the shake in screen space (m/s, right and up): readers take differences.
  vx: 0,
  vy: 0,
  power: 0,
  load: 0,
  calm: 0,
  last: 0,
  lastShake: 0,
  shakes: 0,
  data: false,
  // The visitor allowed motion from the chip: they mean to shake.
  asked: false,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

let preview: string | null | undefined, previewPlan: string | null = null;
function previewMode() {
  if (preview !== undefined) return preview;
  preview = null;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") === "ve") { preview = params.get("shake"); previewPlan = params.get("shake-plan"); }
  } catch { /* No preview override. */ }
  return preview;
}

const isTouchDevice = () => navigator.maxTouchPoints > 0 && window.matchMedia("(any-pointer: coarse)").matches;
const isPhoneOrTablet = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
type PermissionAsker = { requestPermission?: () => Promise<"granted" | "denied" | "prompt"> };
const asker = () => typeof DeviceMotionEvent === "undefined" ? undefined : (DeviceMotionEvent as unknown as PermissionAsker).requestPermission;

function setAccess(next: ShakeAccess) {
  if (state.access === next) return;
  state.access = next;
  accessListeners.forEach(listener => listener());
}

// Screen rotation, so "sideways" is the screen's sideways in portrait and landscape alike.
function screenAngle() {
  const angle = typeof screen !== "undefined" && screen.orientation ? screen.orientation.angle
    : (window as { orientation?: number }).orientation ?? 0;
  return ((angle % 360) + 360) % 360;
}

// Each person's breaking point: shuffle who's on the lights, split them into groups (all at once,
// one by one, or a random mix) and space the groups along the strain.
function planFalls() {
  const ids = [...members].filter(([, member]) => !member.fired).map(([id]) => id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  // ?preview=ve&shake=1&shake-plan=all|one rehearses one pattern.
  const roll = previewPlan === "all" ? 0 : previewPlan === "one" ? .3 : Math.random();
  let groups: string[][];
  if (roll < .17) groups = [ids];
  else if (roll < .4) groups = ids.map(id => [id]);
  else {
    groups = [];
    let group: string[] = [];
    for (const id of ids) {
      group.push(id);
      if (Math.random() < .45) { groups.push(group); group = []; }
    }
    if (group.length) groups.push(group);
  }
  const first = groups.length === 1 ? rand(2.6, 3.4) : rand(2, 2.8);
  const span = groups.length === 1 ? 0 : rand(2.2, 3.6);
  groups.forEach((group, index) => {
    const at = first + (groups.length > 1 ? span * index / (groups.length - 1) : 0) + rand(-.15, .15) * (index ? 1 : 0);
    // Within a group they go a breath apart, not in robotic unison.
    for (const id of group) members.get(id)!.at = at + rand(0, .12);
  });
}

function resetStrain() {
  state.load = 0;
  for (const member of members.values()) member.at = undefined;
}

function onMotion(event: DeviceMotionEvent) {
  const withGravity = event.accelerationIncludingGravity;
  const pure = event.acceleration;
  const source = withGravity && withGravity.x !== null ? withGravity : pure && pure.x !== null ? pure : null;
  if (!source) return;
  if (!state.data) { state.data = true; setAccess("on"); }
  const now = event.timeStamp || performance.now();
  // A first reading, or the first after a pause (a hidden tab, Time Out): start the filters over.
  const restart = !state.last || now - state.last > 500;
  const dt = clamp((restart ? event.interval || 16 : now - state.last) / 1000, .004, .1);
  state.last = now;
  if (isSnowballTimeout() || reducedMotion()) {
    state.power = 0; state.primed = false;
    if (state.load) resetStrain();
    return;
  }

  const quarter = Math.round(screenAngle() / 90) % 4;
  const cos = [1, 0, -1, 0][quarter], sin = [0, 1, 0, -1][quarter];
  const x = source.x ?? 0, y = source.y ?? 0, z = source.z ?? 0;
  const reading = [x * cos - y * sin, x * sin + y * cos, z];
  if (restart || !state.primed) {
    state.low = [...reading]; state.sum = [0, 0, 0]; state.span = 0; state.primed = true; state.settle = 0;
    if (source === withGravity) state.gravityUp = reading[1] + reading[2];
  }
  if (source === withGravity) {
    // Held the right way up (upright, tilted back or flat on a table), gravity reads up the screen
    // and out of it per the spec, about +10 to +14 combined at any tilt; a platform that reports
    // the opposite has its signs flipped.
    state.gravityUp += (reading[1] + reading[2] - state.gravityUp) * (1 - Math.exp(-dt / 1.2));
    if (state.gravityUp > 6) state.flip = 1;
    else if (state.gravityUp < -6) state.flip = -1;
  }
  // Remove gravity and slow tilting: what's left is the shake. For a moment after a start the
  // readings only teach the filter where gravity sits (their average, so a phone that's already
  // moving doesn't fling anyone with a phantom jolt), then the shake fades in.
  state.settle += dt;
  if (state.settle < SETTLE) {
    reading.forEach((value, axis) => { state.sum[axis] += value * dt; });
    state.span += dt;
  } else if (state.span) {
    state.low = state.sum.map(total => total / state.span);
    state.span = 0;
  }
  const settling = state.settle < SETTLE;
  const fade = settling ? 0 : Math.min(1, (state.settle - SETTLE) / FADE_IN);
  const keep = 1 - Math.exp(-dt / .35);
  const shake = reading.map((value, axis) => {
    if (settling) return 0;
    state.low[axis] += (value - state.low[axis]) * keep;
    return (value - state.low[axis]) * state.flip * fade;
  });
  state.vx += shake[0] * dt;
  state.vy += shake[1] * dt;
  const power = shake[0] ** 2 + shake[1] ** 2 + shake[2] ** 2;
  state.power += (power - state.power) * (1 - Math.exp(-dt / .3));

  const rate = clamp((Math.sqrt(state.power) - STRAIN_FLOOR) / STRAIN_SPAN, 0, STRAIN_MAX_RATE);
  if (rate > 0) {
    if (!state.load) planFalls();
    if (now - state.lastShake > 1200) { state.shakes++; accessListeners.forEach(listener => listener()); }
    state.load += rate * dt;
    state.calm = 0;
    state.lastShake = now;
  } else if (state.load) {
    state.calm += dt;
    if (state.calm > RECOVER_AFTER) {
      state.load = Math.max(0, state.load - RECOVER_RATE * dt);
      if (!state.load) resetStrain();
    }
  }
  for (const member of members.values()) {
    if (member.at === undefined || member.fired || state.load < member.at) continue;
    member.fired = true;
    member.fall();
  }
  // A hand holding the phone trembles a little all the time: only real movement wakes the swing.
  if (power > .25 || state.load) wakers.forEach(wake => wake());
}

let users = 0, askTimer: number | undefined;

/** Starts listening on phones and tablets (and with ?preview=ve&shake=1). Returns a stop function. */
export function startShake(): () => void {
  if (typeof window === "undefined" || typeof DeviceMotionEvent === "undefined") return () => {};
  if (reducedMotion() || !(isTouchDevice() || previewMode())) return () => {};
  if (users++ === 0) {
    window.addEventListener("devicemotion", onMotion);
    if (state.access === "idle") setAccess("listening");
    // No motion yet: iPhones and iPads need a tap to allow it.
    askTimer = window.setTimeout(() => {
      if (state.access === "listening" && asker() && (isPhoneOrTablet() || previewMode() === "ios")) setAccess("ask");
    }, 1400);
    if (previewMode()) (window as { __memsCrewShake?: () => unknown }).__memsCrewShake = shakeSnapshot;
  }
  return () => {
    if (--users > 0) return;
    window.removeEventListener("devicemotion", onMotion);
    window.clearTimeout(askTimer);
  };
}

/** The iPhone/iPad permission prompt. Call straight from a tap. */
export function askForShake() {
  const ask = asker();
  if (!ask) return;
  const answer = previewMode() === "ios" ? Promise.resolve("granted" as const) : ask.call(DeviceMotionEvent);
  answer.then(
    result => {
      state.asked = result === "granted";
      setAccess(result === "granted" ? state.data ? "on" : "listening" : "denied");
    },
    () => setAccess("denied"),
  );
}

export const shakeAccess = () => state.access;
/** Bumps each time a new burst of real shaking starts. */
export const shakeCount = () => state.shakes;
/** Someone means to shake (they allowed motion, or already shook): time to load the straining faces. */
export const shakeWanted = () => state.asked || state.shakes > 0;
export function subscribeShakeAccess(listener: () => void) {
  accessListeners.add(listener);
  return () => { accessListeners.delete(listener); };
}

/** One person on the lights: `fall` runs once when their grip gives out. */
export function joinShake(id: string, fall: () => void) {
  const member: Member = { fall };
  // Joining mid-shake (say, climbing back up): a fresh grip, a little above the current strain.
  if (state.load) member.at = state.load + rand(1.4, 2.8);
  members.set(id, member);
  return () => { if (members.get(id) === member) members.delete(id); };
}

/** How close someone is to letting go: 0 relaxed, 1 the moment they fall. */
export function shakeStrain(id: string) {
  const at = members.get(id)?.at;
  return at ? state.load / at : 0;
}

/** The running sideways velocity of the shake (m/s, screen right positive); use differences. */
export const shakeVelocity = () => state.vx;
/** The running vertical velocity of the shake (m/s, screen up positive); use differences. */
export const shakeLift = () => state.vy;
/** True while the phone is moving or the crew are still strained. */
export const shakeBusy = () => state.load > 0 || (state.last > 0 && performance.now() - state.last < 600 && state.power > .5);
/** Wakes a swing loop on each motion reading. */
export function subscribeShake(wake: () => void) {
  wakers.add(wake);
  return () => { wakers.delete(wake); };
}
export const SHAKE_GRAVITY = G;

function shakeSnapshot() {
  return {
    access: state.access, load: +state.load.toFixed(3), rms: +Math.sqrt(state.power).toFixed(2), flip: state.flip,
    vx: +state.vx.toFixed(3), shakes: state.shakes,
    members: Object.fromEntries([...members].map(([id, member]) => [id, { at: member.at && +member.at.toFixed(2), fired: Boolean(member.fired), strain: +shakeStrain(id).toFixed(2) }])),
  };
}

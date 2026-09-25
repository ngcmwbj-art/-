// Stage colour grading, sky colours and shadow parameters (30_level_art 7.3 /
// 7.4). The field keeps one interpolated `Grade`; setStage() tweens between
// the presets (0→1 0.6s, 1→2 1.5s, 2→night 3.0s).

import { toRgb } from '../engine/pixel';

export type RGB = [number, number, number];

export interface Grade {
  skyTop: RGB;
  skyBot: RGB;
  /** Extra thin horizon line colour (stage 2) – alpha in horizonA. */
  horizon: RGB;
  horizonA: number;
  mul: RGB;
  glare: RGB;
  glareA: number;
  topDark: RGB;
  topA: number;
  shadow: RGB;
  shadowA: number;
  shadowLen: number;
  /** 0 = sun direction (ESE), 1 = every shadow points at the mall. */
  toMall: number;
  /** 0..1 how "night" it is (lamps on, sun shadows off). */
  night: number;
  rim: RGB;
  /** Motion scale of stage-sensitive ambient animation (0 = frozen at stage 1). */
  motion: number;
  /** Strength of the emissive layer outdoors (stage 1: the shop and window lights die down). */
  lit: number;
  /** Desaturation laid over the frame (stage 1: the colour drains out of the stopped town). */
  desat: number;
  /**
   * Which side the bleed of light (glare) comes from: 0 = left (the sunset
   * of 夕鳴町, chapter 1), 1 = right (the dawn of 星見台, 52 8.3).
   */
  glareRight: number;
  /** Width of the bleed, as a fraction of the screen (0.45 = 30 7.3; 0.30 = pal_h2). */
  glareW: number;
  /** x of the sun's shadow direction: +1 shadows fall east (the town's sunset), −1 west (星見台's sunrise). */
  sunX: number;
  /** Strength (0..1) of the runtime 1px rim on the right edge of characters (the morning sun, 52 8.9). */
  rimRight: number;
  /** Chapter-2 sky mirrored in the water: star density (0..1), milky way (0..1), morning star size in px (0/2/3). */
  stars: number;
  milky: number;
  venus: number;
}

const hx = (h: string): RGB => toRgb(h);

/** Fields added for chapter 2, at their chapter-1 values. */
const CH1_EXTRA = { glareRight: 0, glareW: 0.45, sunX: 1, rimRight: 0, stars: 0, milky: 0, venus: 0 };

export const GRADES: Record<number, Grade> = {
  0: {
    skyTop: hx('#F7C27A'), skyBot: hx('#F2894B'), horizon: hx('#FFE7A3'), horizonA: 0,
    mul: hx('#FFF3E6'), glare: hx('#F2894B'), glareA: 0.18, topDark: hx('#3A2B5C'), topA: 0,
    shadow: hx('#5B4A7A'), shadowA: 0.35, shadowLen: 1.3, toMall: 0, night: 0, rim: hx('#F2894B'), motion: 1, lit: 1, desat: 0, ...CH1_EXTRA,
  },
  // stage 1 (QA round 1: the 17:00 change has to read at a glance): the
  // warmth drains out — a cooler magenta-violet multiply than the spec's
  // #F9E4EC, a weaker warm bleed, a touch more dark from the top, 22% of the
  // colour gone and the shop / window lights dying down
  1: {
    skyTop: hx('#D9728A'), skyBot: hx('#F2894B'), horizon: hx('#FFE7A3'), horizonA: 0,
    mul: hx('#E8D3E6'), glare: hx('#B04A7A'), glareA: 0.1, topDark: hx('#3A2B5C'), topA: 0.16,
    shadow: hx('#4A3A6E'), shadowA: 0.38, shadowLen: 1.4, toMall: 0, night: 0, rim: hx('#F2894B'), motion: 0, lit: 0.35, desat: 0.22, ...CH1_EXTRA,
  },
  2: {
    skyTop: hx('#7A5AA0'), skyBot: hx('#E0567A'), horizon: hx('#FFE7A3'), horizonA: 1,
    mul: hx('#E4D8F0'), glare: hx('#E0567A'), glareA: 0.14, topDark: hx('#3A2B5C'), topA: 0.18,
    shadow: hx('#3A2B5C'), shadowA: 0.42, shadowLen: 1.2, toMall: 1, night: 0, rim: hx('#E0567A'), motion: 0.6, lit: 1, desat: 0.08, ...CH1_EXTRA,
  },
  3: {
    skyTop: hx('#1B1733'), skyBot: hx('#3A2B5C'), horizon: hx('#FFF6D8'), horizonA: 0,
    mul: hx('#6E6A9E'), glare: hx('#F2894B'), glareA: 0, topDark: hx('#1B1733'), topA: 0.25,
    shadow: hx('#1B1733'), shadowA: 0.3, shadowLen: 0, toMall: 0, night: 1, rim: hx('#FFE7A3'), motion: 1, lit: 1, desat: 0, ...CH1_EXTRA,
  },
};

/**
 * Chapter 2 (星見台, 52 8.3): pal_h0 よなか, pal_h1 ともしび, pal_h2 よびごえ and
 * the three steps of the dawn in the ending (pal_h3a before the chime,
 * pal_h3b the sunrise, pal_h3c the morning). No sun shadows at night (a
 * moonless night: only the round contact shadows, and in h1+ the tomato
 * light's own short shadows); the wind has stopped (motion 0) until the
 * morning wind of h3c. The light bleeds in from the right (the east).
 *
 * 2026-09-26 (the client: "4:59 is nearly five in the morning — only what
 * is round the hero can be seen, it's too hard"): 4:59 at the end of summer
 * is the blue before dawn, the sky already paling in the east. The night is
 * lighter (#5C5A94 → #9894C4): roads, houses, paddies, people, symbols and
 * the things to examine read anywhere on the 1× screen; it stays blue-violet,
 * the stars a little fewer, and the east edge whitens a little.
 */
export type GradeHKey = 'h0' | 'h1' | 'h2' | 'h3a' | 'h3b' | 'h3c';

const NIGHT_H = {
  skyTop: hx('#0B0B14'), skyBot: hx('#1B1733'), horizon: hx('#3A2B5C'), horizonA: 0,
  mul: hx('#908CCA'), glare: hx('#B4AEDA'), glareA: 0.08, topDark: hx('#0B0B14'), topA: 0.16,
  shadow: hx('#0B0B14'), shadowA: 0.34, shadowLen: 0, toMall: 0, night: 1, rim: hx('#F2894B'), motion: 0, lit: 1, desat: 0.08,
  glareRight: 1, glareW: 0.34, sunX: -1, rimRight: 0, stars: 0.8, milky: 0.8, venus: 2,
};

export const GRADES_H: Record<GradeHKey, Grade> = {
  h0: { ...NIGHT_H },
  h1: { ...NIGHT_H },
  h2: {
    ...NIGHT_H,
    horizonA: 1, mul: hx('#9C96D0'), glare: hx('#C4B8E0'), glareA: 0.16, topA: 0.12, desat: 0.06, stars: 0.55, milky: 0.6, venus: 3,
  },
  h3a: {
    ...NIGHT_H,
    skyTop: hx('#3A2B5C'), skyBot: hx('#7A5AA0'), horizon: hx('#F7C27A'), horizonA: 0.6,
    mul: hx('#B8A8CC'), glare: hx('#D8B8D0'), glareA: 0.22, topDark: hx('#1B1733'), topA: 0.08, desat: 0.03,
    shadow: hx('#1B1733'), shadowA: 0.32, night: 0.8, stars: 0.25, milky: 0.2, venus: 3,
  },
  h3b: {
    ...NIGHT_H,
    skyTop: hx('#7A5AA0'), skyBot: hx('#F7C27A'), horizon: hx('#FFE7A3'), horizonA: 1,
    mul: hx('#FFE0C8'), glare: hx('#F7C27A'), glareA: 0.22, topDark: hx('#1B1733'), topA: 0,
    shadow: hx('#5B4A7A'), shadowA: 0.35, shadowLen: 1.6, night: 0, rim: hx('#F7C27A'), motion: 0.4, desat: 0,
    rimRight: 1, stars: 0, milky: 0, venus: 0,
  },
  h3c: {
    ...NIGHT_H,
    skyTop: hx('#7FD1E8'), skyBot: hx('#F7C27A'), horizon: hx('#FFE7A3'), horizonA: 0,
    mul: hx('#FFF0DC'), glare: hx('#F7C27A'), glareA: 0.16, topDark: hx('#1B1733'), topA: 0,
    shadow: hx('#5B4A7A'), shadowA: 0.35, shadowLen: 1.4, night: 0, rim: hx('#F7C27A'), motion: 1, desat: 0,
    rimRight: 1, stars: 0, milky: 0, venus: 0,
  },
};

/** The pal_h* preset of a chapter-2 stage (3 = the morning, pal_h3c). */
export function gradeHKey(stage: number): GradeHKey {
  return stage <= 0 ? 'h0' : stage === 1 ? 'h1' : stage === 2 ? 'h2' : 'h3c';
}

/**
 * Chapter-2 indoor light-map bases (52 4.0): 星見台's rooms don't grade by
 * stage, only by their own light (a dark part and lamps on top). Per map,
 * used when the map doesn't give MapDef.lightBase. 2026-09-26: the barn's
 * tubes over the feed aisle and the greenhouse's lamps are on all night;
 * the unlit train is a little lighter.
 */
export const HOSHI_INDOOR_BASE: Record<string, string> = {
  map_hoshi_train: '#6E6C9E',
  map_hoshi_school: '#F2E6D0',
  map_hoshi_house: '#F0E6D2',
  map_hoshi_barn: '#E8ECF0',
};
/**
 * The morning (h3) base of the 星見台 rooms: at 5:00 the morning comes in
 * through the east (the barn: the day over its tubes, 52 4.3 カット2a).
 */
export const HOSHI_INDOOR_MORNING: Record<string, string> = {
  map_hoshi_barn: '#FFF2E0',
  default: '#FFF0DC',
};

/** Indoor multiply colours per outdoor stage (pal_indoor). */
export const INDOOR_MUL: Record<number, RGB> = {
  0: hx('#FFF0DC'),
  1: hx('#EDDAE6'),
  2: hx('#E6DCEF'),
  // night: the room is dark except where its lamps throw light (render.ts light
  // map); the lamps are warm, so the house is the warmest place (8.6)
  3: hx('#5E5070'),
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpC = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function lerpGrade(a: Grade, b: Grade, t: number): Grade {
  return {
    skyTop: lerpC(a.skyTop, b.skyTop, t),
    skyBot: lerpC(a.skyBot, b.skyBot, t),
    horizon: lerpC(a.horizon, b.horizon, t),
    horizonA: lerp(a.horizonA, b.horizonA, t),
    mul: lerpC(a.mul, b.mul, t),
    glare: lerpC(a.glare, b.glare, t),
    glareA: lerp(a.glareA, b.glareA, t),
    topDark: lerpC(a.topDark, b.topDark, t),
    topA: lerp(a.topA, b.topA, t),
    shadow: lerpC(a.shadow, b.shadow, t),
    shadowA: lerp(a.shadowA, b.shadowA, t),
    shadowLen: lerp(a.shadowLen, b.shadowLen, t),
    toMall: lerp(a.toMall, b.toMall, t),
    night: lerp(a.night, b.night, t),
    rim: lerpC(a.rim, b.rim, t),
    motion: lerp(a.motion, b.motion, t),
    lit: lerp(a.lit, b.lit, t),
    desat: lerp(a.desat, b.desat, t),
    glareRight: lerp(a.glareRight, b.glareRight, t),
    glareW: lerp(a.glareW, b.glareW, t),
    sunX: lerp(a.sunX, b.sunX, t),
    rimRight: lerp(a.rimRight, b.rimRight, t),
    stars: lerp(a.stars, b.stars, t),
    milky: lerp(a.milky, b.milky, t),
    venus: lerp(a.venus, b.venus, t),
  };
}

export function cloneGrade(g: Grade): Grade {
  return lerpGrade(g, g, 0);
}

export function css(c: RGB, a = 1): string {
  const r = Math.round(c[0]);
  const g = Math.round(c[1]);
  const b = Math.round(c[2]);
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

/** Shadow direction for an object at world tile position (tx,ty). */
export function shadowDir(g: Grade, tx: number, ty: number, mallX = 50, mallY = 4): [number, number] {
  const sun: [number, number] = [g.sunX ?? 1, 0.25];
  if (g.toMall <= 0) return sun;
  let th = Math.atan2(-(mallY - ty), mallX - tx); // screen y down → north positive
  if (th < 0) th = th < -Math.PI / 2 ? Math.PI / 2 : 0;
  if (th > Math.PI / 2) th = Math.PI / 2;
  const mall: [number, number] = [Math.cos(th), -0.65 * Math.sin(th)];
  // rotate smoothly between the two directions
  const a0 = Math.atan2(sun[1], sun[0]);
  const a1 = Math.atan2(mall[1], mall[0]);
  const a = a0 + (a1 - a0) * g.toMall;
  const l0 = Math.hypot(sun[0], sun[1]);
  const l1 = Math.hypot(mall[0], mall[1]);
  const l = l0 + (l1 - l0) * g.toMall;
  return [Math.cos(a) * l, Math.sin(a) * l];
}

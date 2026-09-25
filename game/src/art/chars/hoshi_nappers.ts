// The three sleepers on the meeting hall's floor cushions (52 10.5,
// obj_hoshi_nappers): prop_h_napper_masa (シゲじい), prop_h_napper_kiyo
// (スギばあ), prop_h_napper_take (タケじい). Levels' prop_h_napper draws
// these char sprites' 'sleep' anim (26×16 frames at the tile's (−5, 0),
// uniform 100 ms frames on the field clock), so each loop below carries its
// whole rhythm:
//  - シゲじい on his back, his hunting cap over his face, a brown knit vest:
//    a snore every 3.4 s (the chest rises 2px, the cap lifts 1px);
//  - スギばあ on her side under a pale blue towel blanket, a navy fan by
//    her: a snore every 3.1 s (the shoulder rises 1px) — the two drift in
//    and out of step (a small laugh, never loud);
//  - タケじい on his back, arms folded, a towel on his belly, his straw hat
//    beside him: a breath every 2 s, and over his head his sleep-talk is a
//    tiny tiller (6×4) bobbing in a bubble (not a 「Z」).
//  - the sleep-talk 「……あちゃ〜……」: every 20–26 s one of the couple (in
//    turn) shows a small bubble (10×7, a 1px 「〜」) for 1.0 s. NAPPER_TALK
//    gives the clock so the sound (se_h_acha) can follow it: at field time t,
//    napperTalking('masa' | 'kiyo', t).
// From h3 (the ending, cut 2d) the snoring stops and all three sit up on
// their cushions; スギばあ stretches once (followFlag swaps the loops).

import { flat, mat, Fig, type Mats } from './fig';
import type { Pose } from './rig';
import { registerChar, type CharAnim, type CharSprite } from './registry';
import { followFlag, stage } from './people/hoshi_kit';

const M: Mats = {
  skin: mat('#F2B894', { shade: '#D9A07A', light: '#FFD9B8', dark: '#B87A5A' }),
  hair: mat('#E8E4D8', { shade: '#C8C2B4', light: '#F4F1E8', dark: '#9AA0A8' }),
  cap: mat('#8A7A4A', { shade: '#5A4A32', light: '#A8986A', dark: '#3A3020' }),
  vest: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A', dark: '#3A2616' }),
  shirt: mat('#E8E4D8', { shade: '#C8C2B4', light: '#F4F1E8', dark: '#9AA0A8' }),
  pants: mat('#6B7186', { shade: '#4A5068', light: '#8E95A6', dark: '#3A3F48' }),
  sock: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8' }),
  blanket: mat('#7FD1E8', { shade: '#4AA8E0', light: '#A8E4F0', dark: '#2F4A8A' }),
  dress: mat('#B04A7A', { shade: '#8A2E3A', light: '#D9728A', dark: '#5A1E2A' }),
  fan: mat('#2F4A8A', { shade: '#223668', light: '#4766A8' }),
  fanStick: flat('#C8A06A'),
  towel: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8' }),
  straw: mat('#F6D98A', { shade: '#D9A441', light: '#FFE7A3', dark: '#A8742A' }),
  band: flat('#2E6B4A'),
  eye: flat('#2A2440'),
  mouth: flat('#2A2440'),
  paper: flat('#F4F1E8'),
  ink: flat('#2A2440'),
  tiller: mat('#3A7A8A', { shade: '#2A5A6A', light: '#5A9AA8' }),
  tine: flat('#9AA0A8'),
};

/** A sleep-talk bubble (10×7 with a tail) at (x, y): 「〜」, or the tiny tiller. */
function bubble(f: Fig, x: number, y: number, kind: 'acha' | 'tiller', k = 0) {
  f.part('paper', { flat: true, rim: false });
  f.rows(x, y, ['.########.', '##########', '##########', '##########', '.########.', '...##.....', '..#.......']);
  f.part('ink', { flat: true, rim: false });
  if (kind === 'acha') {
    // 〜
    f.px(x + 2, y + 2).px(x + 3, y + 1).px(x + 4, y + 2).px(x + 5, y + 3).px(x + 6, y + 2).px(x + 7, y + 1);
  } else {
    // a tiller: engine box, handle, wheel; the tines turn (k)
    f.part('tiller', { flat: true, rim: false });
    f.t(0).rect(x + 3, y + 1 + k, 3, 2).t(-1).px(x + 5, y + 2 + k).t(null);
    f.part('ink', { flat: true, rim: false });
    f.px(x + 6, y + k).px(x + 7, y - 1 + k).px(x + 3, y + 3 + k);
    f.part('tine', { flat: true, rim: false });
    f.px(x + 2, y + 2 + k).px(x + 2 - k, y + 3);
  }
}

// ---- シゲじい: on his back, the cap over his face -----------------------------------

function masa(f: Fig, p: Pose) {
  const sit = p.act === 'sit';
  if (sit) return sitUp(f, p, 'masa');
  const ch = p.ph; // 0 rest, 1 half, 2 full breath
  const up = ch === 2 ? 2 : ch;
  // legs toward the right, grey trousers, white socks
  f.part('pants', { shade: 'rb', light: 't' });
  f.rect(16, 10, 7, 2).rect(16, 12, 7, 2);
  f.part('pants', { flat: true });
  f.t(-1).hl(16, 22, 12).t(null);
  f.part('sock', { shade: 'rb', light: 't' });
  f.rect(23, 10, 2, 2).rect(23, 12, 2, 2);
  // body: the knit vest, the chest rising with the snore
  f.part('shirt', { shade: 'rb', light: 't' });
  f.rect(6, 9 - (up > 0 ? 1 : 0), 10, 6 + (up > 0 ? 1 : 0));
  f.part('vest', { shade: 'rb', light: 't' });
  f.rect(8, 9 - up, 8, 6 + up);
  f.part('vest', { flat: true });
  for (let x = 9; x < 16; x += 2) f.t(-1).px(x, 11 - (up > 1 ? 1 : 0)).px(x + 1, 13).t(null);
  // arms at his sides, hands on the tatami
  f.part('shirt', { shade: 'rb', light: 't' });
  f.rect(7, 8, 6, 1).rect(7, 15, 6, 1);
  f.part('skin', { shade: 'rb', light: 't' });
  f.rect(13, 8, 2, 1).rect(13, 15, 2, 1);
  // head on the cushion, the hunting cap laid over the face
  f.part('skin', { shade: 'rb', light: 't' });
  f.ell(4, 12, 3, 3);
  f.part('hair', { shade: 'r', light: '' });
  f.rect(1, 11, 1, 3);
  f.part('cap', { shade: 'rb', light: 't' });
  f.rows(2, 9 - (ch === 2 ? 1 : 0), ['.####.', '######', '######', '.####.']);
  f.part('cap', { flat: true });
  f.t(-2).hl(3, 6, 12 - (ch === 2 ? 1 : 0)).t(null);
  if (p.act === 'talk') bubble(f, 1, 1, 'acha');
}

// ---- スギばあ: on her side under the towel blanket ----------------------------------

function kiyo(f: Fig, p: Pose) {
  if (p.act === 'sit' || p.act === 'stretch') return sitUp(f, p, 'kiyo');
  const up = p.ph ? 1 : 0;
  // the fan by her feet
  f.part('fan', { shade: 'rb', light: 't' });
  f.ell(23, 13, 2.5, 2);
  f.part('fanStick', { flat: true, rim: false });
  f.px(21, 14).px(20, 15);
  // her dress, curled on her side, knees drawn up
  f.part('dress', { shade: 'rb', light: 't' });
  f.rows(6, 9 - up, ['.#########...', '############', '############', '#############', '.###########.', '..##########.']);
  f.part('sock', { shade: 'rb', light: 't' });
  f.rect(18, 13, 2, 2);
  // the pale blue towel blanket over her middle
  f.part('blanket', { shade: 'rb', light: 't' });
  f.rows(9, 10 - up, ['.#######', '########', '########', '.######.']);
  f.part('blanket', { flat: true });
  f.t(1).hl(10, 15, 10 - up).t(null);
  // her hand under her cheek, the grey bun, the face turned to us
  f.part('skin', { shade: 'rb', light: 't' });
  f.ell(4, 11, 3, 3);
  f.part('hair', { shade: 'rb', light: 't' });
  f.rows(1, 8, ['.####.', '######', '##....', '#.....']);
  f.rows(0, 7, ['..##']);
  f.part('eye', { flat: true, rim: false });
  f.hl(3, 4, 11).hl(6, 6, 11);
  f.part('skin', { shade: 'rb', light: 't' });
  f.rect(3, 13, 3, 1);
  if (p.act === 'talk') bubble(f, 3, 0, 'acha');
}

// ---- タケじい: on his back, arms folded, the straw hat beside him -----------------------

function take(f: Fig, p: Pose) {
  if (p.act === 'sit') return sitUp(f, p, 'take');
  const up = p.ph ? 1 : 0;
  // his straw hat on the floor above his head
  f.part('straw', { shade: 'rb', light: 't' });
  f.ell(4, 5, 4, 2);
  f.part('straw', { shade: 'rb', light: 't' });
  f.ell(4, 4, 2, 1.5);
  f.part('band', { flat: true, rim: false });
  f.hl(3, 5, 5);
  // legs, grey work trousers, bare feet
  f.part('pants', { shade: 'rb', light: 't' });
  f.rect(16, 10, 7, 2).rect(16, 12, 7, 2);
  f.part('pants', { flat: true });
  f.t(-1).hl(16, 22, 12).t(null);
  f.part('skin', { shade: 'rb', light: 't' });
  f.rect(23, 10, 2, 2).rect(23, 12, 2, 2);
  // the grey work shirt, rising 1px with each breath; arms folded on it
  f.part('shirt', { shade: 'rb', light: 't' });
  f.rect(7, 9 - up, 9, 6 + up);
  f.part('towel', { shade: 'rb', light: 't' });
  f.rect(12, 10 - up, 3, 4);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.rect(8, 10 - up, 4, 2);
  f.part('skin', { shade: 'rb', light: 't' });
  f.rect(10, 12 - up, 2, 1).rect(8, 11 - up, 1, 1);
  // head: white stubble hair, eyes shut
  f.part('skin', { shade: 'rb', light: 't' });
  f.ell(4, 12, 3, 3);
  f.part('hair', { shade: 'r', light: '' });
  f.rect(1, 10, 1, 4).px(2, 10).px(2, 14);
  f.part('eye', { flat: true, rim: false });
  f.px(4, 11).px(4, 13);
  f.part('mouth', { flat: true, rim: false });
  f.px(6, 12);
  bubble(f, 9, 1, 'tiller', p.tick % 2);
}

// ---- sitting up on the cushions (the ending, h3) ----------------------------------------

function sitUp(f: Fig, p: Pose, who: 'masa' | 'kiyo' | 'take') {
  // a small seated figure in the middle of the cushion (feet tucked under)
  const x = 5;
  const body = who === 'masa' ? 'vest' : who === 'kiyo' ? 'dress' : 'shirt';
  const stretch = p.act === 'stretch' ? p.ph : 0;
  f.part(who === 'kiyo' ? 'dress' : 'pants', { shade: 'rb', light: 't' });
  f.rows(x, 12, ['.##########.', '############', '.##########.']);
  f.part(body, { shade: 'rb', light: 't' });
  f.rows(x + 2, 6, ['.######.', '########', '########', '########', '########', '########']);
  f.part('skin', { shade: 'rb', light: 't' });
  if (stretch) {
    // both arms up over her head: a long stretch
    f.rect(x + 1, 0, 1, 5).rect(x + 10, 0, 1, 5);
  } else f.rect(x + 1, 10, 2, 2).rect(x + 9, 10, 2, 2);
  f.part('skin', { shade: 'rb', light: 't' });
  f.ell(x + 6, 3.5, 3, 3);
  f.part('hair', { shade: 'rb', light: 't' });
  if (who === 'kiyo') f.rows(x + 3, 0, ['.####.', '######', '#....#']);
  else f.rows(x + 3, 1, ['.####.', '#....#']);
  if (who === 'masa') {
    f.part('cap', { shade: 'rb', light: 't' });
    f.rows(x + 2, 0, ['.######.', '########']);
  }
  f.part('eye', { flat: true, rim: false });
  f.hl(x + 4, x + 5, 3).hl(x + 7, x + 8, 3);
  if (stretch) f.part('mouth', { flat: true, rim: false }).rect(x + 6, 5, 1, 1);
}

// ---- the clocks -------------------------------------------------------------------------

/** The couple's sleep-talk: loop length and where the bubble shows (ms). */
export const NAPPER_TALK = {
  masa: { loop: 47600, at: 10000, len: 1000, snore: 3400 },
  kiyo: { loop: 46500, at: 33000, len: 1000, snore: 3100 },
} as const;

/** Is シゲじい / スギばあ saying 「……あちゃ〜……」 at field time t (ms)? */
export function napperTalking(who: 'masa' | 'kiyo', t: number): boolean {
  const c = NAPPER_TALK[who];
  const k = ((t % c.loop) + c.loop) % c.loop;
  return k >= c.at && k < c.at + c.len;
}

const STEP = 100;

type Draw = (f: Fig, p: Pose) => void;

/** Render one frame of a napper (26×16). */
function frame(draw: Draw, act: string, ph: number, tick = 0): HTMLCanvasElement {
  const f = new Fig(26, 16, M, 0);
  const p: Pose = { view: 'down', dir: 'down', mirror: false, step: 0, run: false, bob: 0, breath: 0, blink: false, blinkClosed: false, lookUp: false, act, ph, tick, mode: 'anim' };
  draw(f, p);
  return f.render().toCanvas();
}

/** A 100ms-step loop: the snore curve every `period` ms, the bubble at [at, at+len). */
function snoreLoop(draw: Draw, loop: number, period: number, at: number, len: number, shape: number[]): HTMLCanvasElement[] {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (act: string, ph: number) => {
    const k = act + ph;
    let c = cache.get(k);
    if (!c) cache.set(k, (c = frame(draw, act, ph)));
    return c;
  };
  const out: HTMLCanvasElement[] = [];
  const n = Math.round(loop / STEP);
  const per = Math.round(period / STEP);
  for (let i = 0; i < n; i++) {
    const t = i * STEP;
    const ph = shape[Math.floor(((i % per) / per) * shape.length)];
    out.push(get(t >= at && t < at + len ? 'talk' : '', ph));
  }
  return out;
}

/** A napper's char sprite from its frame lists (every facing shows the same frames). */
function sheet(id: string, loop: HTMLCanvasElement[], sit: HTMLCanvasElement[]): CharSprite {
  const anim: CharAnim = { frames: loop, ms: STEP };
  const sitAnim: CharAnim = { frames: sit, ms: STEP };
  const by = { down: loop, up: loop, left: loop, right: loop };
  const first = { down: [loop[0]], up: [loop[0]], left: [loop[0]], right: [loop[0]] };
  return {
    id,
    w: 26,
    h: 16,
    walk: first,
    idle: by,
    idleFrameMs: STEP,
    anims: { sleep: anim, idle: anim, sit: sitAnim },
    extra: { sleep: loop[0], sit: sit[0], look_up: sit[0] },
    extraDir: {},
    animsDir: {},
    shadow: 0,
  };
}

function napper(who: 'masa' | 'kiyo' | 'take') {
  const id = 'prop_h_napper_' + who;
  registerChar(id, () => sheet(id, frames()[who][0], frames()[who][1]));
  // the morning version: sitting up, the snoring stopped
  registerChar(id + '_up', () => sheet(id + '_up', frames()[who][1], frames()[who][1]));
  followFlag(id, () => (stage() >= 3 ? id + '_up' : id));
}

// snore curves (fractions of the period): rest → in → full (the cap lifts) → out
const SNORE_M = [0, 0, 0, 0, 1, 2, 2, 2, 1, 0];
const SNORE_K = [0, 0, 0, 0, 0, 1, 1, 1, 0, 0];

let built: Record<string, [HTMLCanvasElement[], HTMLCanvasElement[]]> | null = null;
function frames(): Record<string, [HTMLCanvasElement[], HTMLCanvasElement[]]> {
  if (built) return built;
  const still = (draw: Draw, act = 'sit') => [frame(draw, act, 0)];
  const kiyoSit: HTMLCanvasElement[] = [];
  const s0 = frame(kiyo, 'sit', 0);
  const s1 = frame(kiyo, 'stretch', 1);
  for (let i = 0; i < 60; i++) kiyoSit.push(i >= 20 && i < 32 ? s1 : s0);
  const takeLoop: HTMLCanvasElement[] = [];
  const t00 = frame(take, '', 0, 0);
  const t01 = frame(take, '', 0, 1);
  const t10 = frame(take, '', 1, 0);
  const t11 = frame(take, '', 1, 1);
  for (let i = 0; i < 40; i++) {
    const breath = i % 20 >= 8 && i % 20 < 16;
    const bob = Math.floor(i / 5) % 2;
    takeLoop.push(breath ? (bob ? t11 : t10) : bob ? t01 : t00);
  }
  built = {
    masa: [snoreLoop(masa, NAPPER_TALK.masa.loop, NAPPER_TALK.masa.snore, NAPPER_TALK.masa.at, NAPPER_TALK.masa.len, SNORE_M), still(masa)],
    kiyo: [snoreLoop(kiyo, NAPPER_TALK.kiyo.loop, NAPPER_TALK.kiyo.snore, NAPPER_TALK.kiyo.at, NAPPER_TALK.kiyo.len, SNORE_K), kiyoSit],
    take: [takeLoop, still(take)],
  };
  return built;
}

for (const who of ['masa', 'kiyo', 'take'] as const) napper(who);

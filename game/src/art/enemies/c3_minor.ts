// 第3章の 任意の 敵（61 9.2〜9.4）の 戦闘の 絵。光は 真上の 正午（noon.ts）、どれにも 黒い 判「まだ」。
//
//  ホシスギ (48×36)    干しすぎた アジの 開き。左右の 身が 飴色、ふちが 反りかえる（日なたぼっこの 段ごとに
//                      色が こく、反りが 強く。水に もどされると しっとり 淡く）。白い 塩の 点、中骨、白く
//                      かたまった 目と ぽかんと 開いた 口、尾びれが 足。黒い 判は 中骨の 根もと
//  アソビタリン (44×44) 赤と 白の しまの 浮き輪。上の 白い しまに 点の 目と にこにこの 口、右上の 栓が
//                      くちびる。少し しぼみかけ（下が ひしゃげる）。黒い 判は 穴の 内側
//  ヨコドリ (56×36)    翼を 広げた トンビ。茶の 翼に 風切り羽、下面の 白い 斑、ばち形の 尾、丸い 黒目の
//                      とぼけた 顔、黄色い 足は つかみそこねた 形。黒い 判は 尾の 付け根

import { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { Mask } from './lib';
import { INK, madaStamp, noonFinish, sshade } from './noon';

function cached<T>(build: (o: T) => PixelCanvas, max = 160): (o: T) => HTMLCanvasElement {
  const cache = new Map<string, HTMLCanvasElement>();
  return (o: T) => {
    const key = JSON.stringify(o);
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
      if (cache.size > max) cache.delete(cache.keys().next().value!);
    }
    return c;
  };
}

// ---- ホシスギ ------------------------------------------------------------------------------

interface HoshiPose {
  /** Curl of the edges (1 + the まもり steps), 0 when wet. */
  curl: number;
  wet: boolean;
  fins: 'down' | 'up';
  jolt: number;
  flat: boolean;
  bend: number;
}

const HW = 60;
const HH = 48;
const HOX = 6;
const HOY = 8;

function buildHoshi(o: HoshiPose): PixelCanvas {
  const p = new PixelCanvas(HW, HH);
  const X = (v: number) => Math.round(v + HOX + o.jolt);
  const Y = (v: number) => Math.round(v + HOY);
  const flat = o.flat ? 8 : 0;
  const ramp = o.wet
    ? ['#8A6A4A', '#A8885A', '#C8A878', '#E0C49A', '#F0DAB8']
    : o.curl >= 3
      ? ['#5A3A1A', '#7A4A22', '#A86A3A', '#C8884A', '#E8B070']
      : ['#8A5A2A', '#A86A3A', '#C8884A', '#E0A060', '#F2C88A'];
  // the two halves of the opened fish, their outer edges curling up
  for (const side of [-1, 1]) {
    const m = new Mask(HW, HH);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const y = 4 + t * 24 + flat * 0.5;
      const w = 4 + Math.sin(t * Math.PI) * 15;
      const lift = Math.round(o.curl * Math.sin(t * Math.PI) * 1.5) - o.bend * Math.round(Math.sin(t * Math.PI) * 2);
      pts.push([24 + side * w, y - lift]);
    }
    for (let i = 10; i >= 0; i--) pts.push([24, 4 + (i / 10) * 24 + flat * 0.5]);
    m.poly(pts.map(([x, y]) => [X(x), Y(y)] as [number, number]));
    sshade(p, m, ramp, { mode: 'bevel', bevel: 3, base: 0.6, k: 0.5 });
    // the grain of the flesh: thin diagonal lines
    m.each((x, y) => {
      if ((x * side + y) % 5 === 0 && hash2(x, y, 91) < 0.6) p.set(x, y, ramp[1]);
    });
    // salt: white specks catching the sun
    m.each((x, y) => {
      if (!o.wet && hash2(x, y, 93) < 0.04) p.set(x, y, '#F4F1E8');
    });
  }
  // the backbone
  p.vline(X(24), Y(6 + flat / 2), Y(27 + flat / 2), '#E8D8B8');
  // the head: the dried white eye, the open mouth
  p.rect(X(22), Y(1 + flat / 2), 5, 5, ramp[2]);
  p.rect(X(21), Y(1 + flat / 2), 3, 3, '#E8E4D8');
  p.set(X(22), Y(2 + flat / 2), INK);
  p.rect(X(25), Y(3 + flat / 2), 2, 2, INK);
  // the tail fin as two little feet
  if (!o.flat) {
    const up = o.fins === 'up' ? 2 : 0;
    p.line(X(23), Y(28), X(19), Y(33 - up), ramp[1]);
    p.line(X(25), Y(28), X(29), Y(33 - up), ramp[1]);
  }
  madaStamp(p, X(24), Y(25 + flat / 2), 6, 5, 95);
  noonFinish(p, 0.5, 0.45);
  return p;
}

let hoshiRestored: HTMLCanvasElement | null = null;
registerEnemyArt('enemy_hoshisugi', (): EnemyArt => {
  const get = cached(buildHoshi);
  return {
    id: 'enemy_hoshisugi',
    w: HW,
    h: HH,
    ox: HOX,
    oy: HOY,
    frame(v: EnemyView): HTMLCanvasElement {
      const f = v.flags;
      const wet = !!(v.params?.wet ?? 0) && (f.defUp ?? 0) <= 0;
      const curl = wet ? 0 : 1 + Math.max(0, f.defUp ?? 0);
      const base: HoshiPose = { curl, wet, fins: loop(v.gt, 300, 2) ? 'up' : 'down', jolt: 0, flat: false, bend: 0 };
      if (f.kyuukei || v.pose === 'rest') return get({ ...base, flat: true });
      if (v.pose === 'hurt') return get({ ...base, jolt: [1, -1, 0][Math.min(2, Math.floor(v.t / 70))] });
      if (v.pose === 'bask' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_hoshi_hinata')) return get({ ...base, fins: 'up' });
      if (v.pose === 'bend' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_hoshi_sori')) return get({ ...base, bend: v.pose === 'attack' ? -1 : 2 });
      if (v.pose === 'shake') return get({ ...base, jolt: loop(v.t, 60, 2) ? 1 : -1 });
      return get(base);
    },
    restored(): HTMLCanvasElement {
      if (hoshiRestored) return hoshiRestored;
      const p = new PixelCanvas(28, 14);
      p.rect(0, 10, 28, 2, '#8A7A5A');
      for (let x = 0; x < 28; x += 3) p.set(x, 9, '#C8C2B4');
      p.ellipse(14, 6, 9, 4, '#D8A060');
      p.vline(14, 2, 10, '#E8D8B8');
      p.outline(INK);
      hoshiRestored = p.toCanvas();
      return hoshiRestored;
    },
    gallery: [{ pose: 'idle' }, { pose: 'bask', flags: { defUp: 2 } }, { pose: 'bend', t: 0 }, { pose: 'idle', flags: {} }, { pose: 'rest', flags: { kyuukei: 1 } }],
  };
});

// ---- アソビタリン ----------------------------------------------------------------------------

interface UkiPose {
  dy: number;
  /** Squash of the bottom (deflating), 0..3. */
  sag: number;
  /** The valve mouth: 'smile' | 'pucker'. */
  mouth: 'smile' | 'pucker';
  flat: boolean;
  dent: number;
  eyes: 'open' | 'shut';
}

const UW = 56;
const UH = 56;
const UOX = 6;
const UOY = 6;

function buildUki(o: UkiPose): PixelCanvas {
  const p = new PixelCanvas(UW, UH);
  const cx = UOX + 22;
  const cy = UOY + 22 + o.dy + (o.flat ? 10 : 0);
  const ry = o.flat ? 8 : 20 - o.dent;
  for (let y = -21; y <= 21; y++)
    for (let x = -21; x <= 21; x++) {
      const yy = y > 8 ? y + o.sag * ((y - 8) / 12) : y;
      const d = Math.sqrt((x / 20) ** 2 + (yy / ry) ** 2);
      if (d > 1 || d < 0.38) continue;
      const a = Math.atan2(y, x);
      const stripe = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8 + 0.5) % 2;
      // vinyl: the sun on the top, the sea's glare on the bottom
      let c = stripe ? '#E23B2E' : '#F4F1E8';
      const top = -y / ry;
      if (top > 0.75 && d > 0.6 && d < 0.8) c = '#FFFFFF';
      else if (top < -0.75) c = stripe ? '#B8241E' : '#C8D8DC';
      else if (d > 0.9 || d < 0.45) c = stripe ? '#B8241E' : '#D8D2C4';
      p.set(Math.round(cx + x), Math.round(cy + y), c);
    }
  if (!o.flat) {
    // the face on the top white stripe
    const fy = cy - 15;
    if (o.eyes === 'shut') {
      p.hline(cx - 6, cx - 4, fy, INK);
      p.hline(cx + 3, cx + 5, fy, INK);
    } else {
      p.rect(cx - 6, fy - 1, 2, 2, INK);
      p.rect(cx + 4, fy - 1, 2, 2, INK);
      p.set(cx - 6, fy - 1, '#FFF6D8');
      p.set(cx + 4, fy - 1, '#FFF6D8');
    }
    p.hline(cx - 2, cx + 1, fy + 3, INK);
    p.set(cx - 3, fy + 2, INK);
    p.set(cx + 2, fy + 2, INK);
    // the valve (its lips) at the upper right
    const vx = cx + 13;
    const vy = cy - 13;
    if (o.mouth === 'pucker') p.rect(vx - 1, vy - 1, 3, 3, '#E23B2E');
    else p.rect(vx - 2, vy - 2, 4, 4, '#F4F1E8');
    p.set(vx, vy, '#E23B2E');
    // the black 「まだ」 on the inside of the hole
    madaStamp(p, cx - 7, cy + 2, 5, 4, 97);
    // sand on the bottom edge
    for (let x = -10; x <= 10; x += 3) p.set(cx + x, cy + 19 + Math.round(o.sag * 0.6), '#E8D8B0');
  }
  noonFinish(p, 0.4, 0.55);
  return p;
}

let ukiRestored: HTMLCanvasElement | null = null;
registerEnemyArt('enemy_asobitarin', (): EnemyArt => {
  const get = cached(buildUki);
  return {
    id: 'enemy_asobitarin',
    w: UW,
    h: UH,
    ox: UOX,
    oy: UOY,
    frame(v: EnemyView): HTMLCanvasElement {
      const f = v.flags;
      const bob = [0, -1, -2, -1][loop(v.gt, 200, 4)];
      const sag = Math.max(0, Math.min(3, Math.round((1 - v.hpRate) * 4)));
      const base: UkiPose = { dy: bob, sag, mouth: 'smile', flat: false, dent: 0, eyes: v.gt % 3000 < 120 ? 'shut' : 'open' };
      if (f.kyuukei || v.pose === 'rest') return get({ ...base, flat: true, dy: 0 });
      if (v.pose === 'hurt') return get({ ...base, dent: v.t < 120 ? 2 : 0, dy: 0, eyes: 'shut' });
      if (v.pose === 'pump' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_asobi_kuuki')) return get({ ...base, mouth: 'pucker', sag: v.t > 200 ? 0 : sag });
      return get(base);
    },
    restored(): HTMLCanvasElement {
      if (ukiRestored) return ukiRestored;
      const p = new PixelCanvas(24, 10);
      for (let x = 0; x < 24; x++) p.vline(x, 3, 8, Math.floor(x / 3) % 2 ? '#E23B2E' : '#F4F1E8');
      p.outline(INK);
      ukiRestored = p.toCanvas();
      return ukiRestored;
    },
    gallery: [{ pose: 'idle' }, { pose: 'pump', t: 300 }, { pose: 'hurt', t: 0 }, { pose: 'rest', flags: { kyuukei: 1 } }],
  };
});

// ---- ヨコドリ ------------------------------------------------------------------------------

interface TonbiPose {
  /** Wings: 'spread' | 'tucked' (diving) | 'folded' (resting). */
  wings: 'spread' | 'tucked' | 'folded';
  dx: number;
  dy: number;
  /** Looking at its mark (the eye's glint shifts). */
  stare: boolean;
  beak: boolean;
  tilt: number;
}

const TW = 68;
const TH = 48;
const TOX = 6;
const TOY = 6;

function buildTonbi(o: TonbiPose): PixelCanvas {
  const p = new PixelCanvas(TW, TH);
  const X = (v: number) => Math.round(v + TOX + o.dx);
  const Y = (v: number) => Math.round(v + TOY + o.dy);
  const WING = ['#3A2414', '#5A3A2A', '#7A4A2A', '#8A5A3A', '#B88A5A'];
  const body = new Mask(TW, TH).ellipse(X(28), Y(20), 7, 9);
  if (o.wings === 'spread') {
    for (const side of [-1, 1]) {
      const m = new Mask(TW, TH).poly([
        [X(28), Y(14)],
        [X(28 + side * 27), Y(12 + o.tilt * side)],
        [X(28 + side * 26), Y(18 + o.tilt * side)],
        [X(28 + side * 10), Y(24)],
      ]);
      sshade(p, m, WING, { mode: 'bevel', bevel: 2, base: 0.6, k: 0.5 });
      // primaries: the slotted tips
      for (let k = 0; k < 5; k++) p.line(X(28 + side * (20 + k)), Y(17 + o.tilt * side), X(28 + side * (22 + k)), Y(20 + o.tilt * side), '#3A2414');
      // the white patch underneath (a kite's mark)
      p.rect(X(28 + side * 16) - 1, Y(17 + Math.round(o.tilt * side * 0.6)), 3, 2, '#E8E0D0');
    }
  } else {
    const m = new Mask(TW, TH).ellipse(X(28), Y(18), 10, 11);
    sshade(p, m, WING, { mode: 'sphere', base: 0.6, k: 0.5 });
  }
  sshade(p, body, WING, { mode: 'sphere', base: 0.66, k: 0.5 });
  // the tail: straight-ended (a kite's)
  const tail = new Mask(TW, TH).poly([
    [X(25), Y(27)],
    [X(31), Y(27)],
    [X(33), Y(34)],
    [X(23), Y(34)],
  ]);
  sshade(p, tail, ['#5A3A1A', '#7A4A2A', '#8A5A3A', '#A87A4A'], { mode: 'bevel', bevel: 2 });
  madaStamp(p, X(28), Y(27), 5, 4, 99);
  // the head, a round black eye with a glint, the beak (black tip, yellow root)
  p.ellipse(X(32), Y(10), 5, 4, '#8A5A3A');
  p.rect(X(32), Y(8), 2, 2, INK);
  p.set(X(o.stare ? 33 : 32), Y(8), '#FFF6D8');
  p.rect(X(36), Y(10), 2, 2, '#E8C878');
  p.set(X(38), Y(o.beak ? 9 : 11), INK);
  if (o.beak) p.set(X(38), Y(12), INK);
  // the yellow feet, open as if they had just missed
  if (o.wings !== 'folded') {
    p.line(X(26), Y(28), X(24), Y(31), '#E8C878');
    p.line(X(30), Y(28), X(32), Y(31), '#E8C878');
  }
  noonFinish(p, 0.5, 0.4);
  return p;
}

let tonbiRestored: HTMLCanvasElement | null = null;
registerEnemyArt('enemy_yokodori', (): EnemyArt => {
  const get = cached(buildTonbi);
  return {
    id: 'enemy_yokodori',
    w: TW,
    h: TH,
    ox: TOX,
    oy: TOY,
    frame(v: EnemyView): HTMLCanvasElement {
      const f = v.flags;
      const k = loop(v.gt, 240, 4);
      const base: TonbiPose = { wings: 'spread', dx: [0, 1, 2, 1][k] - 1, dy: 0, stare: !!f.tame, beak: false, tilt: [0, 1, 0, -1][k] };
      if (f.kyuukei || v.pose === 'rest') return get({ ...base, wings: 'folded', dx: 0, tilt: 0 });
      if (v.pose === 'hurt') return get({ ...base, tilt: 2, dy: 1 });
      if (v.pose === 'dive' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_yoko_dori')) return get({ ...base, wings: 'tucked', dx: 0, tilt: 0 });
      if (v.pose === 'cry' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_yoko_pihyoro')) return get({ ...base, beak: true, dy: -1 });
      if (v.pose === 'stare') return get({ ...base, stare: true, tilt: 2 });
      return get(base);
    },
    restored(): HTMLCanvasElement {
      if (tonbiRestored) return tonbiRestored;
      const p = new PixelCanvas(14, 14);
      p.ellipse(7, 8, 4, 5, '#8A5A3A');
      p.ellipse(8, 3, 3, 2, '#8A5A3A');
      p.set(9, 3, INK);
      p.rect(10, 3, 2, 1, '#E8C878');
      p.outline(INK);
      tonbiRestored = p.toCanvas();
      return tonbiRestored;
    },
    gallery: [{ pose: 'idle' }, { pose: 'stare', flags: { tame: 1 } }, { pose: 'dive' }, { pose: 'cry' }, { pose: 'rest', flags: { kyuukei: 1 } }],
  };
});

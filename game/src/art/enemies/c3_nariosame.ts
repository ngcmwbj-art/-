// ナリオサメ (96×96, 61 11.7・60 6.7): サイレン塔の 古い モーターサイレン。上に さびた 円すいの 傘
// （白い ペンキが はげて さびの まだら、ふちが 真上の 光で 光る）、灰緑の 丸い 胴、胴の 横に 銘板
// （年号は 書かない。すみに 黒い 判「まだ」）、前に 放射状の 羽根の スリット8本（少し への字の
// さびしい 口。音が 出ると 奥が 白く 光る）、下は 鉄の 台座。口から 止まった 音が 白い 帯に なって
// たれている：HP が 減るほど 長い（100%で 12px → 20%で 60px）。いただきますの あとは 帯が ゆっくり
// 流れ、鳴りきると 空へ ほどける（params.unravel）。こわい 顔に しない。
//
// ポーズ：idle（羽根が ほんの 少し 回る 4フレーム）、spin/attack（羽根の 風：スリットが ぼやける）、
// call（町を 呼ぶ：口の 奥が 光る）、hold（まだ 鳴り終わりたくない：ぴたりと 止まり 1px 縮む）、
// shougo（正午の 音：口から 白い 光が 1回）、ring（鳴りきる）、done（止まる。光が 消える）、hurt。

import { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { Mask } from './lib';
import { INK, madaStamp, noonFinish, sshade } from './noon';

const W = 112;
const H = 168;
const OX = 8;
const OY = 6;

const PAINT = ['#3A4A44', '#5A6B62', '#748A80', '#8EA69A', '#A8BCB0', '#C8D8CC'];
const IRON = ['#3A3F48', '#4A4A55', '#6B7186', '#8E95A6'];

interface Pose {
  /** Blade phase (0..7) and blur. */
  ph: number;
  blur: boolean;
  /** Mouth glow 0 none, 1 faint, 2 bright. */
  glow: number;
  /** Squeeze (holding the sound in). */
  squeeze: number;
  jolt: number;
  /** The black seal: 0 whole, 1–3 cracking, 4 gone. */
  seal: number;
}

function build(o: Pose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => Math.round(v + OX + o.jolt);
  const Y = (v: number) => Math.round(v + OY);
  const sq = o.squeeze;
  // ---- the iron stand (the lower part is behind the panels) ----
  const stand = new Mask(W, H).rect(X(36), Y(64), 24, 32);
  sshade(p, stand, IRON, { mode: 'cyl', base: 0.55, k: 0.45 });
  p.rect(X(30), Y(90), 36, 6, '#4A4A55');
  p.hline(X(30), X(65), Y(90), '#8E95A6');
  for (const bx of [33, 61]) p.rect(X(bx), Y(92), 2, 2, '#2A2440');
  // ---- the drum ----
  const body = new Mask(W, H).ellipse(X(48), Y(44 + sq), 36 - sq, 22 - sq);
  sshade(p, body, PAINT, { mode: 'sphere', base: 0.58, k: 0.5, dither: 0.3 });
  // worn paint showing rust
  body.each((x, y) => {
    const h = hash2(x >> 1, y >> 1, 71);
    if (h < 0.05) p.set(x, y, '#A86A3A');
    else if (h < 0.08) p.set(x, y, '#C8885A');
  });
  // the nameplate (no year on it) with the black 「まだ」 in its corner
  p.rect(X(66), Y(40), 14, 7, '#D8B878');
  p.hline(X(66), X(79), Y(40), '#F2D8A0');
  p.hline(X(67), X(77), Y(43), '#A88848');
  if (o.seal < 4) madaStamp(p, X(78), Y(46), 8, 6, 73, o.seal);
  // ---- the mouth: 8 blade slits round the hub, a little sad (へ) ----
  const mx = X(46);
  const my = Y(46 + sq);
  p.ellipse(mx, my, 13, 11, o.glow >= 2 ? '#F4F6F8' : o.glow === 1 ? '#C8D8CC' : '#3A4A44');
  for (let i = 0; i < 8; i++) {
    const a = ((i + o.ph / 8) / 8) * Math.PI * 2;
    // the slits sag a little at the bottom: a sad mouth, never a scary one
    const sag = Math.sin(a) > 0.3 ? 1 : 0;
    for (let r = 4; r <= 12; r++) {
      const x = Math.round(mx + Math.cos(a) * r);
      const y = Math.round(my + Math.sin(a) * r * 0.85) + (r > 8 ? sag : 0);
      p.set(x, y, INK);
      if (o.blur) p.set(Math.round(mx + Math.cos(a + 0.18) * r), Math.round(my + Math.sin(a + 0.18) * r * 0.85), '#5A6B62');
    }
  }
  p.ellipse(mx, my, 3, 3, '#6B7186');
  p.set(mx - 1, my - 1, '#C8CDD4');
  // ---- the rusted cone hat ----
  const hat = new Mask(W, H).poly([
    [X(4), Y(22)],
    [X(92), Y(22)],
    [X(52), Y(4)],
    [X(44), Y(4)],
  ]);
  sshade(p, hat, ['#8A5A3A', '#A86A3A', '#C8C2B4', '#E8ECF0', '#F4F6F8'], { mode: 'bevel', bevel: 3, base: 0.66, k: 0.5 });
  hat.each((x, y) => {
    if (hash2(x >> 1, y, 77) < 0.14) p.set(x, y, '#A86A3A');
  });
  p.hline(X(4), X(92), Y(22), '#6B7186');
  p.rect(X(46), Y(1), 4, 4, '#6B7186');
  p.hline(X(46), X(49), Y(1), '#E8ECF0');
  // the hat's shadow on the top of the drum
  p.hline(X(18), X(78), Y(23), '#3A4A44');
  noonFinish(p, 0.6, 0.45);
  return p;
}

/**
 * The stopped sound (61 11.7): a white band (#F4F1E8 α70%, 10 wide, wavy)
 * hanging from the mouth — longer as the HP falls; after いただきます it flows
 * (2px/s, its end fraying); `unravel` 0..1: it comes loose and drifts up.
 */
function drawBand(g: import('../../engine/gfx').Gfx, x: number, y: number, v: EnemyView): void {
  const pr = v.params ?? {};
  const un = pr.unravel ?? 0;
  if (un >= 1 || v.pose === 'done') return;
  const len = Math.round(12 + Math.max(0, Math.min(1, (1 - v.hpRate) / 0.8)) * 48);
  const flow = pr.flow ? v.gt / 500 : 0;
  const mx = x + OX + 46;
  const my = y + OY + 56;
  g.alpha(0.7 * (1 - un), () => {
    for (let i = 0; i < len; i++) {
      const wav = Math.round(Math.sin(i * 0.25 + v.gt / 400) * 2);
      const yy = my + i - Math.round(un * 40 * (i / len));
      // the far end frays (dashes) once it flows
      if (pr.flow && i > len - 10 && (i + Math.floor(flow * 2)) % 3 === 0) continue;
      const w = 10 - Math.floor((i / len) * 3);
      g.rect(mx - Math.floor(w / 2) + wav + Math.round(un * Math.sin(i) * 8), yy, w, 1, i % 6 === Math.floor(flow) % 6 ? '#FFFFFF' : '#F4F1E8');
    }
  });
}

let restoredC: HTMLCanvasElement | null = null;
/** Undone: the siren on its tower, quiet, the sun on its hat (30×26). */
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(30, 26);
  p.poly([[1, 7], [28, 7], [16, 1], [13, 1]], '#E8ECF0');
  p.hline(1, 28, 7, '#A86A3A');
  p.ellipse(15, 13, 11, 6, '#8EA69A');
  p.ellipse(14, 14, 4, 3, '#3A4A44');
  p.rect(11, 19, 8, 7, '#6B7186');
  p.outline(INK);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_nariosame', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (o: Pose): HTMLCanvasElement => {
    const key = JSON.stringify(o);
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
      if (cache.size > 160) cache.delete(cache.keys().next().value!);
    }
    return c;
  };
  return {
    id: 'enemy_nariosame',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const pr = v.params ?? {};
      const seal = pr.sealFall ? 4 : Math.min(3, pr.crack ?? 0);
      const base: Pose = { ph: loop(v.gt, 300, 4) * 2, blur: false, glow: 0, squeeze: 0, jolt: 0, seal };
      if (v.pose === 'done' || v.flags.settled) return get({ ...base, ph: 0, glow: 0 });
      if (v.pose === 'ring') return get({ ...base, ph: loop(v.gt, 40, 8), blur: true, glow: 2 });
      if (v.pose === 'hurt') {
        const j = Math.min(2, Math.floor(v.t / 70));
        return get({ ...base, jolt: [1, -1, 0][j] });
      }
      if (v.pose === 'shougo') return get({ ...base, glow: v.t < 160 ? 2 : 1 });
      if (v.pose === 'hold' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_nari_mada')) return get({ ...base, ph: 0, squeeze: 1 });
      if (v.pose === 'spin' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_nari_kaze'))
        return get({ ...base, ph: loop(v.t, 50, 8), blur: v.pose === 'attack' || v.t > 300 });
      if (v.pose === 'call' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_nari_yobu')) return get({ ...base, glow: loop(v.t, 200, 2) + 1 });
      if (v.pose === 'rest' || v.flags.kyuukei) return get({ ...base, ph: 0 });
      return get(base);
    },
    over(g, x, y, v) {
      drawBand(g, x, y, v);
    },
    restored,
    dynamic: false,
    gallery: [
      { pose: 'idle', flags: { maki: 1 } },
      { pose: 'spin', t: 400 },
      { pose: 'call', t: 0 },
      { pose: 'hold', t: 0 },
      { pose: 'shougo', t: 0 },
      { pose: 'ring', t: 0 },
      { pose: 'done', t: 0 },
    ],
  };
});

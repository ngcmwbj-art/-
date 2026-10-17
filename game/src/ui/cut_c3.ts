// 第3章の 1枚絵 (62 12.11・12.13・12.8): the still pictures of chapter 3's last part, drawn in code
// at 384×216 and shown full screen over the field (2D and HD-2D alike: the memories are not to be
// stood up in 3D, 62 12.13; the photo and the last pick-up are kept as pictures in HD-2D too).
//
//   kiokuArt(1|2|3)  S30 グソっ君の 記憶の 断片: the deep sea's marine snow / the tank's glass and
//                    ツガオ's thick finger / the park's clock tower at night (no lines, 0.8 s each)
//   photoArt()       S31 集合写真: a white-bordered photo laid a little askew; in the middle the
//                    cast, in front the town's children, behind them 海ぞいの町's people, and at the
//                    back only those who came (flag_ch3_kita_<id>), in rows by how many (62 13.7)
//   shuukaArt()      S25 ツガオ便、最後の 集荷: the empty goza on the breakwater, the truck on the
//                    quay with as many heads in its bed as came, the old aquarium up on the cape
//
//   yield* playC3Still(art, { ms, flash })           show, hold, go (a white flash in if asked)
//   const s = openC3Still(art); …lines…; yield* s.close()   (the scenario's lines over it)

import type { Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { BAYER4, makeCanvas, PixelCanvas } from '../engine/pixel';
import { state } from '../game/state';
import { charSprite, hasChar, poseFrame } from '../art/chars/registry';
import { registerC3Cut } from '../events/ch3/cuts';

const W = 384;
const H = 216;

export interface StillArt {
  /** Draw the picture at the screen's origin; `t` = ms since it opened (for what moves in it). */
  draw(g: Gfx, t: number): void;
}

// ---------------------------------------------------------------- helpers

/** A dithered vignette toward `c` over the outer `px` pixels (the memories' melting edges, 62 12.13). */
function ditherEdge(p: PixelCanvas, px: number, c: string): void {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (d >= px) continue;
      const k = 1 - d / px;
      if (k * 16 > BAYER4[y % 4][x % 4]) p.set(x, y, c);
    }
}

/** The facing-us frame of a field sprite (its 'pose' extra if it has one). */
function figure(id: string, pose?: string): HTMLCanvasElement | null {
  if (!hasChar(id)) return null;
  const s = charSprite(id);
  return pose ? poseFrame(s, pose, 'down') : s.walk.down[0];
}

/** Everyone who came (flag_ch3_kita_<id>), in the order they came is not kept: the flags' order. */
export function cameIds(): string[] {
  return Object.entries(state.flags)
    .filter(([k, v]) => v && k.startsWith('flag_ch3_kita_') && k !== 'flag_ch3_kita_n')
    .map(([k]) => k.slice('flag_ch3_kita_'.length));
}

// ---------------------------------------------------------------- S30 the memories

let kioku: (HTMLCanvasElement | null)[] = [null, null, null];

/** 1: the deep sea from below, the marine snow falling (the snow moves; the rest is the picture). */
function kioku1(): HTMLCanvasElement {
  const p = new PixelCanvas(W, H);
  // a little lighter toward the top (far above, the surface): three blues, dithered into each other
  const BL = ['#2E4458', '#22344A', '#1A2A3A'];
  for (let y = 0; y < H; y++) {
    const k = Math.min(1.999, (y / H) * 2.4);
    const i = Math.floor(k);
    const f = k - i;
    for (let x = 0; x < W; x++) p.set(x, y, f * 16 > BAYER4[y % 4][x % 4] ? BL[Math.min(2, i + 1)] : BL[i]);
  }
  // a faint light from far above
  for (let i = 0; i < 6; i++) p.line(150 + i * 18, 0, 120 + i * 26, 90, '#2E4458');
  ditherEdge(p, 14, '#0E1622');
  return p.toCanvas();
}

/** 2: from inside the tank: the glass, its 14 little scratches, and the thick finger touching it. */
function kioku2(): HTMLCanvasElement {
  const p = new PixelCanvas(W, H);
  p.fill('#1E3448');
  // the room beyond the glass, dim and blurred (big soft shapes)
  p.rect(0, 150, W, 66, '#2A3A44');
  p.ellipse(300, 60, 80, 40, '#28405A');
  // the glass's frame at the left and the bottom
  p.rect(0, 0, 14, H, '#3A4A58');
  p.rect(0, 196, W, 20, '#3A4A58');
  p.hline(0, W - 1, 196, '#5A6E80');
  p.vline(14, 0, 196, '#5A6E80');
  // the scratches: two rows of 14 short strokes, low on the glass (62 7.4)
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < 14; k++) {
      const x = 40 + k * 9 + r * 4;
      p.line(x, 170 - r * 12, x + 3, 164 - r * 12, '#7FA6B8');
    }
  // the hand beyond the glass: a big open hand come up from below, its fingers spread, the index
  // finger's pad pressed softly flat on the glass (paler where it touches), ink on its tip (52 12.5)
  const SK = '#B87A5A';
  const SKD = '#8A5A44';
  const SKL = '#D8A486';
  p.ellipse(212, 210, 50, 30, SKD);
  p.ellipse(212, 209, 46, 27, SK);
  const fingers: [number, number, number, number][] = [
    // base x, base y, tip x, tip y
    [180, 196, 160, 120],
    [200, 190, 196, 96],
    [222, 190, 232, 100],
    [242, 196, 262, 128],
  ];
  for (const [bx, by, tx, ty] of fingers) {
    for (let k = 0; k <= 20; k++) {
      const x = bx + ((tx - bx) * k) / 20;
      const y = by + ((ty - by) * k) / 20;
      p.ellipse(Math.round(x), Math.round(y), 9, 9, SKD);
    }
    for (let k = 0; k <= 20; k++) {
      const x = bx + ((tx - bx) * k) / 20;
      const y = by + ((ty - by) * k) / 20;
      p.ellipse(Math.round(x), Math.round(y), 8, 8, SK);
    }
    // the knuckle creases
    const mx = Math.round(bx + (tx - bx) * 0.45);
    const my = Math.round(by + (ty - by) * 0.45);
    p.hline(mx - 5, mx + 5, my, SKD);
  }
  // the thumb, out to the right and lower
  for (let k = 0; k <= 16; k++) p.ellipse(Math.round(238 + k * 2), Math.round(206 - k * 1.4), 8, 8, SKD);
  for (let k = 0; k <= 16; k++) p.ellipse(Math.round(238 + k * 2), Math.round(206 - k * 1.4), 7, 7, SK);
  // the index finger's pad pressed on the glass, and the ink at its tip
  p.ellipse(196, 98, 8, 7, SKL);
  p.ellipse(196, 97, 5, 4, '#E8BCA0');
  p.rect(195, 92, 3, 2, '#0B0B14');
  // the glass's sheen over all of it
  for (let i = 0; i < 40; i++) p.set(60 + i * 2, 20 + i, '#4A6478');
  ditherEdge(p, 14, '#0E1622');
  return p.toCanvas();
}

/** 3: the park's clock tower at night from down by the ground, the container's corner, two tail lights. */
function kioku3(): HTMLCanvasElement {
  const p = new PixelCanvas(W, H);
  for (let y = 0; y < H; y++) p.hline(0, W - 1, y, y < 70 ? '#1A1838' : y < 140 ? '#22204A' : '#2A2850');
  // stars
  for (let i = 0; i < 40; i++) p.set((i * 97) % W, (i * 53) % 110, i % 3 ? '#8A88B8' : '#E8E4D8');
  // the ground, very near
  p.rect(0, 186, W, 30, '#14142A');
  for (let x = 0; x < W; x += 3) p.set(x, 186 + ((x * 7) % 5), '#2A2A44');
  // the clock tower, from below: the shaft narrowing upward, the round face
  p.poly([[168, 186], [178, 40], [206, 40], [216, 186]], '#3A3A5A');
  p.poly([[198, 186], [202, 40], [206, 40], [216, 186]], '#2A2A44');
  p.ellipse(192, 36, 22, 22, '#2A2A44');
  p.ellipse(192, 36, 19, 19, '#C8C4B8');
  p.ellipse(192, 36, 17, 17, '#E8E4D8');
  // 5:00 (chapter 1's stopped hour) is not shown: the hands stand at the night's time
  p.line(192, 36, 192, 22, '#1B1733');
  p.line(192, 36, 200, 42, '#1B1733');
  p.rect(176, 58, 32, 4, '#4A4A6A');
  // the yellow container's corner at the right edge, close (52 10.6 #FFD23F), and far away two red lights
  p.poly([[330, 216], [338, 150], [W, 146], [W, 216]], '#B8962A');
  p.poly([[338, 150], [342, 140], [W, 136], [W, 146]], '#FFD23F');
  p.vline(338, 150, 216, '#8A6A1A');
  p.rect(60, 172, 2, 2, '#E23B2E');
  p.rect(70, 172, 2, 2, '#E23B2E');
  p.set(59, 172, '#7A1A22');
  p.set(72, 172, '#7A1A22');
  ditherEdge(p, 14, '#0B0B1E');
  return p.toCanvas();
}

/** S30's three memory pictures (no lines; 62 12.13). The first one's snow falls. */
export function kiokuArt(n: 1 | 2 | 3): StillArt {
  const i = n - 1;
  if (!kioku[i]) kioku[i] = [kioku1, kioku2, kioku3][i]();
  const img = kioku[i]!;
  return {
    draw(g, t) {
      g.img(img, 0, 0);
      if (n !== 1) return;
      // the marine snow: white grains drifting down, a little sideways, slowly
      for (let k = 0; k < 70; k++) {
        const x0 = (k * 131) % W;
        const sp = 9 + (k % 5) * 3;
        const y = ((k * 37 + (t / 1000) * sp) % (H + 8)) - 4;
        const x = Math.round(x0 + Math.sin(t / 900 + k) * 3);
        const big = k % 7 === 0;
        g.rect(x, Math.round(y), big ? 2 : 1, big ? 2 : 1, '#E8F0F4', big ? 0.9 : 0.6);
      }
    },
  };
}

// ---------------------------------------------------------------- S31 the photograph

/** The middle of the photo, fixed (62 12.8): left to right. */
const CAST: [string, string?][] = [
  ['npc_pokosha'],
  ['npc_hirosuke', 'yakiimo'],
  ['npc_tsugao_shirt'],
  ['minato'],
  ['kanenari', 'happy'],
  ['npc_maruyama_hige'],
  ['npc_dakoku_daisha'],
];
const KIDS = ['npc_c3_kid_a', 'npc_c3_kid_b', 'npc_c3_kid_c'];
/** 海ぞいの町's people (the town's row; the kids are in front). */
const TOWN = [
  'npc_c3_shokudo', 'npc_c3_jouren', 'npc_c3_seri', 'npc_c3_seri_deshi', 'npc_c3_sirenban', 'npc_c3_toudai',
  'npc_c3_mago', 'npc_c3_kanshiin', 'npc_c3_himono_otto', 'npc_c3_himono_tsuma', 'npc_c3_tsuri', 'npc_c3_uketsuke',
];

/** The photo itself (320×180): the people in rows on the breakwater, the town, the hill and the red lighthouse behind. */
function photoPicture(came: string[]): HTMLCanvasElement {
  const PW = 320;
  const PH = 180;
  const p = new PixelCanvas(PW, PH);
  // the afternoon sky, one cloud
  for (let y = 0; y < 70; y++) p.hline(0, PW - 1, y, y < 30 ? '#6AB0E8' : y < 52 ? '#8CC4EC' : '#B8DCF2');
  p.rect(220, 14, 40, 6, '#FFFFFF');
  p.rect(228, 10, 22, 4, '#FFFFFF');
  // the hill and its pines, the houses' roofs (いぶし瓦) climbing it
  p.poly([[0, 70], [40, 40], [110, 34], [180, 46], [260, 38], [PW, 50], [PW, 92], [0, 92]], '#5A8A5A');
  for (let i = 0; i < 18; i++) {
    const x = 6 + i * 18;
    const y = 58 + ((i * 5) % 14);
    p.rect(x, y, 14, 6, i % 3 ? '#5A5E66' : '#6B7186');
    p.rect(x + 2, y + 6, 10, 6, '#E8E4D8');
    p.rect(x + 5, y + 8, 3, 3, '#3A4A5A');
  }
  // the siren tower over the roofs
  p.rect(232, 26, 4, 46, '#C8C4B8');
  p.rect(228, 22, 12, 6, '#9AA0A8');
  // the red lighthouse at the left, on its plinth
  p.rect(18, 40, 14, 44, '#E8E4D8');
  for (let k = 0; k < 4; k++) p.rect(18, 44 + k * 10, 14, 5, '#C8402E');
  p.rect(16, 34, 18, 6, '#3A3F48');
  p.rect(20, 30, 10, 4, '#FFE7A3');
  // the breakwater's top, where everyone stands
  p.rect(0, 92, PW, 88, '#C8C4B8');
  p.hline(0, PW - 1, 92, '#E8E4D8');
  for (let x = 0; x < PW; x += 40) p.vline(x, 93, PH - 1, '#B0ACA0');
  // the rows, back to front (later rows over earlier ones). Who came: at most 24, 12 a row
  const rows: { ids: [string, string?][]; foot: number; gap: number }[] = [];
  const back = came.filter((id) => id !== 'npc_photo_master').map((id) => [id] as [string]);
  const r4 = back.slice(12);
  const r3 = back.slice(0, 12);
  if (r4.length) rows.push({ ids: r4, foot: 104, gap: 22 });
  if (r3.length) rows.push({ ids: r3, foot: 116, gap: 22 });
  // the town's row widens when few came (62 13.7: it fills the gap)
  rows.push({ ids: TOWN.map((id) => [id] as [string]), foot: 130, gap: r3.length >= 8 ? 22 : 25 });
  rows.push({ ids: CAST, foot: 148, gap: 26 });
  rows.push({ ids: KIDS.map((id) => [id] as [string]), foot: 170, gap: 40 });
  const c = p.toCanvas();
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  for (const r of rows) {
    const n = r.ids.length;
    const x0 = PW / 2 - ((n - 1) * r.gap) / 2;
    r.ids.forEach(([id, pose], i) => {
      const f = figure(id, pose);
      if (!f) return;
      // a little zig-zag so heads don't hide each other
      const x = Math.round(x0 + i * r.gap - f.width / 2);
      const y = r.foot - f.height + (i % 2 ? -2 : 0);
      g.fillStyle = 'rgba(42,36,64,0.25)';
      g.fillRect(x + 3, r.foot - 1 + (i % 2 ? -2 : 0), f.width - 6, 2);
      g.drawImage(f, x, y);
    });
  }
  // the print's warm cast and a soft vignette (an old camera's photo)
  g.fillStyle = 'rgba(255,214,160,0.10)';
  g.fillRect(0, 0, PW, PH);
  const v = g.createRadialGradient(PW / 2, PH / 2, PH * 0.35, PW / 2, PH / 2, PW * 0.65);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(40,24,16,0.28)');
  g.fillStyle = v;
  g.fillRect(0, 0, PW, PH);
  return c;
}

/** S31's photo laid on the dark (white border, tilted a little). Built once per opening. */
export function photoArt(came: string[] = cameIds()): StillArt {
  const pic = photoPicture(came);
  const [c, g] = makeCanvas(W, H);
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#2A2440';
  g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 2) for (let x = (y / 2) % 2; x < W; x += 4) {
    g.fillStyle = '#322C4A';
    g.fillRect(x, y, 1, 1);
  }
  g.save();
  g.translate(W / 2, H / 2 + 2);
  g.rotate(-0.025);
  // the shadow, the white border, the picture
  g.fillStyle = 'rgba(11,11,20,0.45)';
  g.fillRect(-166 + 4, -98 + 4, 332, 200);
  g.fillStyle = '#F4F1E8';
  g.fillRect(-166, -98, 332, 200);
  g.drawImage(pic, -160, -92);
  g.restore();
  return { draw: (gg) => gg.img(c, 0, 0) };
}

// ---------------------------------------------------------------- S25 the last pick-up

/** S25 (62 12.11): the empty goza, ツガオ便 on the quay with a bed full of heads, the cape behind. */
export function shuukaArt(heads: number = cameIds().length): StillArt {
  const p = new PixelCanvas(W, H);
  // sky and sea (12:01: moving)
  for (let y = 0; y < 60; y++) p.hline(0, W - 1, y, y < 24 ? '#4A9CE0' : y < 44 ? '#7AB8E8' : '#B8DCF2');
  p.rect(0, 60, W, 34, '#3A7EA8');
  for (let i = 0; i < 30; i++) p.hline((i * 53) % W, ((i * 53) % W) + 6, 64 + ((i * 11) % 28), '#5AA0C8');
  // the cape at the right, the old aquarium up on it (white with its blue band)
  p.poly([[230, 94], [270, 40], [330, 30], [W, 34], [W, 94]], '#4A7A4A');
  p.rect(300, 18, 60, 22, '#E8E4D8');
  p.rect(300, 28, 60, 3, '#3A7EA8');
  p.rect(318, 10, 24, 8, '#E8E4D8');
  p.line(268, 92, 310, 42, '#C8B488');
  p.line(270, 92, 312, 42, '#C8B488');
  // the quay
  p.rect(0, 94, W, 70, '#B8B4A8');
  p.hline(0, W - 1, 94, '#D8D4C8');
  for (let x = 0; x < W; x += 32) p.vline(x, 95, 163, '#A8A498');
  // the breakwater in front and the empty goza (everyone went)
  p.rect(0, 164, W, 52, '#C8C4B8');
  p.hline(0, W - 1, 164, '#E8E4D8');
  for (const [x, w] of [[30, 70], [108, 72], [188, 66], [262, 74]] as const) {
    p.rect(x, 176, w, 24, '#D8C080');
    p.strokeRect(x, 176, w, 24, '#2F6A4A');
    for (let k = 0; k < w; k += 4) p.vline(x + k, 177, 198, '#C8B070');
  }
  p.ellipse(60, 186, 7, 3, '#F4F1E8');
  p.ellipse(214, 190, 6, 3, '#F4F1E8');
  // ツガオ便: the white kei truck side on, facing east (cab at the right), its bed's side gate
  // (あおり) with the white chalk hanamaru (obj_c3_nidai_aori)
  const tx = 92; // the bed's left end
  const ty = 150; // the wheels' axle
  const BW = 118;
  // the cab: rounded roof, the windscreen and the door window, the bumper
  p.poly([[tx + BW, ty - 4], [tx + BW, ty - 34], [tx + BW + 30, ty - 34], [tx + BW + 40, ty - 20], [tx + BW + 42, ty - 4]], '#F4F1E8');
  p.poly([[tx + BW + 22, ty - 31], [tx + BW + 29, ty - 31], [tx + BW + 37, ty - 20], [tx + BW + 22, ty - 20]], '#8CC4EC');
  p.rect(tx + BW + 4, ty - 31, 15, 11, '#8CC4EC');
  p.vline(tx + BW + 20, ty - 33, ty - 4, '#C8C4B8');
  p.rect(tx + BW + 36, ty - 8, 7, 4, '#9AA0A8');
  p.rect(tx + BW + 39, ty - 18, 3, 3, '#FFE7A3');
  // ヒロスケ at the wheel (the head and the sunglasses), a hand out of the window
  p.ellipse(tx + BW + 12, ty - 25, 4, 4, '#C98A6A');
  p.rect(tx + BW + 9, ty - 29, 7, 3, '#1B1733');
  p.hline(tx + BW + 10, tx + BW + 15, ty - 25, '#1B1733');
  // the chassis and the bed's floor
  p.rect(tx - 2, ty - 6, BW + 44, 6, '#3A3F48');
  p.rect(tx, ty - 22, BW, 16, '#E8E4D8');
  p.hline(tx, tx + BW - 1, ty - 22, '#F4F1E8');
  p.hline(tx, tx + BW - 1, ty - 7, '#B8B4A8');
  for (let k = 1; k < 4; k++) p.vline(tx + (BW * k) / 4, ty - 21, ty - 7, '#C8C4B8');
  // the chalk hanamaru on the gate (white, a small spiral and petals)
  p.ring(tx + 20, ty - 14, 4, 4, '#FFFFFF');
  p.ring(tx + 20, ty - 14, 2, 2, '#FFFFFF');
  // wheels
  for (const wx of [tx + 22, tx + BW + 22]) {
    p.ellipse(wx, ty + 2, 9, 9, '#1B1733');
    p.ellipse(wx, ty + 2, 4, 4, '#9AA0A8');
  }
  // the heads in the bed (as many as came; colours only, 62 12.11): 2 rows of 12, shoulders below
  const n = Math.max(0, Math.min(24, heads));
  const HAIR = ['#1B1733', '#3A2B24', '#C8C4B8', '#5A3A2A', '#2A2440', '#8A6A4A'];
  const CLOTH = ['#E8705A', '#7AB8E8', '#F6D98A', '#9BCB6B', '#C8A0D8', '#F4F1E8'];
  for (let i = n - 1; i >= 0; i--) {
    const col = i % 12;
    const row = Math.floor(i / 12);
    const hx = tx + 6 + col * 9 + row * 4;
    const hy = ty - 28 - (row ? 0 : 0) - (col % 2) + (row ? -5 : 0);
    p.rect(hx - 3, hy + 3, 7, 5, CLOTH[(i * 5) % CLOTH.length]);
    p.ellipse(hx, hy, 3, 3, '#C98A6A');
    p.rect(hx - 3, hy - 3, 7, 3, HAIR[i % HAIR.length]);
  }
  // ナミエ climbing on at the back with her bundle of rice balls
  p.rect(tx - 10, ty - 24, 7, 14, '#E8705A');
  p.ellipse(tx - 7, ty - 28, 3, 3, '#C98A6A');
  p.rect(tx - 10, ty - 32, 7, 3, '#3A2B24');
  p.rect(tx - 16, ty - 20, 7, 6, '#F4F1E8');
  p.hline(tx - 16, tx - 10, ty - 17, '#3A6A4A');
  p.rect(tx - 9, ty - 10, 2, 8, '#3A3F48');
  const img = p.toCanvas();
  return { draw: (g) => g.img(img, 0, 0) };
}

// ---------------------------------------------------------------- showing them

class StillWidget implements Widget {
  modal = false;
  done = false;
  t = 0;
  /** 0..1 the picture's opacity. */
  shown = 0;
  /** 0..1 the white flash over it. */
  flash = 0;
  constructor(public art: StillArt) {}
  update(dt: number): void {
    this.t += dt;
  }
  draw(g: Gfx): void {
    if (this.shown > 0) g.alpha(this.shown, () => this.art.draw(g, this.t));
    if (this.flash > 0) g.rect(0, 0, W, H, '#FFFFFF', this.flash);
  }
}

export interface C3Still {
  /** Swap the picture (the memories one after another). */
  set(art: StillArt): void;
  /** Fade it out (ms) and take it away. */
  close(ms?: number): Co;
}

function* fadeTo(w: StillWidget, key: 'shown' | 'flash', to: number, ms: number): Co {
  const from = w[key];
  for (let t = 0; t < ms; t += 16.7) {
    w[key] = from + (to - from) * (t / ms);
    yield null;
  }
  w[key] = to;
}

/**
 * Put a still up over the field (it stays until close()). `flash`: a white flash (0.3 s, 62 12.13)
 * that the picture comes up under; otherwise it fades in over `fade` ms.
 */
export function* openC3Still(art: StillArt, o: { flash?: boolean; fade?: number } = {}): Co<C3Still> {
  const w = new StillWidget(art);
  game.ui.push(w);
  if (o.flash) {
    yield* fadeTo(w, 'flash', 1, 90);
    w.shown = 1;
    yield* fadeTo(w, 'flash', 0, 210);
  } else yield* fadeTo(w, 'shown', 1, o.fade ?? 300);
  return {
    set: (a) => {
      w.art = a;
      w.t = 0;
    },
    *close(ms = 300) {
      yield* fadeTo(w, 'shown', 0, ms);
      w.done = true;
    },
  };
}

/** Show a still, hold it `ms`, and take it away. */
export function* playC3Still(art: StillArt, o: { ms?: number; flash?: boolean; fade?: number; out?: number } = {}): Co {
  const s = yield* openC3Still(art, o);
  yield o.ms ?? 2000;
  yield* s.close(o.out ?? 300);
}

/** S30's memories: the white flash, then the three pictures 0.8 s each, no lines (60 10.29). */
export function* playKioku(): Co {
  const s = yield* openC3Still(kiokuArt(1), { flash: true });
  yield 800;
  s.set(kiokuArt(2));
  yield 800;
  s.set(kiokuArt(3));
  yield 800;
  yield* s.close(250);
}

// ---------------------------------------------------------------- the scenario's names (events/ch3/cuts.ts)

/**
 * Hold `art` for `ms` the way the scenario calls a cut: from black (the screen faded out before
 * it) the picture comes up out of the black and goes back into it; otherwise it fades in over
 * what is there and out again.
 */
function* asCut(art: StillArt, ms: number): Co {
  const fromBlack = game.fadeAlpha >= 0.5;
  if (fromBlack) {
    const w = new StillWidget(art);
    w.shown = 1;
    game.ui.push(w);
    yield* game.fadeIn(400);
    yield Math.max(0, ms - 800);
    yield* game.fadeOut(400);
    w.done = true;
    return;
  }
  yield* playC3Still(art, { ms: Math.max(0, ms - 250), fade: 120, out: 130 });
}

registerC3Cut('cut_c3_shuuka', (o) => asCut(shuukaArt(o.kita?.length), o.ms ?? 10000));
registerC3Cut('cut_c3_photo', (o) => asCut(photoArt(o.kita ?? cameIds()), o.ms ?? 2000));
registerC3Cut('cut_c3_kioku', function* () {
  yield* playKioku();
});

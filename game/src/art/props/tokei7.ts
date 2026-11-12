// チクタク堂の ばらばら時計（02_ch2_index #88、10_narrative 6.22・7.19、30_level_art 4.10・10.7）の 絵。
//
//   fudaIcon(kind, hato)  ウィンドウの 真ちゅうの 札（12×9）：豆腐・みかん・犬・じょうろ・鉄棒・コーヒー
//     カップを 彫った 板。7つ目（'nana'）は 何も 彫って いない、『鳩』と 彫った あと（hato）は
//     小さな 彫り（読めない 大きさなので 字の 形に しない）。ウィンドウの 寄りの 札、みました帳の 行に 使う。
//   prop_tokei7_photo  時計店 map_clock の カウンターの 東の はし (6,3)、作業台の よこに 立てた
//     額の 写真（7つ目の あと、flag_tokei7_done）。写真は 湯気で めがねが まっしろの 人と、
//     うしろに 豆腐屋の のれん（紺に 白の『豆』の しるし）。
//   tokeiPhotoBig()    その 写真を 調べた ときの 寄り（36×44、カードに 2倍で）。

import { mix, PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { stand } from './pkit';
import { registerProp } from './registry';

export type FudaKind = 'tofu' | 'mikan' | 'inu' | 'jouro' | 'tetsubo' | 'cup' | 'nana';

/** The engravings, 8×6 ('x' cut into the brass). */
const CUTS: Record<Exclude<FudaKind, 'nana'>, string[]> = {
  // a block of tofu, a little turned
  tofu: ['..xxxxx.', '.x....xx', 'xxxxxx.x', 'x....x.x', 'x....xx.', 'xxxxxx..'],
  // a mandarin with its stalk and a leaf
  mikan: ['...x.xx.', '..xxxx..', '.x....x.', '.x....x.', '.x....x.', '..xxxx..'],
  // a dog, side on, facing left (an ear up, the tail up)
  inu: ['.x......', 'xxx....x', 'xxxxxxxx', '..xxxxx.', '..x...x.', '..x...x.'],
  // a watering can: the handle over it, the spout to the right
  jouro: ['..xxx...', '.x...x.x', 'xxxxxxx.', 'x....xx.', 'x....x..', 'xxxxxx..'],
  // the high bar on its two posts
  tetsubo: ['xxxxxxxx', 'x......x', 'x......x', 'x......x', 'x......x', 'xx....xx'],
  // a coffee cup with its handle, steam over it
  cup: ['..x.x...', '.x.x....', 'xxxxxx..', 'x....xx.', 'x....x.x', '.xxxxxx.'],
};

const iconCache = new Map<string, HTMLCanvasElement>();

/** A brass tag of the window (12×9): the plate, its rim and what is cut into it. */
export function fudaIcon(kind: FudaKind, hato = false): HTMLCanvasElement {
  const key = kind + (hato ? ':hato' : '');
  let c = iconCache.get(key);
  if (c) return c;
  const p = new PixelCanvas(12, 9);
  const rim = P.brassOld;
  const face = P.brass;
  const cut = mix(P.woodDark, P.ink, 0.2);
  p.rect(1, 0, 10, 9, rim);
  p.rect(0, 1, 12, 7, rim);
  p.rect(1, 1, 10, 7, face);
  // the light on its top edge, the worn corner
  p.hline(1, 10, 1, P.goldPale);
  p.set(1, 2, P.goldPale);
  // a screw at each end
  p.set(1, 4, rim);
  p.set(10, 4, rim);
  const rows = kind === 'nana' ? null : CUTS[kind];
  if (rows) {
    for (let j = 0; j < rows.length; j++)
      for (let i = 0; i < 8; i++)
        if (rows[j][i] === 'x') p.set(2 + i, 2 + j, cut);
  } else if (hato) {
    // 『鳩』: two small cuts side by side, as a word too small to read
    p.rect(3, 3, 2, 3, cut);
    p.set(4, 2, cut);
    p.rect(6, 2, 3, 2, cut);
    p.rect(7, 4, 2, 2, cut);
    p.hline(6, 8, 6, cut);
  }
  c = p.toCanvas();
  iconCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- 作業台の よこの 額の 写真

/** The photo inside the frame, at any size: a navy noren with its white mark behind, a man whose glasses are white with steam. */
function paintPhoto(p: PixelCanvas, x0: number, y0: number, w: number, h: number, big: boolean): void {
  // the old print: warm, a little faded
  const fade = (c: string, k = 0.28) => mix(c, '#E8D8B0', k);
  // the shop front: a dark wall, the noren hanging across the top
  p.rect(x0, y0, w, h, fade(P.woodDark, 0.2));
  const nh = Math.max(3, Math.round(h * 0.38));
  p.rect(x0, y0, w, nh, fade(P.navy, 0.18));
  // the noren's slits and the white 『豆』 mark (a dot when small)
  const slits = big ? 4 : 2;
  for (let k = 1; k < slits; k++) p.vline(x0 + Math.round((w * k) / slits), y0 + Math.round(nh * 0.45), y0 + nh - 1, fade(P.night, 0.15));
  if (big) {
    const mx = x0 + Math.round(w / 4) - 2;
    const my = y0 + 3;
    p.hline(mx, mx + 4, my, fade(P.white, 0.1));
    p.rect(mx + 1, my + 2, 3, 2, fade(P.white, 0.1));
    p.set(mx + 2, my + 3, fade(P.navy, 0.18));
    p.hline(mx, mx + 4, my + 5, fade(P.white, 0.1));
    p.set(mx + 1, my + 6, fade(P.white, 0.1));
    p.set(mx + 3, my + 6, fade(P.white, 0.1));
    p.hline(mx, mx + 4, my + 7, fade(P.white, 0.1));
  } else p.set(x0 + 1, y0 + 1, fade(P.white, 0.1));
  // the steam rising past him (from the left: the tofu shop's cauldron)
  const steam = fade(P.white, 0.05);
  if (big) {
    for (let j = 0; j < 14; j++) {
      const sx = x0 + 3 + Math.round(Math.sin(j * 0.7) * 1.5) + (j >> 2);
      p.set(sx, y0 + h - 8 - j * 2, steam);
      p.set(sx + 1, y0 + h - 9 - j * 2, mix(steam, P.woodDark, 0.3));
    }
  } else p.set(x0, y0 + nh + 1, steam);
  // the man: shoulders, a white shirt with a dark cardigan, the face, grey hair
  const cx = x0 + Math.round(w * 0.58);
  const s = big ? 1 : 0;
  const shirt = fade(P.white, 0.12);
  const card = fade(P.wood, 0.2);
  const skin = fade(P.skin2, 0.15);
  const hair = fade(P.steel, 0.15);
  if (big) {
    // shoulders and cardigan
    p.ellipse(cx, y0 + h + 2, 11, 9, card);
    p.rect(cx - 3, y0 + h - 8, 7, 8, shirt);
    p.set(cx, y0 + h - 6, fade(P.ink, 0.3));
    p.set(cx, y0 + h - 3, fade(P.ink, 0.3));
    // neck and face
    p.rect(cx - 2, y0 + h - 11, 5, 4, mix(skin, P.woodDark, 0.15));
    p.ellipse(cx, y0 + h - 17, 6, 7, skin);
    // ears
    p.set(cx - 7, y0 + h - 17, skin);
    p.set(cx + 7, y0 + h - 17, skin);
    // grey hair, thinning on top
    p.hline(cx - 5, cx + 5, y0 + h - 24, hair);
    p.hline(cx - 6, cx - 4, y0 + h - 23, hair);
    p.hline(cx + 4, cx + 6, y0 + h - 23, hair);
    p.vline(cx - 6, y0 + h - 22, y0 + h - 19, hair);
    p.vline(cx + 6, y0 + h - 22, y0 + h - 19, hair);
    // the glasses: two round lenses gone white with steam, the thin frame
    const glass = fade('#FFFFFF', 0.04);
    for (const gx of [cx - 3, cx + 3]) {
      p.ellipse(gx, y0 + h - 18, 2.6, 2.2, fade(P.charcoal, 0.25));
      p.ellipse(gx, y0 + h - 18, 1.8, 1.4, glass);
    }
    p.set(cx, y0 + h - 18, fade(P.charcoal, 0.25));
    // a smile
    p.hline(cx - 2, cx + 2, y0 + h - 13, fade(P.maroon, 0.3));
    p.set(cx - 3, y0 + h - 14, fade(P.maroon, 0.3));
    p.set(cx + 3, y0 + h - 14, fade(P.maroon, 0.3));
  } else {
    p.rect(cx - 2 - s, y0 + h - 2, 5, 2, card);
    p.set(cx, y0 + h - 2, shirt);
    p.rect(cx - 1, y0 + h - 5, 3, 3, skin);
    p.hline(cx - 1, cx + 1, y0 + h - 6, hair);
    // the white glasses
    p.set(cx - 1, y0 + h - 4, '#FFFFFF');
    p.set(cx + 1, y0 + h - 4, '#FFFFFF');
  }
}

/** The framed photo standing on the counter (11×13): dark wood, a cream mount, the stand behind. */
const PHOTO_SMALL = (() => {
  const p = new PixelCanvas(11, 13);
  const frame = P.woodDark;
  p.rect(0, 0, 11, 12, frame);
  p.hline(1, 9, 0, P.wood);
  p.set(0, 0, P.ink);
  p.set(10, 0, P.ink);
  // the cream mount and the photo in it
  p.rect(1, 1, 9, 10, P.paper);
  paintPhoto(p, 2, 2, 7, 8, false);
  // the frame's lower edge catches the shop's lamp
  p.hline(1, 9, 11, mix(P.woodDark, P.woodLt, 0.4));
  // its foot on the counter
  p.hline(2, 8, 12, mix(P.ink, P.woodDark, 0.4));
  return p.toCanvas();
})();

/**
 * Anchor (6,3), the counter's east end (in_ck_counter: its top at world y 46–54). The frame
 * stands at the back of the counter, beside the workbench, so it is drawn after the counter
 * (foot at the counter's front, 16).
 */
registerProp('prop_tokei7_photo', () => stand(PHOTO_SMALL, { cx: 10, base: 4, foot: 16, contact: 0, shadow: 0 }));

let bigPhoto: HTMLCanvasElement | null = null;

/** The photo close up (36×44), for the card shown while it is examined. */
export function tokeiPhotoBig(): HTMLCanvasElement {
  if (bigPhoto) return bigPhoto;
  const p = new PixelCanvas(36, 44);
  paintPhoto(p, 0, 0, 36, 44, true);
  // the print's white border and a little wear at one corner
  p.rect(0, 0, 36, 1, '#F4ECD8');
  p.rect(0, 43, 36, 1, '#F4ECD8');
  p.rect(0, 0, 1, 44, '#F4ECD8');
  p.rect(35, 0, 1, 44, '#F4ECD8');
  p.set(34, 1, '#E8D8B0');
  p.set(33, 1, '#E8D8B0');
  p.set(34, 2, '#E8D8B0');
  bigPhoto = p.toCanvas();
  return bigPhoto;
}

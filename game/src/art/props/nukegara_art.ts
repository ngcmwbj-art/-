// 背中から、1回で（03_ch3_index、events/ch3/nukegara.ts）の 絵：セミの ぬけがら 4種（上から 見た 形）と、
// 触角の ルーペ。大写し「手の ひら」と みました帳の ページで 使う。
//
// 見分け（調べた 所。data/text/c3_nukegara.ts の 頭）：
//   ニイニイゼミ  小さくて 丸い。全身に 泥。つや なし。
//   ツクツクボウシ 細長くて 小さめ。色が うすく、つや なし。
//   アブラゼミ   大きい。茶色で つやが ある。触角は 毛が 多く、根もとから 3つめの 節が 長い。
//   ミンミンゼミ  アブラゼミと 同じ 大きさ・色・つや（大きさや 色では 分けられない）。触角の 毛が 少なく、3つめの 節が 短い。
// 大きさの 比は おおよそ ニイニイ 20・ツクツク 26・アブラ／ミンミン 32（mm くらい）。

import type { Gfx } from '../../engine/gfx';

export type SemiKind = 'tsuku' | 'niinii' | 'abura' | 'minmin';

interface Look {
  /** 長さ・幅（scale 1 の px）。 */
  len: number;
  wid: number;
  base: string;
  dark: string;
  light: string;
  /** つやの 白い 点。 */
  gloss: boolean;
  mud: boolean;
}

export const SEMI_LOOK: Record<SemiKind, Look> = {
  niinii: { len: 28, wid: 22, base: '#8A6E4E', dark: '#5E4A34', light: '#A88E6C', gloss: false, mud: true },
  tsuku: { len: 36, wid: 16, base: '#BC9C6C', dark: '#8E7450', light: '#D2B88E', gloss: false, mud: false },
  abura: { len: 44, wid: 26, base: '#8E5426', dark: '#5A3012', light: '#B8783E', gloss: true, mud: false },
  minmin: { len: 44, wid: 26, base: '#8E5426', dark: '#5A3012', light: '#B8783E', gloss: true, mud: false },
};

/** 大きさの 順（小さい 物から）。 */
export const SEMI_ORDER: SemiKind[] = ['niinii', 'tsuku', 'abura', 'minmin'];

function hash(i: number, j: number): number {
  const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

/** だ円を 塗る（中心 cx, cy、半径 rx, ry）。 */
function ellipse(g: Gfx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  const r = Math.max(1, Math.round(ry));
  for (let dy = -r; dy <= r; dy++) {
    const k = 1 - (dy / (ry + 0.5)) ** 2;
    if (k <= 0) continue;
    const hw = Math.round(rx * Math.sqrt(k));
    g.rect(Math.round(cx - hw), Math.round(cy + dy), hw * 2 + 1, 1, color);
  }
}

/**
 * ぬけがら 1つ（頭が 上、背中が こちら。割れた 背中が 見える）。(cx, cy) は 体の 中心。
 * `mono`：帳面の えんぴつの 線（色を 1つに）。
 */
export function drawSemi(g: Gfx, kind: SemiKind, cx: number, cy: number, scale = 1, mono?: string): void {
  const L = SEMI_LOOK[kind];
  const len = L.len * scale;
  const wid = L.wid * scale;
  const top = cy - len / 2;
  const base = mono ?? L.base;
  const dark = mono ?? L.dark;
  const light = mono ? mono : L.light;
  const hairy = kind === 'abura';
  // the legs first (under the body): the big digging forelegs forward, the four others out and back
  const leg = (sx: number, sy: number, ex: number, ey: number) => g.line(Math.round(sx), Math.round(sy), Math.round(ex), Math.round(ey), dark);
  for (const s of [-1, 1]) {
    const fx = cx + s * wid * 0.32;
    const fy = top + len * 0.3;
    leg(fx, fy, cx + s * wid * 0.62, top + len * 0.14);
    leg(fx + s, fy, cx + s * wid * 0.64, top + len * 0.15);
    leg(cx + s * wid * 0.62, top + len * 0.14, cx + s * wid * 0.5, top + len * 0.02);
    leg(cx + s * wid * 0.42, top + len * 0.42, cx + s * wid * 0.72, top + len * 0.48);
    leg(cx + s * wid * 0.72, top + len * 0.48, cx + s * wid * 0.78, top + len * 0.58);
    leg(cx + s * wid * 0.4, top + len * 0.5, cx + s * wid * 0.66, top + len * 0.66);
    leg(cx + s * wid * 0.66, top + len * 0.66, cx + s * wid * 0.7, top + len * 0.78);
  }
  // the abdomen (segmented, tapering back), the thorax, the head
  ellipse(g, cx, top + len * 0.7, wid * 0.4, len * 0.3, base);
  ellipse(g, cx, top + len * 0.38, wid * 0.46, len * 0.2, base);
  ellipse(g, cx, top + len * 0.13, wid * 0.36, len * 0.11, base);
  if (!mono) {
    for (let k = 1; k <= 6; k++) {
      const y = top + len * (0.5 + k * 0.07);
      const hw = wid * 0.4 * Math.sqrt(Math.max(0, 1 - ((y - (top + len * 0.7)) / (len * 0.3)) ** 2));
      g.rect(Math.round(cx - hw + 1), Math.round(y), Math.max(1, Math.round(hw * 2 - 1)), 1, dark);
    }
    // the eyes: two clear bulges at the head's corners
    for (const s of [-1, 1]) {
      ellipse(g, cx + s * wid * 0.34, top + len * 0.12, Math.max(1, wid * 0.08), Math.max(1, len * 0.04), light);
      g.px(Math.round(cx + s * wid * 0.34), Math.round(top + len * 0.12), '#F4ECD8');
    }
  } else {
    // the pencil: the outline only
    for (let k = 1; k <= 3; k++) g.rect(Math.round(cx - wid * 0.25), Math.round(top + len * (0.55 + k * 0.1)), Math.round(wid * 0.5), 1, '#FBF3DC');
  }
  // the antennae, short, from the head's front
  for (const s of [-1, 1]) {
    const ax = cx + s * wid * 0.14;
    const ay = top + len * 0.04;
    leg(ax, ay, ax + s * wid * 0.22, ay - len * 0.08);
    if (hairy && scale >= 1 && !mono) {
      g.px(Math.round(ax + s * wid * 0.1), Math.round(ay - len * 0.06), dark);
      g.px(Math.round(ax + s * wid * 0.16), Math.round(ay - len * 0.09), dark);
    }
  }
  // the split down the back: head to the thorax's end, the edges curled up
  const sy0 = Math.round(top + len * 0.08);
  const sy1 = Math.round(top + len * 0.54);
  g.rect(Math.round(cx) - 1, sy0, 2, sy1 - sy0, mono ? '#FBF3DC' : '#2A1A0E');
  if (!mono) {
    g.rect(Math.round(cx) - 2, sy0 + 1, 1, sy1 - sy0 - 2, light);
    g.rect(Math.round(cx) + 1, sy0 + 1, 1, sy1 - sy0 - 2, light);
  }
  if (mono) return;
  // the gloss (アブラ・ミンミン): white points of the noon sun on the thorax and the abdomen
  if (L.gloss) {
    g.px(Math.round(cx - wid * 0.24), Math.round(top + len * 0.32), '#FFF0D0');
    g.rect(Math.round(cx - wid * 0.26), Math.round(top + len * 0.36), 2, 1, '#F8DCA8');
    g.px(Math.round(cx + wid * 0.2), Math.round(top + len * 0.66), '#FFF0D0');
    g.px(Math.round(cx + wid * 0.24), Math.round(top + len * 0.62), '#F8DCA8');
  }
  // the mud (ニイニイ): grey-brown crumbs all over
  if (L.mud) {
    const n = Math.round(len * wid * 0.06);
    for (let i = 0; i < n; i++) {
      const u = hash(i, 1) * 2 - 1;
      const v = hash(i, 2);
      const x = cx + u * wid * 0.36;
      const y = top + len * (0.06 + v * 0.88);
      g.rect(Math.round(x), Math.round(y), hash(i, 3) < 0.4 ? 2 : 1, 1, hash(i, 4) < 0.5 ? '#8E8270' : '#6E6454');
    }
  }
}

/**
 * 触角の ルーペ（丸い 窓の 中に、根もとから 先まで 5つの 節）。アブラゼミは 毛が 多く 3つめが 長い、
 * ミンミンゼミは 毛が 少なく 3つめが 短い。(cx, cy) は 窓の 中心、r は 半径。
 */
export function drawLoupe(g: Gfx, kind: 'abura' | 'minmin', cx: number, cy: number, r: number): void {
  const L = SEMI_LOOK[kind];
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.round(Math.sqrt(r * r - dy * dy));
    g.rect(cx - hw, cy + dy, hw * 2 + 1, 1, '#F4ECD8');
  }
  // the segments, from the base (left) to the tip (right), a little rising; the 3rd from the base the darker one
  const segs = kind === 'abura' ? [6, 5, 12, 5, 4] : [6, 6, 5, 5, 4];
  const total = segs.reduce((a, b) => a + b + 1, 0);
  let x = cx - Math.round(total / 2);
  segs.forEach((w, i) => {
    const y = cy + 3 - Math.round(i * 1.2);
    const th = i < 2 ? 4 : 3;
    g.rect(x, y - th + 1, w, th, i === 2 ? L.dark : L.base);
    g.rect(x, y - th + 1, w, 1, L.light);
    // the hairs: アブラ many (above and below), ミンミン a few
    const step = kind === 'abura' ? 2 : 7;
    for (let k = 1; k < w; k += step) {
      g.px(x + k, y - th, L.dark);
      g.px(x + k + 1, y - th - 1, L.dark);
      if (kind === 'abura') g.px(x + k, y + 1, L.dark);
    }
    x += w + 1;
  });
  for (let a = 0; a < 48; a++) {
    const th = (a / 48) * Math.PI * 2;
    g.px(Math.round(cx + Math.cos(th) * r), Math.round(cy + Math.sin(th) * r), '#5A5468');
  }
  // the handle
  g.line(cx + Math.round(r * 0.7), cy + Math.round(r * 0.7), cx + r + 5, cy + r + 5, '#5A5468');
  g.line(cx + Math.round(r * 0.7) + 1, cy + Math.round(r * 0.7), cx + r + 6, cy + r + 5, '#5A5468');
}

/** 地図の 小さな ぬけがら（茶色い 点、3〜4px）。(x, y) は 画面の 位置。 */
export function drawSemiDot(g: Gfx, kind: SemiKind, x: number, y: number): void {
  const L = SEMI_LOOK[kind];
  const w = kind === 'niinii' ? 4 : kind === 'tsuku' ? 3 : 4;
  const h = kind === 'niinii' ? 4 : 5;
  // a darker rim so it reads on the grey hull, the tyre and the bark; the split back, a glint, the mud
  g.rect(x - 2, y - h, w + 2, h + 2, L.dark);
  g.rect(x - 1, y - h + 1, w, h, L.base);
  g.px(x - 1 + (w >> 1), y - h + 1, L.dark);
  if (L.gloss) g.px(x - 1, y - h + 2, '#F8DCA8');
  if (L.mud) {
    g.px(x, y, '#8E8270');
    g.px(x + 1, y - 2, '#8E8270');
  }
}

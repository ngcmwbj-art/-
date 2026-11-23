// 大写し「チャイム」（第3章 旧水族館の 放送室、events/ch3/housou.ts ChimePanel）の 左の 絵を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：放送室の 机の 上の チャイムの 箱を 寄りで。灰色の 箱の 面に 4つの
// 押しボタン（だいだい・黄・緑・青の 丸い 頭、黒い 輪）、その 下に 音の 高さの 段（1〜4 段、黄色）、
// 下の 線。マイクの 間は ボタンも 段も 灰色。押した ボタンは 少し 沈む。後ろは 放送室の 穴あきの
// 吸音板の 壁（フィールドの 放送室と 同じ 色）、手前に 机の 天板。ボタンは 2D の 当たり（TouchPick）と
// 同じ px（奥行き D0 の 面）に 置く。「低い／高い」の 字・カーソル・飛ぶ 音符・マイクの 札は 2D。

import * as THREE from 'three';
import { valueNoise } from '../../engine/rng';
import { HS_BTN } from '../../events/ch3/housou';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { D0, gfxImg, pix } from './_kit_e';

const W = 210;
const H = 112;
const BX0 = 18;
const BGAP = 48;
const BW = 30;
const BOX = '#B8B4A8';
const BOX_DK = '#8A867A';
const INK = '#2A2440';
const BTN = ['#E8743A', '#D9A441', '#3FA66B', '#4A7AB8'];
const STEP = '#FFE7A3';

/** 放送室（天井の 蛍光灯：白く 平らな 光）。 */
const ROOM: PanelLight = { sun: '#FFF4E4', sky: '#F0ECE4', ground: '#8A9488', fog: '#2E343C', sunI: 1.5, hemiI: 1.7, el: 60, az: 20 };

/** 箱の 面（2D と 同じ：枠・面・ボタンの 輪・高さの 段・下の 線）。mic：灰色。 */
function faceImg(mic: boolean): HTMLCanvasElement {
  return gfxImg(`hs:face:${mic}`, W, H, (g) => {
    g.rect(6, 14, W - 12, 78, BOX_DK);
    g.rect(8, 16, W - 16, 74, BOX);
    g.rect(8, 16, W - 16, 1, '#D8D4C8');
    // ねじ 4つ
    for (const [x, y] of [[10, 18], [W - 12, 18], [10, 87], [W - 12, 87]]) g.rect(x, y, 2, 2, '#6A665C');
    for (let i = 0; i < 4; i++) {
      const h = HS_BTN[i];
      const bx = BX0 + i * BGAP;
      g.rect(bx - 1, 23, BW + 2, 18, '#5A564C');
      g.rect(bx, 24, BW, 16, '#3A3830');
      const sy = 58;
      for (let s = 0; s <= h; s++) {
        g.rect(bx + 2 + s * 7, sy - s * 5, 6, 6 + s * 5, mic ? '#6A665C' : STEP);
        g.rect(bx + 2 + s * 7, sy - s * 5, 6, 1, mic ? '#7A766C' : '#FFF6D8');
      }
      g.rect(bx + 1, sy + 6, BW - 2, 1, INK);
    }
  });
}

/** ボタンの 頭（丸い ふち、上の 照り）。 */
function capImg(i: number, mic: boolean): HTMLCanvasElement {
  return pix(`hs:cap:${i}:${mic}`, BW, 14, (p) => {
    const c = mic ? '#8A867A' : BTN[i];
    p.rect(1, 0, BW - 2, 14, c);
    p.rect(0, 1, BW, 12, c);
    p.hline(2, BW - 3, 1, mic ? '#9A968A' : '#FFFFFF');
    p.hline(3, BW - 4, 2, mic ? '#9A968A' : '#F4E8D8');
    p.hline(1, BW - 2, 13, '#3A3830');
  });
}

/** 吸音板の 壁（小さな 穴の 並び、24px ごとの 継ぎ目）。 */
function wallImg(): HTMLCanvasElement {
  return pix('hs:wall', 48, 48, (p) => {
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 48; x++) {
        let c = valueNoise(x / 10, y / 7, 7605) > 0.7 ? '#C4C0B0' : '#D0CCBC';
        if (x % 24 === 0) c = '#9A9688';
        else if (x % 4 === 2 && y % 4 === 2) c = '#8A867A';
        p.set(x, y, c);
      }
  });
}
function deskImg(): HTMLCanvasElement {
  return pix('hs:desk', 32, 16, (p) => {
    p.fill('#8A6A48');
    for (let x = 0; x < 32; x++) for (let y = 0; y < 16; y++) if (valueNoise(x / 9, y / 2, 7611) > 0.65) p.set(x, y, '#9A7A56');
    p.hline(0, 31, 0, '#B08A5E');
  });
}
function side(): HTMLCanvasElement {
  return pix('hs:side', 8, 8, (p) => {
    p.fill(BOX_DK);
    p.hline(0, 7, 0, '#D8D4C8');
  });
}

function build(k: Kit, s: Record<string, unknown>): void {
  const mic = !!s.mic;
  const z = -D0;
  const px = k.pxAt(D0);
  // 壁（箱の 後ろ）と 机の 天板
  const wz = z - 1.6;
  const top = k.atDepth(0, -20, wz)!.y;
  const bot = k.atDepth(0, H + 30, wz)!.y;
  k.box(-20, 20, bot, top, wz - 0.2, wz, { front: wallImg() });
  for (let x = -20; x < 20; x += 3) for (let y = bot; y < top; y += 3) k.quad(wallImg(), [x, y, wz + 0.01], [x + 3, y, wz + 0.01], [x + 3, y + 3, wz + 0.01], [x, y + 3, wz + 0.01]);
  const dy = k.atDepth(0, 92, z)!.y;
  k.box(-20, 20, dy - 0.6, dy, wz, z + 3, { top: deskImg(), front: deskImg() });
  // 箱（前の 面は 2D と 同じ 絵、厚さ 1.4）
  const a = k.atDepth(6, 92, z)!;
  const b = k.atDepth(W - 6, 14, z)!;
  k.box(a.x, b.x, a.y, b.y, z - 1.4, z, { top: side(), left: side(), right: side() });
  k.stand(faceImg(mic), k.atDepth(0, H, z + 0.01)!, { px, depth: 0, anchor: 'left', cast: false, emissive: 0.3 });
  // ボタン（押すと 沈む：update）
  const caps: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const at = k.atDepth(BX0 + i * BGAP + BW / 2, 38, z + 0.4)!;
    caps.push(k.stand(capImg(i, mic), at, { px: k.pxAt(D0 - 0.4), depth: 6, emissive: 0.25 }));
  }
  k.bag.caps = caps;
  k.bag.capY = caps.map((c) => c.position.y);
  k.bag.capZ = caps.map((c) => c.position.z);
  k.bag.px = px;
}

registerPanel3d('housou', {
  cam: { fov: 24, pitch: 0, pos: [0, 0, 0], far: 200 },
  light: ROOM,
  fog: [30, 80],
  shadow: { x: 0, z: -D0, hw: 12, hd: 8 },
  focus: 0.4,
  tilt: 0.35,
  build,
  update(k, _t, s) {
    const caps = k.bag.caps as THREE.Mesh[];
    const px = k.bag.px as number;
    caps.forEach((c, i) => {
      const down = Number(s.press) === i;
      c.position.y = (k.bag.capY as number[])[i] - (down ? 3 * px : 0);
      c.position.z = (k.bag.capZ as number[])[i] - (down ? 0.25 : 0);
    });
    k.shadowDirty = true;
  },
});

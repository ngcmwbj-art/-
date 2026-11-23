// 大写し「焼き芋の 窓」（第3章 水槽の うら、events/ch3/imo.ts ImoPanel）の 左の 絵を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：小さな 焼き芋の 機械の 鉄の 枠と のぞき窓、中は 熱で 赤く、上に 電気の
// ヒーター（つまみを 上げる ほど 赤く 光る）、引き出しの 石の 上に 芋が 3本（焼ける ほど 皮が 濃く、
// 石に 当たった 側に 焼け目。返すと 焼け目が 入れかわり、少し 持ち上がる。最後は 蜜が にじむ）。
// 窓の 中は 奥行きの ある 箱（石は 1つずつ 押し出した 小石、芋も 厚みの ある 体）、中の 赤い 光は
// 点の 光（熱で 強く）。湯気・竹串・ガラスの 照りは 2D の まま 上に（毎フレーム 動く）。

import * as THREE from 'three';
import { valueNoise } from '../../engine/rng';
import { h01 } from '../../art/tiles/noise';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { D0, gfxImg, mix, pix, plane } from './_kit_e';

const W = 210;
const H = 112;
/** 窓（2D と 同じ：絵の 左上から）。 */
const WX = 8;
const WY = 8;
const WW = W - 16;
const WH = H - 16;
const COOK_STEPS = 5;

const ROOM: PanelLight = { sun: '#F0F6EC', sky: '#E8F0E4', ground: '#4A5048', fog: '#1E1A18', sunI: 1.2, hemiI: 1.3, el: 62, az: 15 };

function lerp(a: string, b: string, k: number): string {
  return mix(a, b, Math.max(0, Math.min(1, k)));
}

/** 鉄の 枠（窓の 所は 抜く）。 */
function frameImg(): HTMLCanvasElement {
  return pix('im:frame', W, H, (p) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const inWin = x >= WX && x < WX + WW && y >= WY && y < WY + WH;
        if (inWin) continue;
        let c = valueNoise(x / 12, y / 6, 7801) > 0.7 ? '#868A92' : '#7A7E86';
        if (y < 3) c = '#9A9EA6';
        if (h01(x, y, 7803) > 0.985) c = '#5A5E66';
        p.set(x, y, c);
      }
    // 窓の まわりの 黒い パッキン
    p.strokeRect(WX - 2, WY - 2, WW + 4, WH + 4, '#3A3E46');
    p.strokeRect(WX - 1, WY - 1, WW + 2, WH + 2, '#2A2E36');
    // ねじ
    for (const [x, y] of [[3, 3], [W - 5, 3], [3, H - 5], [W - 5, H - 5]]) {
      p.rect(x, y, 2, 2, '#B8BCC4');
      p.set(x + 1, y + 1, '#4A4E56');
    }
  });
}

/** 窯の 中の 壁（すすけた 鉄、熱で 赤く 見える のは 光）。 */
function ovenImg(): HTMLCanvasElement {
  return pix('im:oven', 32, 32, (p) => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) p.set(x, y, valueNoise(x / 5, y / 5, 7805) > 0.6 ? '#7A4A3A' : '#5E3A2E');
  });
}

/** ヒーター（横の 管と 下の 歯）。 */
function heaterImg(): HTMLCanvasElement {
  return pix('im:heater', WW - 8, 3, (p) => {
    p.hline(0, WW - 9, 0, '#FF9A5A');
    p.hline(0, WW - 9, 1, '#E86A3A');
    for (let i = 0; i < WW - 8; i += 6) p.rect(i, 2, 3, 1, '#C84A2A');
  });
}

/** 小石（引き出しの 石）。 */
function stoneImg(i: number): HTMLCanvasElement {
  return pix(`im:stone:${i % 3}`, 9, 7, (p) => {
    const c = i % 2 ? '#6A6058' : '#7A6E64';
    p.ellipse(4, 3.5, 4, 3, mix(c, '#2A2420', 0.4));
    p.ellipse(4, 3.5, 3.2, 2.4, c);
    p.hline(3, 5, 1, '#C8A078');
  });
}

/** 芋 1本（2D と 同じ 形・色：焼け具合 c、返したか f）。 */
function imoImg(i: number, cq: number, f: boolean): HTMLCanvasElement {
  const c = cq / (COOK_STEPS - 1);
  return gfxImg(`im:imo:${i}:${cq}:${f}`, 64, 26, (g) => {
    const cx = 32;
    const y0 = 13;
    const skin = lerp('#9A2E58', '#5E1A2C', c);
    const skinLt = lerp('#C2507A', '#8A3444', c);
    const skinDk = lerp('#6A1E40', '#3A0E18', c);
    const rx = 27 - (i % 2) * 3;
    const ry = 10 - (i % 2);
    const bend = i === 1 ? -1 : 1;
    for (let x = -rx; x <= rx; x++) {
      const u = x / rx;
      const hh = Math.max(1, Math.round(ry * Math.pow(Math.max(0, 1 - u * u), 0.75)));
      const yc = y0 + Math.round(bend * u * u * 3);
      g.rect(cx + x, yc - hh, 1, hh * 2, skin);
      g.rect(cx + x, yc - hh, 1, Math.max(1, Math.round(hh * 0.5)), skinLt);
      g.rect(cx + x, yc + hh - 2, 1, 2, skinDk);
    }
    g.rect(cx - rx - 4, y0 + bend * 3, 5, 1, '#6A4A3A');
    g.rect(cx + rx, y0 + bend * 3 - 1, 4, 1, '#6A4A3A');
    const side = f ? 1 : 0;
    const n = Math.floor(c * 10);
    for (let k = 0; k < n; k++) {
      const s = (k * 37 + i * 11 + side * 5) % 29;
      const bx = cx - rx + 6 + ((s * 7) % (rx * 2 - 12));
      const by = y0 - 4 + ((s * 5) % 9);
      g.rect(bx, by, 4 + (k % 2), 2, lerp('#4A1222', '#20080C', c));
    }
    if (c > 0.8)
      for (const ox of [-rx + 7, rx - 9]) {
        g.rect(cx + ox, y0 + 3, 3, 4, '#E89A2A');
        g.px(cx + ox + 1, y0 + 3, '#FFE0A0');
      }
  });
}

function build(k: Kit): void {
  const z = -D0;
  const px = k.pxAt(D0);
  // 鉄の 枠（手前、厚さ 0.5）
  k.stand(frameImg(), k.atDepth(0, H, z + 0.5)!, { px: k.pxAt(D0 - 0.5), depth: 8, anchor: 'left' });
  // 窯の 中（窓の 後ろ 3.2 の 箱）：奥の 壁・床（引き出し）・天井・両わき
  const a = k.atDepth(WX - 6, WY + WH + 6, z)!;
  const b = k.atDepth(WX + WW + 6, WY - 6, z)!;
  const zb = z - 3.2;
  const ov = ovenImg();
  k.box(a.x, b.x, a.y, b.y, zb - 0.1, zb, { front: ov });
  const floorY = k.atDepth(0, WY + WH - 6, z)!.y;
  k.box(a.x, b.x, a.y, floorY, zb, z + 0.2, { top: pix('im:drawer', 16, 16, (p) => p.fill('#2A2220')) });
  k.quad(ov, [a.x, b.y, z + 0.2], [b.x, b.y, z + 0.2], [b.x, b.y, zb], [a.x, b.y, zb]);
  k.quad(ov, [a.x, a.y, zb], [a.x, a.y, z + 0.2], [a.x, b.y, z + 0.2], [a.x, b.y, zb]);
  k.quad(ov, [b.x, a.y, z + 0.2], [b.x, a.y, zb], [b.x, b.y, zb], [b.x, b.y, z + 0.2]);
  // ヒーター（窓の 上の はし、奥の 方）：光る
  const hz = z - 1.2;
  const ht = k.atDepth(WX + 4, WY + 8, hz)!;
  k.bag.heater = k.stand(heaterImg(), ht, { px: k.pxAt(-hz), depth: 3, anchor: 'left', emissive: 1.2, cast: false });
  // 石（引き出しに びっしり）
  for (let i = 0; i < 90; i++) {
    const sx = WX + 4 + h01(i, 1, 7807) * (WW - 8);
    const sz = z - 0.3 - h01(i, 2, 7809) * 2.6;
    const at = new THREE.Vector3(k.atDepth(sx, 0, sz)!.x, floorY, sz);
    k.stand(stoneImg(i), at, { px: px * (1.1 + h01(i, 3, 7811) * 0.6), depth: 5 });
  }
  // 芋 3本（焼け具合 5段 × 返した／まだ を 作って 見せる 物を 切りかえる）
  const imos: { i: number; c: number; f: boolean; m: THREE.Mesh; y: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const cx = WX + 34 + i * 62;
    const cy = WY + WH - 24 - (i % 2) * 2;
    const iz = z - 1.1;
    const at = k.atDepth(cx, cy + 13, iz)!;
    for (let c = 0; c < COOK_STEPS; c++)
      for (const f of [false, true]) {
        const m = k.stand(imoImg(i, c, f), at, { px: k.pxAt(-iz), depth: 12, emissive: 0.25 });
        imos.push({ i, c, f, m, y: at.y });
      }
  }
  k.bag.imos = imos;
  k.bag.px = px;
  // 中の 赤い 光（熱）と ガラス
  const heat = new THREE.PointLight('#FF8A3A', 20, 14, 1.2);
  heat.position.set(0, (floorY + b.y) / 2, z - 0.3);
  k.scene.add(heat);
  k.bag.heat = heat;
  const gl = k.atDepth(W / 2, H / 2, z + 0.1)!;
  plane(k, pix('solid:#C8D0D8', 4, 4, (p) => p.fill('#C8D0D8')), gl, WW * px, WH * px, { opacity: 0.05, unlit: true, order: 3 });
  // 窯の 下の だいだいの 光（石の 照り返し）
  const gb = k.atDepth(W / 2, WY + WH - 22, z - 2.6)!;
  k.bag.glow = plane(k, pix('solid:#F29A3A', 4, 4, (p) => p.fill('#F29A3A')), gb, WW * px * 1.2, 34 * px, { add: true, opacity: 0.3, order: 4 });
}

registerPanel3d('imo', {
  cam: { fov: 24, pitch: 0, pos: [0, 0, 0], far: 200 },
  light: ROOM,
  fog: null,
  shadow: { x: 0, z: -D0 - 1, hw: 8, hd: 6 },
  focus: 0.62,
  tilt: 0.4,
  build,
  update(k, _t, s) {
    const cq = Math.min(COOK_STEPS - 1, Math.floor(Number(s.cook ?? 0) * COOK_STEPS));
    const f = !!s.flip;
    const lift = Number(s.lift ?? 0) * (k.bag.px as number);
    for (const e of k.bag.imos as { c: number; f: boolean; m: THREE.Mesh; y: number }[]) {
      e.m.visible = e.c === cq && e.f === f;
      e.m.position.y = e.y + lift;
    }
    const heat = 0.55 + 0.25 * Number(s.cook ?? 0) + 0.25 * (Number(s.knob ?? 0) / 2);
    (k.bag.heat as THREE.PointLight).intensity = 14 + heat * 40;
    ((k.bag.glow as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.18 + 0.22 * heat;
    const hm = (k.bag.heater as THREE.Mesh).material as THREE.MeshLambertMaterial;
    hm.emissiveIntensity = 0.5 + 0.8 * (Number(s.knob ?? 0) / 2);
    k.shadowDirty = true;
  },
});

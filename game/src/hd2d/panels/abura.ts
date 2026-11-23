// 大写し「ヘラ」（第3章 旧水族館の 倉庫の 外の 廊下の 机、events/ch3/abura.ts HeraPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：廊下の 明かりの 下の 古い 机の 天板（ほこりの 木目）、2本の 鉄の ヘラ（左に 刃、
// 右に 木の 柄）。手前が 今の 1本、奥が もう 1本。刃は すすの 黒い しみ（ふくと 減る）→ 油が のびると 鉄の 黒に
// 光る、多すぎると 黄色い 油の しずく（べたべた）。ふく・のばす ときの 布（←→ で 左右）、1てきの ときの 油さし。
// 3D：机を ななめ上から。刃の 絵は 状態が 変わる たびに 描き直す（2D と 同じ すすの 位置・数）。
// 落ちる 1てきの 点は 2D の まま。

import * as THREE from 'three';
import { mix, PixelCanvas } from '../../engine/pixel';
import { pixelTexture } from '../solid';
import { registerPanel3d, type Kit } from '../panel3d';
import { pix } from './_kit_d';

const W = 202;
const H = 112;
/** 刃の まん中の x（パネルの px：abura.ts SX + 92 − SX）。 */
const CX = 92;
const FUKU_N = 6;
const NOBASU_N = 4;

/** 机の 天板（古い 板、ほこり、木目）。 */
function deskImg(): HTMLCanvasElement {
  return pix('ab:desk', 64, 64, (p) => {
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const g = Math.sin(x / 7 + Math.sin(y / 5) * 1.3) > 0.6;
        p.set(x, y, g ? '#4E3C2E' : (x * 13 + y * 7) % 23 === 0 ? '#6A5444' : '#5A4636');
      }
    for (let y = 0; y < 64; y += 9) p.hline(0, 63, y, '#4A3828');
    for (let i = 0; i < 30; i++) p.set((i * 29) % 64, (i * 17) % 64, '#7A6A58');
  });
}

/** 刃の 絵（60 × 36、行 0 が 2D の y）：鉄の 色・すす・油の ひかり・べたべた。 */
function paintBlade(p: PixelCanvas, soot: number, oil: number, beta: boolean): void {
  p.clear();
  for (let i = 0; i < 30; i++) {
    const h = 18 + Math.round(i * 0.4);
    const top = 18 - Math.round(h / 2);
    const base = oil > 0 ? (oil >= 1 ? '#2A2A30' : '#4A4A52') : '#7A7A84';
    p.rect(i * 2, top, 2, h, base);
    p.set(i * 2, top, mix(base, '#FFFFFF', 0.25));
  }
  if (soot > 0)
    for (let k = 0; k < 22; k++) {
      if (k / 22 > soot) continue;
      p.rect(2 + ((k * 37) % 56), 10 + ((k * 23) % 16), 5 + (k % 3), 3 + (k % 2), '#101014');
    }
  if (oil > 0) {
    const a = Math.min(1, oil);
    for (let x = 2; x < 58; x++) p.set(x, 12, mix(p.get(x, 12) >>> 24 ? '#4A4A52' : '#4A4A52', '#C8D0DC', 0.5 * a));
    for (let x = 10; x < 44; x++) p.set(x, 15, mix('#3A3A42', '#E8F0F8', 0.35 * a));
  }
  if (beta)
    for (const [ox, oy] of [[-18, 20], [-4, 24], [10, 21], [20, 25]] as const) {
      p.rect(30 + ox, oy, 2, 3, '#D8B858');
      p.set(30 + ox, oy, '#FFF0A0');
    }
}

/** 1本の 状態（2D の draw() と 同じ 決め方）。 */
function bladeState(s: Record<string, unknown>, h: number): [number, number, boolean] {
  const deki = (s.deki as (string | null)[]) ?? [null, null];
  const d = deki[h];
  if (d) return [0, 1, d === 'beta'];
  if (h !== Number(s.hon)) return [1, 0, false];
  const phase = String(s.phase);
  const soot = 1 - Number(s.fuku) / FUKU_N;
  const oil = phase === 'nobasu' ? 0.3 + (0.7 * Number(s.nobasu)) / NOBASU_N : phase === 'teki' && Number(s.drops) ? 0.15 : 0;
  return [soot, oil, Number(s.drops) >= Number(s.betaN) && phase === 'nobasu'];
}

interface Blade {
  p: PixelCanvas;
  c: HTMLCanvasElement;
  tex: THREE.Texture;
  key: string;
}

/** 床に 平らに 置く 板（パネルの 四角 px0..px1 × py0..py1 が 映る 所、高さ y）。 */
function flat(k: Kit, mat: THREE.Material, px0: number, py0: number, px1: number, py1: number, y: number): THREE.Mesh {
  const a = k.ground(px0, py1, y)!;
  const b = k.ground(px1, py0, y)!;
  const g = k.own(new THREE.PlaneGeometry(b.x - a.x, a.z - b.z));
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
  m.receiveShadow = true;
  m.castShadow = true;
  k.scene.add(m);
  return m;
}

function buildHera(k: Kit, h: number): Blade {
  const y = h === 0 ? 56 : 12;
  // the blade (painted again when its state changes)
  const p = new PixelCanvas(60, 36);
  const c = document.createElement('canvas');
  c.width = 60;
  c.height = 36;
  const tex = k.own(pixelTexture(c));
  const m = k.material(tex, { side: THREE.DoubleSide });
  flat(k, m, CX - 30, y, CX + 30, y + 36, 0.03);
  // the ferrule and the wooden handle (raised a little off the desk)
  const wood = pix('ab:handle', 16, 4, (q) => {
    q.fill('#8A6444');
    q.hline(0, 15, 0, '#A8825A');
    q.hline(0, 15, 3, '#6A4A30');
  });
  const steel = pix('ab:ferrule', 4, 4, (q) => {
    q.fill('#6A6A72');
    q.hline(0, 3, 0, '#9A9AA2');
  });
  const a = k.ground(CX + 36, y + 22, 0)!;
  const b = k.ground(CX + 76, y + 14, 0)!;
  const th = (a.z - b.z) * 0.9;
  k.box(a.x, b.x, 0.02, 0.02 + th, b.z, a.z, { top: wood, front: wood, left: wood, right: wood });
  const f0 = k.ground(CX + 28, y + 20, 0)!;
  const f1 = k.ground(CX + 37, y + 16, 0)!;
  k.box(f0.x, f1.x, 0.02, 0.02 + th * 0.7, f1.z, f0.z, { top: steel, front: steel, left: steel, right: steel });
  return { p, c, tex, key: '' };
}

/** 布（白い 木綿、ふく ときは すすが うつる）。 */
function ragImg(dirty: boolean): HTMLCanvasElement {
  return pix(`ab:rag${dirty}`, 20, 14, (q) => {
    q.fill('#E8E4D8');
    q.hline(0, 19, 0, '#FFFFFF');
    q.rect(2, 12, 16, 2, '#B8B4A8');
    for (let i = 0; i < 12; i++) q.set((i * 7) % 20, 2 + ((i * 5) % 10), '#D8D4C8');
    if (dirty) q.rect(4, 6, 8, 4, '#3A3A3E');
  });
}
/** 油さし（横から：緑の 缶、細い 口）。 */
function canImg(): HTMLCanvasElement {
  return pix('ab:can', 12, 20, (q) => {
    q.rect(1, 8, 10, 12, '#6A7A5A');
    q.vline(1, 8, 19, '#8A9A7A');
    q.vline(10, 8, 19, '#4A5A3A');
    q.rect(4, 3, 4, 5, '#8A9A7A');
    q.rect(5, 0, 2, 3, '#C8C8C0');
    q.hline(1, 10, 8, '#9AAA8A');
    q.outline('#2A3020');
  });
}

registerPanel3d('abura', {
  cam: { fov: 28, pitch: 58, pos: [0, 6.2, 0], far: 100, near: 0.1 },
  light: 'room',
  fog: null,
  shadow: { x: 0, z: -4, hw: 4, hd: 4 },
  focus: 0.55,
  tilt: 0.7,
  grade: () => null,
  build(k) {
    // the desk's top, a little lighter towards the top (the corridor's light)
    const a = k.ground(-20, H + 20, 0)!;
    const b = k.ground(W + 20, -20, 0)!;
    k.tiled(deskImg(), a.x - 1, b.x + 1, b.z - 1, a.z + 1, 0, 14);
    const lamp = new THREE.PointLight('#fff0d8', 3, 14, 1);
    const la = k.ground(W / 2, -10, 0)!;
    lamp.position.set(la.x, 3, la.z);
    k.scene.add(lamp);
    k.bag.blades = [buildHera(k, 0), buildHera(k, 1)];
    // the rag (two: clean and sooty) and the oil can, placed in update
    const u = k.pxAt(k.camera.position.distanceTo(k.ground(CX, 60, 0)!));
    const rag = k.stand(ragImg(false), new THREE.Vector3(0, 0, 0), { px: u, depth: 3 });
    const ragD = k.stand(ragImg(true), new THREE.Vector3(0, 0, 0), { px: u, depth: 3 });
    for (const r of [rag, ragD]) r.rotation.x = -Math.PI / 2;
    const can = k.stand(canImg(), new THREE.Vector3(0, 0, 0), { px: u * 1.1, depth: 8 });
    k.bag.rag = rag;
    k.bag.ragD = ragD;
    k.bag.can = can;
    k.bag.u = u;
  },
  update(k, _t, s) {
    const blades = k.bag.blades as Blade[];
    blades.forEach((b, h) => {
      const [soot, oil, beta] = bladeState(s, h);
      const key = `${soot.toFixed(3)}|${oil.toFixed(3)}|${beta}`;
      if (key === b.key) return;
      b.key = key;
      paintBlade(b.p, soot, oil, beta);
      const ctx = b.c.getContext('2d')!;
      ctx.clearRect(0, 0, 60, 36);
      ctx.drawImage(b.p.toCanvas(), 0, 0);
      b.tex.needsUpdate = true;
    });
    const hon = Number(s.hon);
    const cy = hon === 0 ? 56 : 12;
    const phase = String(s.phase);
    const rag = k.bag.rag as THREE.Mesh;
    const ragD = k.bag.ragD as THREE.Mesh;
    const can = k.bag.can as THREE.Mesh;
    const u = k.bag.u as number;
    const wiping = phase === 'fuku' || phase === 'nobasu';
    const dirty = phase === 'fuku' && Number(s.fuku) > 0;
    rag.visible = wiping && !dirty;
    ragD.visible = wiping && dirty;
    if (wiping) {
      // 2D：布は 刃の まん中から ±22 px（rag）、行 cy + 8 .. cy + 22
      // (lying flat: the picture's foot is its near edge; pushed up by its thickness)
      const at = k.ground(CX + Math.round(Number(s.rag) * 22), cy + 22, 0.06)!;
      for (const r of [rag, ragD]) r.position.set(at.x - 10 * u, 0.04 + 3 * u, at.z);
    }
    can.visible = phase === 'teki';
    if (can.visible) {
      const at = k.ground(CX - 8 + 5, cy - 8 + 12, 0)!;
      can.position.set(at.x - 6 * u * 1.1, 0, at.z);
    }
    k.shadowDirty = true;
  },
});

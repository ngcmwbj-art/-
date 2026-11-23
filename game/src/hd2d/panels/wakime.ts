// 大写し「脇芽は 朝に かく」（第2章 1号ハウス、events/ch2/wakime.ts WakimePanel：画面 いっぱい）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：夜の ビニールハウスの 中。古い 屋根の フィルム（継ぎ目、星が ぼんやり）、
// 誘引ひもを 吊る 針金、となりの 株（形だけ）、黒い マルチと 点滴の チューブ。前の 1株（主枝・葉・脇芽・花房）と
// 灯りの 円・指・輪・字は 2D の まま（株は 2D の 絵：灯りの 円の 中だけ 色が 見える 遊びを そのまま 残す）。
// うしろの ハウスは 3D：アーチの 骨と フィルム、奥へ 続く 畝と 株の 列、トマトの 灯り（ほんとうの 点の 光）が
// 前の 株の 高さ ly に あって、となりの 株を ほんのり 照らす。株を 次へ 送る とき（slide）は カメラが 横へ 動く。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { hGroundImg, noFog, pix } from './_kit_d';

const W = 384;
const H = 216;
/** 前の 株の 面（2D の 株の 絵が ここに ある つもり）。 */
const PLANT_Z = -4;
/** 夜の ハウス（フィルムごしの 空あかり、ほとんど 暗い）。 */
const LIGHT: PanelLight = { sun: '#6a70a8', sky: '#3a3a66', ground: '#0c0c14', fog: '#14132c', sunI: 0.25, hemiI: 0.7, el: 60, az: 170 };

/** となりの 株（形だけ：主枝と 左右の 葉。灯りが 当たると 緑）。v で 形を 変える。 */
function neighbourImg(v: number): HTMLCanvasElement {
  return pix(`wk:nb${v}`, 56, 120, (p) => {
    const rng = new Rng(900 + v);
    const cx = 28;
    for (let y = 2; y < 120; y++) {
      const x = cx + Math.round(2 * Math.sin((y + v * 13) / 17));
      p.set(x, y, '#3E6A2E');
      p.set(x + 1, y, '#2E5222');
    }
    for (let k = 0; k < 8; k++) {
      const y = 10 + k * 14 + Math.floor(rng.next() * 5);
      const side = (k + v) % 2 ? 1 : -1;
      const len = 14 + Math.floor(rng.next() * 9);
      for (let i = 0; i < len; i++) {
        const yy = y - Math.round(i * 0.3) + Math.round((i * i) / 40);
        const w = Math.round(3 * Math.sin((Math.PI * i) / len)) + 1;
        for (let j = -w; j <= w; j++) {
          const x = cx + side * i;
          p.set(x, yy + j, (i + j + k) % 5 === 0 ? '#5A8A3A' : j < 0 ? '#4A7A34' : '#355E28');
        }
      }
    }
    // a truss of small green fruit here and there
    if (v % 2 === 0) for (const [dx, dy] of [[4, 60], [7, 63], [3, 65]] as const) p.ellipse(cx + dx, dy, 2, 2, '#6A9A3A');
    p.outline('#1A2416');
  });
}

/** 屋根の フィルム（古い ビニール：継ぎ目と しわ、星が ぼんやり すける）。 */
function filmImg(): HTMLCanvasElement {
  return pix('wk:film', 64, 64, (p) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) p.set(x, y, (x * 7 + y * 13) % 17 === 0 ? '#2C2C52' : (x + y) % 2 ? '#1A1938' : '#1D1B3C');
    for (let y = 0; y < 64; y++) if ((y >> 1) % 7 !== 0) p.set(31, y, '#26244A');
    for (let x = 4; x < 28; x++) if (x % 3) p.set(x, 20 + ((x >> 3) & 1), '#26244A');
    for (const [x, y] of [[10, 8], [44, 40], [52, 12]] as const) {
      p.set(x, y, '#3A3A66');
      p.set(x + 1, y, '#2C2C52');
    }
  });
}

/** 黒い マルチ（ポリの つや、点滴の チューブ）。 */
function mulchImg(): HTMLCanvasElement {
  return pix('wk:mulch', 32, 32, (p) => {
    p.fill('#0C0C14');
    for (let i = 0; i < 40; i++) p.set((i * 13) % 32, (i * 7) % 32, '#14141E');
    p.hline(0, 31, 15, '#1A1A26');
    p.hline(0, 31, 16, '#161622');
    for (let x = 3; x < 32; x += 11) p.set(x, 15, '#2A2A3A');
  });
}
function pipeImg(): HTMLCanvasElement {
  return pix('wk:pipe', 4, 4, (p) => {
    p.fill('#4A4E62');
    p.hline(0, 3, 0, '#6A6E82');
  });
}
function stringImg(): HTMLCanvasElement {
  return pix('wk:string', 1, 4, (p) => p.fill('#8A8270'));
}

/** ハウスの アーチ（骨の 箱 と フィルムの 板）：x 幅 ±hw、軒の 高さ eave、棟 ridge。 */
function arch(k: Kit, z0: number, z1: number, hw: number, floor: number, eave: number, ridge: number): void {
  const n = 12;
  const pt = (i: number): [number, number] => {
    const a = Math.PI * (i / n);
    return [-Math.cos(a) * hw, floor + eave + Math.sin(a) * (ridge - eave)];
  };
  const film = filmImg();
  for (let i = 0; i < n; i++) {
    const [xa, ya] = pt(i);
    const [xb, yb] = pt(i + 1);
    k.quad(film, [xa, ya, z1], [xb, yb, z1], [xb, yb, z0], [xa, ya, z0]);
  }
  // the side walls (film down to the floor)
  k.quad(film, [-hw, floor, z0], [-hw, floor, z1], [-hw, floor + eave, z1], [-hw, floor + eave, z0]);
  k.quad(film, [hw, floor, z1], [hw, floor, z0], [hw, floor + eave, z0], [hw, floor + eave, z1]);
  // the ribs (pipes) every 1.6
  const pipe = pipeImg();
  for (let z = z1; z >= z0; z -= 1.6) {
    for (let i = 0; i < n; i++) {
      const [xa, ya] = pt(i);
      const [xb, yb] = pt(i + 1);
      const t = 0.04;
      k.quad(pipe, [xa, ya - t, z], [xb, yb - t, z], [xb, yb + t, z], [xa, ya + t, z]);
    }
    k.box(-hw, -hw + 0.06, floor, floor + eave, z - 0.03, z + 0.03, { front: pipe });
    k.box(hw - 0.06, hw, floor, floor + eave, z - 0.03, z + 0.03, { front: pipe });
  }
}

registerPanel3d('wakime', {
  cam: { fov: 30, pitch: 0, pos: [0, 0, 0], far: 200, near: 0.1 },
  light: LIGHT,
  fog: [5, 17],
  shadow: null,
  focus: 0.5,
  tilt: 0.8,
  grade: () => null,
  build(k) {
    // the plant's plane: 1 px of the panel = u there
    const u = k.pxAt(-PLANT_Z);
    k.bag.u = u;
    const floor = k.atDepth(W / 2, 208, PLANT_Z)!.y;
    const wire = k.atDepth(W / 2, 5, PLANT_Z)!.y;
    // the floor: the black mulch of the beds, the aisles between them (bare earth)
    k.tiled(hGroundImg('h_tilled', 64, 64), -14, 10, -18, 2, floor - 0.01, 16, { tint: '#6a6070' });
    const mulch = mulchImg();
    for (let r = 0; r < 6; r++) {
      const zc = PLANT_Z - r * 2.2;
      k.box(-14, 10, floor, floor + 0.05, zc - 0.45, zc + 0.45, { top: mulch, front: mulch });
    }
    // the house: arches overhead, the far end
    arch(k, -18, 2, 9, floor, 1.6, wire + 1.6 - floor + 0.8);
    k.quad(filmImg(), [-9, floor, -18], [9, floor, -18], [9, wire + 2.4, -18], [-9, wire + 2.4, -18]);
    // the wires the strings hang from (one over each row)
    const pipe = pipeImg();
    for (let r = 0; r < 6; r++) {
      const zc = PLANT_Z - r * 2.2;
      k.box(-14, 10, wire - 0.015, wire + 0.015, zc - 0.015, zc + 0.015, { front: pipe });
    }
    // the plants in the rows: the front row's neighbours near where the 2D has them (x 48 and 336), more rows
    // behind. A third of a slide apart: after a slide (W px) the row looks the same again.
    const rng = new Rng(4501);
    const step = (W * u) / 3;
    for (let r = 0; r < 6; r++) {
      const zc = PLANT_Z - r * 2.2 - 0.05;
      for (let i = -10; i <= 7; i++) {
        const x = (i + (r % 2 ? 0.5 : 0)) * step;
        // (the front one itself is the 2D plant, and so are the plants one slide away: every third slot)
        if (r === 0 && i % 3 === 0) continue;
        const img = neighbourImg(Math.floor(rng.next() * 4));
        const hgt = wire - floor;
        k.stand(img, new THREE.Vector3(x + (rng.next() - 0.5) * 0.1, floor, zc), { px: hgt / img.height, depth: 3, cast: false, flip: rng.next() < 0.5, tint: r === 0 ? '#5a6480' : '#6a7490' });
        // its string up to the wire
        k.quad(stringImg(), [x - 0.004, floor + hgt * 0.95, zc + 0.01], [x + 0.004, floor + hgt * 0.95, zc + 0.01], [x + 0.004, wire, zc + 0.01], [x - 0.004, wire, zc + 0.01]);
      }
    }
    // the lantern's light (moved in update to where the 2D lantern is)
    const lamp = new THREE.PointLight('#ffb070', 2.0, 3.6, 1.6);
    k.scene.add(lamp);
    k.bag.lamp = lamp;
    // stars through the film, far off (no fog)
    const stars = pix('wk:stars', 64, 16, (p) => {
      const r2 = new Rng(4071);
      for (let i = 0; i < 14; i++) {
        const x = Math.floor(r2.next() * 64);
        const y = Math.floor(r2.next() * 16);
        p.set(x, y, mix('#3A3A66', '#5A5A88', i % 3 ? 0 : 1));
      }
    });
    const sm = k.material(k.tex(stars), { unlit: true }) as THREE.MeshBasicMaterial;
    sm.transparent = true;
    sm.alphaTest = 0.01;
    const sg = k.own(new THREE.PlaneGeometry(40, 10));
    const sp = noFog(new THREE.Mesh(sg, sm));
    sp.position.set(0, wire + 8, -40);
    k.scene.add(sp);
  },
  update(k, _t, s) {
    const u = k.bag.u as number;
    // the slide to the next plant: the camera goes along the row (the 2D plant moves by slide px)
    k.camera.position.x = -Number(s.slide || 0) * u;
    k.camera.updateMatrixWorld();
    const lamp = k.bag.lamp as THREE.PointLight;
    const at = k.atDepth(Number(s.lx), Number(s.ly), PLANT_Z + 0.5);
    if (at) lamp.position.copy(at);
    lamp.intensity = 2.0 * Math.max(0, Math.min(1, Number(s.k)));
  },
});

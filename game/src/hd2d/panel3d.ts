// 大写しの 絵を HD-2D で 描く 共通の しくみ（2026-11-23 依頼主「ミニゲームの絵が雑すぎるから
// １２３章全てにあるこーいった所をHD -2Dにして」）。入口は ui/panel3d.ts（three なし）。
//
// ・絵ごとに 1つの 定義（registerPanel3d(id, def)、src/hd2d/panels/*.ts）：カメラ・光・
//   霧・ぼかしの 位置、build()（開いた とき 1回、立体を 組む）、update()（描く 前に 毎回、
//   状態や 時間で 動かす）。
// ・パネル（owner）ごとに 1つの Panel3D：シーン・カメラ・post.ts の 仕上げ（ブルーム・
//   ティルトシフト・フィールドの Grade・ビネット）。開いて いる 間だけ。描かれなく なって
//   数フレームで dispose（ジオメトリ・マテリアル・テクスチャ・仕上げの レンダーターゲット）。
// ・WebGL は この 絵たち 専用の 小さな レンダラー 1つ（フィールドの Hd2dView とは 別の
//   キャンバス：フィールドの 絵を こわさない）。描いた 絵は すぐ 2D の キャンバスに 写し、
//   engine/screen.ts の inlays で 画面の 解像度の まま 2D の 層の 下に 敷く。
// ・描き直すのは 状態（state の JSON）・大きさが 変わった とき と、animated の 絵の とき
//   （fps まで）だけ。解像度は 画面の 倍率まで、normal は 横 1280px、light は 横 640px まで。
//
// 部品（Kit）：フィールドの HD-2D と 同じ 作り方 ——
//   stand()  2D の 絵（PixelCanvas・小物の 絵・人物の 絵）を 足もとから 立て、塗った ドットを
//            奥へ 押し出す（solid.ts extrude：ボクセルの 見た目、縁の 色）。
//   box() / gable() / quad()  面ごとに 2D の 絵を 貼った 箱・切妻の 家・板。
//   tiled()  くり返しの 地面・海（ドットの まま：NearestFilter）。
//   sky()    背景の 空（帯の グラデーション、ドット）。
// 2D の 座標で 置く：ground(px, py, y) = パネルの px に 映る 高さ y の 地面の 点、
// toPanel(v) = 3D の 点の パネルの px。カメラは 正面寄り（回さない）なので、2D の 当たり
// （TouchPick）と 絵の 位置が ずれない。

import * as THREE from 'three';
import { game } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { registerDebug } from '../debug';
import { field } from '../world/field';
import type { Grade } from '../world/lighting';
import { setPanel3dImpl, type Panel3dDrawOpts } from '../ui/panel3d';
import { Post, TILT_FIELD, type Quality } from './post';
import { box as solidBox, extrude, Mask, ownUv, pixelTexture, PX, Quads, type Face, type V3 } from './solid';

// ---------------------------------------------------------------- 定義

/** 光（フィールドの view.ts と 同じ 色）。el = 太陽の 高さ（度）、az = 方位（度：0 = カメラの 後ろ、90 = 右、180 = 正面の 奥）。 */
export interface PanelLight {
  sun: string;
  sky: string;
  ground: string;
  fog: string;
  sunI: number;
  hemiI: number;
  el: number;
  az: number;
}

/** フィールドの 光（view.ts の NOON_* / DAWN_* / 夕方 と 同じ 色・強さ）。 */
export const PANEL_LIGHT = {
  /** 第3章の 昼（海ぞいの町 12:00）。 */
  noon: { sun: '#fffaf0', sky: '#d8e6ff', ground: '#d8ccb0', fog: '#dce8f2', sunI: 2.6, hemiI: 1.7, el: 58, az: 150 },
  /** 第1章の 夕方（17:00 の 低い 日）。 */
  eve: { sun: '#ffc890', sky: '#b8b0e8', ground: '#d89060', fog: '#e8b890', sunI: 2.6, hemiI: 1.7, el: 22, az: 250 },
  /** 夜明け（第3章の 最後の 朝）。 */
  dawn: { sun: '#ffe4d4', sky: '#c4d0f0', ground: '#c8bcb8', fog: '#d4d4e6', sunI: 2.2, hemiI: 1.7, el: 18, az: 110 },
  /** 部屋の 中（天井の 明かり：上から、影は 短く）。 */
  room: { sun: '#fff0dc', sky: '#f0e8dc', ground: '#b8a890', fog: '#3a3028', sunI: 1.6, hemiI: 2.0, el: 70, az: 20 },
  /** 夜（星見台：暗い 青、月の 光）。 */
  night: { sun: '#9fb4ff', sky: '#4a5890', ground: '#2a2a40', fog: '#1e2440', sunI: 0.7, hemiI: 1.4, el: 50, az: 200 },
} satisfies Record<string, PanelLight>;

export interface PanelCam {
  /** 縦の 画角（度）。HD-2D らしく 狭めに（フィールドは 26°）。 */
  fov: number;
  /** 下向きの 角度（度）。正面寄り（0〜20°）なら 2D の 置き場所と ずれにくい。 */
  pitch: number;
  /** カメラの 位置（絵の 単位：1 = フィールドの 1 タイル = 16px）。 */
  pos: V3;
  near?: number;
  far?: number;
}

export interface Panel3dDef {
  cam: PanelCam;
  light?: keyof typeof PANEL_LIGHT | PanelLight;
  /** 霧（近・遠、単位）。null = なし。既定 = 光の fog 色で [60, 400]。 */
  fog?: [number, number] | null;
  /** 影を 落とす 範囲（中心 x, z と 半分の 幅・奥行き、単位）。null = 影なし。 */
  shadow?: { x: number; z: number; hw: number; hd: number } | null;
  /** ティルトシフトの ピントの 行（パネルの 上 0 … 下 1）。既定 0.7。 */
  focus?: number;
  /** ぼかしの 強さ（post.ts TILT_FIELD = 1.4、0 = なし）。 */
  tilt?: number;
  /** 毎フレーム 描き直すか（波・動く 物）。状態で 決める なら 関数。 */
  animated?: boolean | ((state: Record<string, unknown>) => boolean);
  /** animated の ときの 描き直しの 上限（既定 30）。 */
  fps?: number;
  /** 色の 仕上げ：既定は 今の フィールドの Grade（同じ 色に なる）。 */
  grade?: () => Grade | null;
  /** 開いた とき 1回：立体を 組む。 */
  build(k: Kit, state: Record<string, unknown>): void;
  /** 描く 前に 毎回（t = パネルが 開いてからの ms）。 */
  update?(k: Kit, t: number, state: Record<string, unknown>): void;
}

const DEFS = new Map<string, Panel3dDef>();

/** 大写しの 絵を 登録する（src/hd2d/panels/*.ts）。 */
export function registerPanel3d(id: string, def: Panel3dDef): void {
  DEFS.set(id, def);
}

// ---------------------------------------------------------------- 部品

export interface StandOpts {
  /** 1 ドットの 大きさ（単位）。既定 PX（= 1/16：フィールドと 同じ）。 */
  px?: number;
  /** 押し出しの 深さ（ドット）。0 = 板。既定 3。 */
  depth?: number;
  /** 絵の 一部（行 r0..r1、列 c0..c1）。 */
  rows?: [number, number];
  cols?: [number, number];
  /** 光を 受けない（人物：フィールドの actors.ts と 同じ）。 */
  unlit?: boolean;
  /** 影を 落とす（既定 true）・受ける（既定 true）。 */
  cast?: boolean;
  receive?: boolean;
  /** 左右反転。 */
  flip?: boolean;
  /** 足もとの 位置：'foot' = 下の 真ん中（既定）、'left' = 下の 左。 */
  anchor?: 'foot' | 'left';
  /** 色を かける（遠くの 物を 少し 淡く など）。 */
  tint?: string;
  /** 光る（ブルームに 乗る）強さ。 */
  emissive?: number;
}

export interface BoxFaces {
  front?: HTMLCanvasElement;
  top?: HTMLCanvasElement;
  left?: HTMLCanvasElement;
  right?: HTMLCanvasElement;
  back?: HTMLCanvasElement;
}

/** 1つの 大写しの 3D：シーン・カメラ・部品。build() / update() に 渡る。 */
export class Kit {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  /** 絵の 大きさ（パネルの px）。 */
  readonly w: number;
  readonly h: number;
  /** 自由に 使える 入れ物（update で 動かす 物を ここに）。 */
  readonly bag: Record<string, unknown> = {};
  private readonly disposables = new Set<{ dispose(): void }>();
  private readonly texOf = new Map<HTMLCanvasElement, THREE.Texture>();
  private readonly geoOf = new Map<string, THREE.BufferGeometry>();
  /** box / gable / quad の 面：絵ごとに 1つの Quads（1 ドローコール）。 */
  private readonly quads = new Map<HTMLCanvasElement, { q: Quads; opts: { unlit?: boolean; cast?: boolean } }>();
  readonly quality: Quality;

  constructor(def: Panel3dDef, w: number, h: number, quality: Quality) {
    this.w = w;
    this.h = h;
    this.quality = quality;
    const c = def.cam;
    this.camera = new THREE.PerspectiveCamera(c.fov, w / h, c.near ?? 0.5, c.far ?? 3000);
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(...c.pos);
    this.camera.rotation.x = (-c.pitch * Math.PI) / 180;
    this.camera.updateMatrixWorld();
    this.camera.updateProjectionMatrix();
    const L: PanelLight = typeof def.light === 'object' ? def.light : PANEL_LIGHT[def.light ?? 'noon'];
    this.sun = new THREE.DirectionalLight(L.sun, L.sunI);
    this.hemi = new THREE.HemisphereLight(L.sky, L.ground, L.hemiI);
    const el = (L.el * Math.PI) / 180;
    const az = (L.az * Math.PI) / 180;
    const sh = def.shadow;
    const cx = sh?.x ?? 0;
    const cz = sh?.z ?? -20;
    this.sun.target.position.set(cx, 0, cz);
    this.sun.position.set(cx + Math.sin(az) * Math.cos(el) * 120, Math.sin(el) * 120, cz + Math.cos(az) * Math.cos(el) * 120);
    if (sh) {
      this.sun.castShadow = true;
      const n = quality === 'normal' ? 2048 : 1024;
      const s = this.sun.shadow;
      s.mapSize.set(n, n);
      s.bias = -0.0006;
      s.normalBias = 0.03;
      s.radius = quality === 'normal' ? 2 : 1;
      const sc = s.camera;
      const r = Math.max(sh.hw, sh.hd) * 1.2;
      sc.left = -r;
      sc.right = r;
      sc.top = r;
      sc.bottom = -r;
      sc.near = 1;
      sc.far = 400;
      sc.updateProjectionMatrix();
    }
    this.scene.add(this.sun, this.sun.target, this.hemi);
    const fog = def.fog === undefined ? [60, 400] : def.fog;
    if (fog) this.scene.fog = new THREE.Fog(L.fog, fog[0], fog[1]);
    this.scene.background = new THREE.Color(L.fog);
  }

  // ---- 2D の 座標 ⇄ 3D

  private ray(px: number, py: number): THREE.Vector3 {
    const v = new THREE.Vector3((px / this.w) * 2 - 1, 1 - (py / this.h) * 2, 0.5).unproject(this.camera);
    return v.sub(this.camera.position).normalize();
  }

  /** パネルの (px, py) に 映る、高さ y の 面の 点（見えない 向きなら null）。 */
  ground(px: number, py: number, y = 0): THREE.Vector3 | null {
    const d = this.ray(px, py);
    const t = (y - this.camera.position.y) / d.y;
    if (!(t > 0)) return null;
    return this.camera.position.clone().addScaledVector(d, t);
  }

  /** パネルの (px, py) に 映る、奥行き z の 面の 点。 */
  atDepth(px: number, py: number, z: number): THREE.Vector3 | null {
    const d = this.ray(px, py);
    const t = (z - this.camera.position.z) / d.z;
    if (!(t > 0)) return null;
    return this.camera.position.clone().addScaledVector(d, t);
  }

  /** 3D の 点 → パネルの px（カメラの 後ろなら null）。 */
  toPanel(v: THREE.Vector3): [number, number] | null {
    const p = v.clone().project(this.camera);
    if (p.z > 1) return null;
    return [((p.x + 1) / 2) * this.w, ((1 - p.y) / 2) * this.h];
  }

  /** 距離 d（カメラからの 奥行き）での パネル 1px の 大きさ（単位）。 */
  pxAt(d: number): number {
    return (2 * d * Math.tan((this.camera.fov * Math.PI) / 360)) / this.h;
  }

  // ---- 絵

  /** 絵を ドットの テクスチャに（同じ 絵は 1つ）。 */
  tex(c: HTMLCanvasElement, repeat = false): THREE.Texture {
    let t = this.texOf.get(c);
    if (!t) {
      t = pixelTexture(c);
      if (repeat) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
      }
      this.texOf.set(c, t);
      this.own(t);
    }
    return t;
  }

  /** 片づけに 入れる。 */
  own<T extends { dispose(): void }>(o: T): T {
    this.disposables.add(o);
    return o;
  }

  material(map: THREE.Texture | null, o: { unlit?: boolean; tint?: string; emissive?: number; side?: THREE.Side } = {}): THREE.Material {
    const color = new THREE.Color(o.tint ?? '#ffffff');
    const m = o.unlit
      ? new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, color, side: o.side ?? THREE.FrontSide })
      : new THREE.MeshLambertMaterial({
          map,
          alphaTest: 0.5,
          color,
          side: o.side ?? THREE.FrontSide,
          shadowSide: THREE.DoubleSide,
          emissive: o.emissive ? new THREE.Color('#ffffff') : undefined,
          emissiveMap: o.emissive ? map : null,
          emissiveIntensity: o.emissive ?? 0,
        });
    return this.own(m);
  }

  /**
   * 2D の 絵を 立てる：足もと `at`（3D）に、塗った ドットを `depth` ドット 奥へ 押し出して
   * （フィールドの 小物と 同じ ボクセルの 見た目）。カメラ（+Z）に 向く。
   */
  stand(img: HTMLCanvasElement, at: THREE.Vector3, o: StandOpts = {}): THREE.Mesh {
    const px = o.px ?? PX;
    const depth = o.depth ?? 3;
    const [r0, r1] = o.rows ?? [0, img.height];
    const [c0, c1] = o.cols ?? [0, img.width];
    const key = `${this.idOf(img)}|${r0},${r1},${c0},${c1}|${depth}`;
    let geo = this.geoOf.get(key);
    if (!geo) {
      const q = new Quads();
      const m = new Mask(img);
      // (extrude は 1 ドット = PX：ここでは 1 ドット = 1 単位で 組み、メッシュの scale で 大きさを 決める)
      extrude(q, m, c0, r0, c1, r1, { x0: 0, yTop: (r1 - r0) * PX, sy: PX, zf: 0 }, depth * PX, ownUv(img.width, img.height));
      geo = q.geometry();
      geo.scale(1 / PX, 1 / PX, 1 / PX);
      this.geoOf.set(key, geo);
      this.own(geo);
    }
    const mesh = new THREE.Mesh(geo, this.material(this.tex(img), { unlit: o.unlit, tint: o.tint, emissive: o.emissive, side: THREE.DoubleSide }));
    const w = c1 - c0;
    mesh.scale.set(o.flip ? -px : px, px, px);
    mesh.position.set(at.x - (o.anchor === 'left' ? 0 : o.flip ? -w / 2 : w / 2) * px, at.y, at.z);
    mesh.castShadow = o.cast ?? true;
    mesh.receiveShadow = o.receive ?? !o.unlit;
    this.scene.add(mesh);
    return mesh;
  }

  private readonly ids = new WeakMap<HTMLCanvasElement, number>();
  private nextId = 1;
  private idOf(c: HTMLCanvasElement): number {
    let n = this.ids.get(c);
    if (!n) this.ids.set(c, (n = this.nextId++));
    return n;
  }

  private quadsFor(c: HTMLCanvasElement, opts: { unlit?: boolean; cast?: boolean } = {}): Quads {
    let e = this.quads.get(c);
    if (!e) this.quads.set(c, (e = { q: new Quads(), opts }));
    return e.q;
  }

  /** 絵 1枚 全体の 面。 */
  private face(c: HTMLCanvasElement): Face {
    return { uv: ownUv(c.width, c.height), c0: 0, r0: 0, c1: c.width, r1: c.height };
  }

  /** 箱（x0..x1 × y0..y1 × z0..z1、z0 が 奥）。面ごとに 絵 1枚（絵ごとに まとめて 1 ドローコール）。 */
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, f: BoxFaces): void {
    for (const k of ['front', 'top', 'left', 'right', 'back'] as const) {
      const c = f[k];
      if (!c) continue;
      solidBox(this.quadsFor(c), x0, x1, y0, y1, z0, z1, { [k]: this.face(c) });
    }
  }

  /** 4 隅（a, b, c, d：前から 見て 反時計回り、a が 左下）に 絵を 貼る 板。 */
  quad(c: HTMLCanvasElement, a: V3, b: V3, cc: V3, d: V3, uv?: [number, number, number, number]): void {
    const n = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).cross(new THREE.Vector3(...d).sub(new THREE.Vector3(...a))).normalize();
    const [u0, v0, u1, v1] = uv ?? [0, 0, 1, 1];
    this.quadsFor(c).add(a, b, cc, d, [n.x, n.y, n.z], u0, v0, u1, v1);
  }

  /**
   * 切妻の 家（棟は x に 沿う）：前（+Z）の 壁 `wall`、両わきの 妻 `side`、屋根 `roof`（絵の 上が
   * 奥の 軒、`ridge` の 行で 棟、下が 前の 軒：bkit.roofKawara などの 上から 見た 屋根の 絵の まま）。
   */
  gable(o: { x0: number; x1: number; z0: number; z1: number; y: number; wallH: number; roofH: number; wall: HTMLCanvasElement; side?: HTMLCanvasElement; roof: HTMLCanvasElement; ridge?: number; eave?: number }): void {
    const { x0, x1, z0, z1, y, wallH, roofH } = o;
    const yt = y + wallH;
    const eave = o.eave ?? 0.25;
    const zm = (z0 + z1) / 2;
    this.box(x0, x1, y, yt, z0, z1, { front: o.wall, left: o.side ?? o.wall, right: o.side ?? o.wall });
    // 妻の 三角（side の 絵の 上の 真ん中を 塗った 色で）
    const sc = o.side ?? o.wall;
    for (const [x, s] of [[x0, -1], [x1, 1]] as const) {
      const q = this.quadsFor(sc);
      const u = 0.5;
      // 三角 = 2つの 頂点が 重なる 四角
      if (s < 0) q.add([x, yt, z0], [x, yt, z1], [x, yt + roofH, zm], [x, yt + roofH, zm], [-1, 0, 0], u - 0.2, 0.5, u + 0.2, 0.9);
      else q.add([x, yt, z1], [x, yt, z0], [x, yt + roofH, zm], [x, yt + roofH, zm], [1, 0, 0], u - 0.2, 0.5, u + 0.2, 0.9);
    }
    const r = o.ridge ?? 0.45;
    const xa = x0 - eave;
    const xb = x1 + eave;
    const zb = z0 - eave;
    const zf = z1 + eave;
    const yb = yt - (roofH * eave) / ((z1 - z0) / 2);
    const rq = this.quadsFor(o.roof);
    // 前の 面（行 r..1）、奥の 面（行 0..r）
    const nf = new THREE.Vector3(0, zf - zm, roofH).normalize();
    rq.add([xa, yb, zf], [xb, yb, zf], [xb, yt + roofH, zm], [xa, yt + roofH, zm], [nf.x, nf.y, nf.z], 0, 0, 1, 1 - r);
    rq.add([xb, yb, zb], [xa, yb, zb], [xa, yt + roofH, zm], [xb, yt + roofH, zm], [0, nf.y, -nf.z], 1, 1, 0, 1 - r);
  }

  /** くり返しの 面（地面・海）：高さ y、x0..x1 × z0..z1、1 単位に `texels` ドット。 */
  tiled(c: HTMLCanvasElement, x0: number, x1: number, z0: number, z1: number, y: number, texels = 16, o: { unlit?: boolean; tint?: string } = {}): THREE.Mesh {
    const t = this.tex(c, true).clone();
    t.needsUpdate = true;
    t.repeat.set(((x1 - x0) * texels) / c.width, ((z1 - z0) * texels) / c.height);
    this.own(t);
    const g = this.own(new THREE.PlaneGeometry(x1 - x0, z1 - z0));
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, this.material(t, o));
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  /** 背景の 空（絵の 縦の 帯が パネルの 上から 下へ）。 */
  sky(c: HTMLCanvasElement): void {
    this.scene.background = this.tex(c);
  }

  /** build() の あと：box / gable / quad の 面を メッシュに（絵ごとに 1つ）。 */
  finish(): void {
    for (const [c, { q, opts }] of this.quads) {
      if (q.empty) continue;
      const g = this.own(q.geometry());
      const m = new THREE.Mesh(g, this.material(this.tex(c), { unlit: opts.unlit, side: THREE.DoubleSide }));
      m.castShadow = opts.cast ?? true;
      m.receiveShadow = true;
      this.scene.add(m);
    }
    this.quads.clear();
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables.clear();
    this.sun.shadow.map?.dispose();
    this.scene.clear();
  }
}

// ---------------------------------------------------------------- レンダラー（大写し 専用、1つ）

let renderer: THREE.WebGLRenderer | null = null;
let failed = false;

function getRenderer(): THREE.WebGLRenderer | null {
  if (renderer || failed) return renderer;
  try {
    const cv = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  } catch (e) {
    console.warn('[panel3d] WebGL unavailable, close-ups stay 2D', e);
    failed = true;
    renderer = null;
  }
  return renderer;
}

/** 何も 無い ときの 仕上げ（色を 変えない）。 */
const NEUTRAL: Partial<Grade> = { mul: [255, 255, 255], desat: 0, glare: [255, 255, 255], glareA: 0, glareW: 0.45, glareRight: 0, topDark: [0, 0, 0], topA: 0 };

// ---------------------------------------------------------------- 1つの 大写し

class Panel3D {
  readonly kit: Kit;
  private post: Post | null = null;
  private readonly out: HTMLCanvasElement;
  private size: [number, number] = [0, 0];
  private key = '';
  private lastRender = -1;
  private readonly t0 = performance.now();
  lastFrame = 0;
  /** パネルの 絵の 四角（ゲームの px）が 今 どこに あるか（point() 用）。 */
  readonly def: Panel3dDef;

  constructor(def: Panel3dDef, w: number, h: number, quality: Quality, state: Record<string, unknown>) {
    this.def = def;
    this.kit = new Kit(def, w, h, quality);
    def.build(this.kit, state);
    this.kit.finish();
    this.out = document.createElement('canvas');
  }

  /** 描き直しが 要るなら 描いて、写しの キャンバスを 返す。 */
  picture(r: THREE.WebGLRenderer, rw: number, rh: number, state: Record<string, unknown>): HTMLCanvasElement {
    const key = JSON.stringify(state);
    const now = performance.now();
    const anim = typeof this.def.animated === 'function' ? this.def.animated(state) : !!this.def.animated;
    const due = anim && now - this.lastRender >= 1000 / (this.def.fps ?? 30) - 2;
    if (this.lastRender >= 0 && this.size[0] === rw && this.size[1] === rh && key === this.key && !due) return this.out;
    const k = this.kit;
    if (!this.post || this.size[0] !== rw || this.size[1] !== rh) {
      if (!this.post) this.post = new Post(r, k.scene, k.camera, k.quality, rw, rh);
      else this.post.setSize(rw, rh);
      this.size = [rw, rh];
      this.out.width = rw;
      this.out.height = rh;
    }
    r.setSize(rw, rh, false);
    this.def.update?.(k, now - this.t0, state);
    const g = (this.def.grade ?? (() => field()?.grade ?? null))() ?? (NEUTRAL as Grade);
    this.post.setGrade(g, 0, 0, 1 - (this.def.focus ?? 0.7));
    this.post.setBrighten(0);
    this.post.setMemory(0, [1, 1, 1], [1, 1, 1]);
    this.post.setTilt(this.def.tilt ?? TILT_FIELD);
    r.shadowMap.needsUpdate = true;
    this.post.render();
    const ctx = this.out.getContext('2d')!;
    ctx.drawImage(r.domElement, 0, 0);
    this.key = key;
    this.lastRender = now;
    return this.out;
  }

  dispose(): void {
    this.post?.dispose();
    this.post = null;
    this.kit.dispose();
  }
}

// ---------------------------------------------------------------- 入口（ui/panel3d.ts へ）

const live = new Map<object, { id: string; p: Panel3D }>();
let qualityOf: () => Quality = () => 'normal';
let sweeping = false;

/** 描かれなく なった 大写しを 片づける（数フレーム 見て）。 */
function sweep(): void {
  for (const [o, e] of live) {
    if (game.drawn - e.p.lastFrame > 3) {
      e.p.dispose();
      live.delete(o);
    }
  }
  if (live.size) requestAnimationFrame(sweep);
  else sweeping = false;
}

function draw(g: Gfx, owner: object, id: string, x: number, y: number, w: number, h: number, o: Panel3dDrawOpts): boolean {
  const def = DEFS.get(id);
  const r = getRenderer();
  if (!def || !r) return false;
  const state = o.state ?? {};
  let e = live.get(owner);
  if (e && (e.id !== id || e.p.kit.w !== w || e.p.kit.h !== h)) {
    e.p.dispose();
    live.delete(owner);
    e = undefined;
  }
  const quality = qualityOf();
  if (!e) {
    e = { id, p: new Panel3D(def, w, h, quality, state) };
    live.set(owner, e);
    if (!sweeping) {
      sweeping = true;
      requestAnimationFrame(sweep);
    }
  }
  e.p.lastFrame = game.drawn;
  // 解像度：画面の 倍率まで（normal 横 1280px・light 横 640px まで）
  const s = game.screen.scale;
  const cap = quality === 'normal' ? 1280 : 640;
  let k = Math.min(s, cap / w);
  if (quality === 'light') k = Math.min(k, Math.max(1, s / 2));
  const rw = Math.max(w, Math.round(w * k));
  const rh = Math.max(h, Math.round(h * k));
  const pic = e.p.picture(r, rw, rh, state);
  // 2D の 層：この 四角を 透明に 抜き（あとに 描く 物は 上に 乗る）、下に 3D の 絵を 敷く
  const ctx = g.ctx;
  const m = ctx.getTransform();
  const alpha = (o.alpha ?? 1) * ctx.globalAlpha;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  game.screen.inlays.push({ img: pic, x: m.a * x + m.e, y: m.d * y + m.f, w: w * m.a, h: h * m.d, alpha });
  return true;
}

/** hd2d/index.ts が 呼ぶ：HD-2D が 使える ときだけ 大写しを 3D に（質は フィールドと 同じ）。 */
export function installPanel3d(on: () => boolean, quality: () => Quality): void {
  qualityOf = quality;
  setPanel3dImpl({
    draw: (g, owner, id, x, y, w, h, o) => on() && draw(g, owner, id, x, y, w, h, o),
    point: (owner, x, y, z) => live.get(owner)?.p.kit.toPanel(new THREE.Vector3(x, y, z)) ?? null,
    dispose: (owner) => {
      live.get(owner)?.p.dispose();
      live.delete(owner);
    },
    has: (id) => DEFS.has(id),
  });
}

/** QA：開いて いる 大写しの 3D（絵の id、描いた 大きさ、ドローコール）。 */
registerDebug('panel3dStats', () => {
  const r = renderer;
  return {
    live: [...live.values()].map((e) => ({ id: e.id, w: e.p.kit.w, h: e.p.kit.h })),
    ids: [...DEFS.keys()],
    calls: r?.info.render.calls ?? null,
    triangles: r?.info.render.triangles ?? null,
    textures: r?.info.memory.textures ?? null,
    geometries: r?.info.memory.geometries ?? null,
    failed,
  };
});

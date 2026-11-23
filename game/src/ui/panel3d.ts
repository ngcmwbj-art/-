// 大写し（Widget.closeup の パネル）の 絵の 部分を HD-2D で 描く ための 入口（2026-11-23 依頼主
// 「ミニゲームの絵が雑すぎるから１２３章全てにあるこーいった所をHD -2Dにして」）。
//
// three.js を 読み込まない 小さな 入口：パネル（src/events/**）は ここだけを 使う。絵の 中身
// （立体・光・仕上げ）は src/hd2d/panel3d.ts と src/hd2d/panels/*.ts に あり、HD-2D の 層
// （main.ts が タイトルの あとで 読む）が setPanel3dImpl() で ここに つなぐ。
// HD-2D が 使えない とき（?hd2d=0・WebGL なし・まだ 読み込み中）は drawPanel3d() が false を
// 返すので、パネルは 今の 2D の 絵を そのまま 描く：
//
//   g.clip(SX, oy, CW, CH, () => {
//     if (!drawPanel3d(g, this, 'miharashi', SX, oy, CW, CH, { alpha: a, state: { nami } })) this.drawScene(g, oy);
//   });
//
// 3D の 絵は 画面の 解像度で 2D の 層の 下に 敷かれ（engine/screen.ts inlays）、2D の 層の その
// 四角は 透明に 抜かれる。だから drawPanel3d() の あとに 描いた 物（カーソル・札・字・テープ・
// 会話の 窓）は 3D の 絵の 上に 乗る。
//
// さわって 選ぶ 大写し（TouchPick の 当たりは パネルの 2D の 座標）：3D の 絵は パネルの 2D の
// 座標で 物を 置ける（hd2d/panel3d.ts Kit.ground / Kit.stand）。逆に 3D の 点が パネルの どこに
// 出るかは panel3dPoint() で 聞ける（絵が まだ 無ければ null）。
//
// 片づけ：パネルが 描かなく なって 数フレームで GPU の 物は 捨てられる（閉じれば 自然に 消える）。
// すぐ 捨てたい ときは disposePanel3d(owner)。

import type { Gfx } from '../engine/gfx';

export interface Panel3dDrawOpts {
  /** パネルの 透明度（開く・閉じる ときの フェード）。 */
  alpha?: number;
  /**
   * 絵の 状態（段階・選んだ ます など）。JSON に して 変わった ときだけ 描き直す（毎フレーム
   * 描き直すのは 絵の 定義が animated の とき だけ）。
   */
  state?: Record<string, unknown>;
}

export interface Panel3dImpl {
  draw(g: Gfx, owner: object, id: string, x: number, y: number, w: number, h: number, o: Panel3dDrawOpts): boolean;
  point(owner: object, x: number, y: number, z: number): [number, number] | null;
  dispose(owner: object): void;
  has(id: string): boolean;
}

let impl: Panel3dImpl | null = null;

/** src/hd2d/panel3d.ts が つなぐ（HD-2D の 層が 読み込まれた とき）。 */
export function setPanel3dImpl(i: Panel3dImpl | null): void {
  impl = i;
}

/**
 * パネルの 絵の 四角（ゲームの px：x, y, w, h）に 絵 `id`（hd2d/panels の registerPanel3d）を
 * HD-2D で 描く。描けたら true（2D の 層の その 四角は 透明に なる）、描けない ときは false
 * （2D の 絵を 描く）。毎フレーム 呼ぶ（呼ばれなく なると 片づく）。
 */
export function drawPanel3d(g: Gfx, owner: object, id: string, x: number, y: number, w: number, h: number, o: Panel3dDrawOpts = {}): boolean {
  if (!impl || !impl.has(id)) return false;
  try {
    return impl.draw(g, owner, id, x, y, w, h, o);
  } catch (e) {
    console.error('[panel3d] draw failed, 2D from now on', e);
    impl = null;
    return false;
  }
}

/** 3D の 点（絵の 単位）が パネルの どこ（パネルの 左上からの px）に 出るか。絵が まだ 無ければ null。 */
export function panel3dPoint(owner: object, x: number, y: number, z: number): [number, number] | null {
  return impl?.point(owner, x, y, z) ?? null;
}

/** すぐ 片づける（ふつうは 要らない：描かなく なれば 片づく）。 */
export function disposePanel3d(owner: object): void {
  impl?.dispose(owner);
}

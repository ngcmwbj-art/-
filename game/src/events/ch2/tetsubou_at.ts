// 大写し「鉄棒」の HD-2D（hd2d/panels/tetsubou.ts）で 場面を 引いて 見せる ときの 置き場所の 写し
// （2026-11-23：人物を フィールドと 同じくらいの 大きさに）。three.js を 読まない：パネル（events/ch2/tetsubou.ts）と
// 絵の 定義の 両方が 使う。パネルの 絵の 左上からの px → 引いた 絵の 中の px。

/** 引く 倍率（2D の 2倍の 人物 → 1.2倍：フィールドの 人物と ほぼ 同じ）。 */
export const TETSU_S = 0.6;
/** 引く 中心（パネルの px）：棒の まん中の 少し 左、地面。 */
const AX = 120;
const AY = 96;

export function tetsuAt(x: number, y: number): [number, number] {
  return [AX + (x - AX) * TETSU_S, AY + (y - AY) * TETSU_S];
}

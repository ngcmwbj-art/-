// 手前の物を透かす（改善会議 2026-10-20 の 4、docs/kaizen/2026-10-20.md）。
//
// 人（主人公・仲間・話せる人）が建物・木・屋根などの うしろに入って隠れたときだけ、その手前の物を
// すかす。前からある「主人公と仲間の前に立つ切り抜きの物（CutoutView）を 0.25 まで」（2D の x-ray）に、
//   ・話せる人（npc の人。通りすがり・乗り物は除く）の前でも すかす（こちらは半分 0.5）
//   ・建物（BuildingView：正面・屋根・横の壁の まるごと）と、木の葉・ひさしの絵（fg の部品）も、
//     人の前に来たら半分 すかす（前からの「下に入ったら薄くなる」部品は、そのまま）
// を足した。チカチカしないように：すかし始めは 人の 12% が隠れたとき、もどすのは 6% を切ってから
// （行ったり来たりしない）、もどす前に 0.35 秒 待つ、変わる速さは 0.3 秒（前は 0.15 秒）。
// 重さ：調べるのは カメラの近くの物だけ（town.ts NEAR）、人は主人公の近くの 10人まで、
// 1つの物に 画面への投影 2〜4点。マテリアルの切りかえ（transparent）は 変わるときだけ。
//
// 重なり順：切り抜き（1枚の絵）は 前と同じ depthWrite なし。建物は 自分の面どうしの順が
// 乱れないように depthWrite のまま半透明（うしろの人は 不透明の組で先に描かれている）。

import * as THREE from 'three';

/** 前に立つ物の四角（単位）：x0, x1, 下, 上, 正面の z、（奥行きのある物）奥の z。 */
export type SeeRect = [number, number, number, number, number, number?];

/** 0：だれも隠していない、1：話せる人を隠している、2：主人公か仲間を隠している。 */
export type Hidden = 0 | 1 | 2;

/** その四角が 人を隠しているか（was：いま すけているか。もどすときは 少し ゆるく見る）。 */
export type Hides = (r: SeeRect, was: boolean) => Hidden;

/** すける強さ：主人公・仲間の前（前からの切り抜きの x-ray）と、それ以外。 */
export const SEE_PARTY = 0.25;
export const SEE_HALF = 0.5;
/** 1フレーム（16.7ms）で変わる量：0.3 秒で 0 → 1。 */
const STEP = 16.7 / 300;
/** もどす前に待つ（ms）。 */
const HOLD = 350;

/** 1つの物の すけぐあい（毎フレーム step）。 */
export class SeeThrough {
  v = 1;
  private hold = 0;
  private tgt = 1;

  /** want：今の目標（1 = すけない）。返り値：今の すけぐあい。 */
  step(want: number): number {
    if (want < 1) {
      this.tgt = want;
      this.hold = HOLD;
    } else if (this.hold > 0) this.hold -= 16.7;
    else this.tgt = 1;
    this.v += Math.sign(this.tgt - this.v) * Math.min(Math.abs(this.tgt - this.v), STEP);
    return this.v;
  }

  get on(): boolean {
    return this.v < 0.999 || this.tgt < 1;
  }

  reset(): void {
    this.v = 1;
    this.tgt = 1;
    this.hold = 0;
  }
}

/**
 * マテリアルの すけぐあい。`keepDepth`：すけても depthWrite のまま（建物：自分の面どうしの順）。
 * 影だけの面（colorWrite なし）は さわらない。
 */
export function setSee(mats: THREE.Material[], v: number, keepDepth = false): void {
  const tr = v < 0.999;
  for (const m of mats) {
    if (m.colorWrite === false) continue;
    if (m.transparent !== tr) {
      m.transparent = tr;
      m.depthWrite = keepDepth || !tr;
      (m as THREE.MeshLambertMaterial).alphaTest = tr ? 0.02 : (m.userData.alphaTest0 ?? 0.5);
      m.needsUpdate = true;
    }
    m.opacity = v;
  }
}

/** 物の組の マテリアル（影だけの物を除く）。元の alphaTest を覚えておく。 */
export function seeMaterials(o: THREE.Object3D): THREE.Material[] {
  const out = new Set<THREE.Material>();
  o.traverse((c) => {
    if (!(c instanceof THREE.Mesh)) return;
    for (const m of Array.isArray(c.material) ? c.material : [c.material]) {
      if (m.colorWrite === false) continue;
      if (m.userData.alphaTest0 === undefined) m.userData.alphaTest0 = m.alphaTest;
      out.add(m);
    }
  });
  return [...out];
}

/** 形の 箱 → SeeRect（正面は 箱の南の z、奥は北の z）。 */
export function rectOfBox(b: THREE.Box3): SeeRect {
  return [b.min.x, b.max.x, Math.max(0, b.min.y), b.max.y, b.max.z, b.min.z];
}

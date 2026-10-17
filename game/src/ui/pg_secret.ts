// クリア後のシークレットエンディング「40年ぶりの 休み」の、画面の側の読み口（05_postgame 10.4）。
// 台本・記録を書くのは E（src/events/pg_secret.ts：SECRET_KEY、flag_pg_secret 1 入口・2 約束・3 見た、
// 'evt_pg_secret_replay'）。1枚絵は W が registerC3Cut('cut_pg_secret') で置き、E の台本が名前で呼ぶ。
// ここは タイトル・セーブのカード・みました帳 が読むだけの小さな口（events を import しない）。
//
//   secretSeen()           この端末で見た（localStorage hanamaru-secret-v1。新しく始めても残る）
//   secretReplayFn()       やり残しのページの合計の行から もう一度 見る流れ（E の 'evt_pg_secret_replay'）

import type { Co } from '../engine/co';
import { getScript } from '../world/scripts';

/** E の events/pg_secret.ts SECRET_KEY と同じ。 */
const SECRET_KEY = 'hanamaru-secret-v1';

/** シークレットエンディングを この端末で 見た（記録だけ。セーブ枠とは別）。 */
export function secretSeen(): boolean {
  try {
    return !!localStorage.getItem(SECRET_KEY);
  } catch {
    return false;
  }
}

/** もう一度 見る流れ（メニューを閉じたあと、フィールドの台本として走る）。台本が無い版は null。 */
export function secretReplayFn(): (() => Co) | null {
  const fn = getScript('evt_pg_secret_replay');
  if (!fn) return null;
  return () => fn({ source: 'menu', map: '', runDefault: function* () {} } as never) as Co;
}

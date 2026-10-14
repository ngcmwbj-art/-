// クリア後のシークレットエンディング「40年ぶりの 休み」の画面の口（05_postgame 10章）。
// 台本（E）と絵（W）と画面（U）をつなぐ所。しくみの状態は flag_pg_secret（E が書く）。
//
//   secretSeen()                         見た記録（localStorage hanamaru-secret-v1。新しく始めても残る）
//   markSecretSeen()                     見た（E の台本の最後で。flag_pg_secret 3 と いっしょに）
//   registerPgStill('pg_secret_park', () => art)   W：1枚絵（StillArt）を名前で置く
//   yield* playPgStill('pg_secret_park', { ms })   E：名前で出す（無ければ false。フィールドで代わりに）
//   const s = yield* openPgStill('pg_secret_park'); …台詞…; yield* s.close()
//   registerSecretReplay(() => evtSecret())        E：やり残しのページの合計の行（決定）から、もう一度見る
//
// 第3章の registerC3Cut（events/ch3/cuts.ts）と同じ形。1枚絵の出し入れは cut_c3.ts の openC3Still。

import type { Co } from '../engine/co';
import { openC3Still, playC3Still, type StillArt } from './cut_c3';

// ---------------------------------------------------------------- 見た記録（10.4）

export const SECRET_KEY = 'hanamaru-secret-v1';

/** シークレットエンディングを この端末で 見た（記録だけ。セーブ枠とは別）。 */
export function secretSeen(): boolean {
  try {
    return !!localStorage.getItem(SECRET_KEY);
  } catch {
    return false;
  }
}

/** 見た印を書く（10.4。日付だけ）。 */
export function markSecretSeen(): void {
  try {
    localStorage.setItem(SECRET_KEY, JSON.stringify({ seen: 1, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- 1枚絵（10.2）

const stills = new Map<string, () => StillArt>();

/** W：1枚絵を名前で置く（作るのは最初に出すとき）。 */
export function registerPgStill(id: string, make: () => StillArt): void {
  stills.set(id, make);
}

export function hasPgStill(id: string): boolean {
  return stills.has(id);
}

/** E：名前で出して、`ms` 見せて、しまう。置かれていなければ false（台本がフィールドで代わりに見せる）。 */
export function* playPgStill(id: string, o: { ms?: number; flash?: boolean; fade?: number; out?: number } = {}): Co<boolean> {
  const make = stills.get(id);
  if (!make) return false;
  yield* playC3Still(make(), o);
  return true;
}

/** E：名前で開いて、台詞のあいだ出しておく（無ければ null）。 */
export function* openPgStill(id: string, o: { flash?: boolean; fade?: number } = {}): Co<{ close(ms?: number): Co } | null> {
  const make = stills.get(id);
  if (!make) return null;
  return yield* openC3Still(make(), o);
}

// ---------------------------------------------------------------- もう一度見る（10.4）

let replay: (() => Co) | null = null;

/** E：もう一度見る流れ（メニューを閉じたあと、フィールドの台本として走る）。 */
export function registerSecretReplay(fn: () => Co): void {
  replay = fn;
}

/** やり残しのページから もう一度見られるか（見た・流れが置かれている・クリア後の記録の 3）。 */
export function secretReplayFn(): (() => Co) | null {
  return replay;
}

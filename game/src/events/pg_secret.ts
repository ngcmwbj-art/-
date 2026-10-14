// シークレットエンディング「40年ぶりの 休み」（05_postgame 10章。E の第3期）。
//
//   入口：やり残しの 44行と ふしぎ 32 が そろう（yarinokoshi.ts yrAllDone）→ flag_pg_secret 1。
//         グソっ君が いっしょで 操作できるとき、1回「……おっちゃんに、見せに 行こか。」
//   ツガオ便のツガオに話す（events/postgame.ts pgTruck が先に pgSecretAtTruck を聞く）→ 2 →
//   次の日を回る（W のカット cut_pg_ichinichi。無ければ フィールドで撮る：今の町と その時刻の光）→
//   夕方 16:50 の夕鳴公園の時計塔の下 → チャイム 8音 → 焼きそば → 『休』に はなまる → 1枚絵
//   cut_pg_secret（W。無ければ 1ページ）→ 17:10 で操作がもどる（3、localStorage hanamaru-secret-v1）。
//   見たあと：ツガオとグソっ君が 次に話したとき 1ページずつ。
//   もう一度（U のやり残しのページの 合計の行から）：pgSecretReplay() — 見終わったら、元の場所・時刻に もどす。
//
// 絵の名前（W）：cut_pg_ichinichi（1日を回るカット、o.ms 約 60000）、cut_pg_secret（1枚絵）。
// 寝ているツガオは この台本が 公園のベンチ (15,11) に 置く（pg_secret_tsugao、pose 'sleep'）。
//
// QA（開発サーバーだけ）：__game.cmd.pgSecret('open'|'go'|'replay'|'reset')

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { flag, setFlag, state, type Dir } from '../game/state';
import { registerDebug } from '../debug';
import { despawn, registerScript, spawn } from '../world/api';
import { getScript, type ScriptCtx } from '../world/scripts';
import { mapIds } from '../world/maps';
import { field, type FieldScene } from '../world/field';
import { registerWorldFx } from '../world/fx';
import { pgAdvance, pgDay, pgMin, pgOn, pgSetMin } from '../world/postgame';
import { fieldCurtain } from '../ui/hud';
import { playChimeMotif, stopBgm } from '../audio';
import { yrAllDone } from '../data/text/yarinokoshi';
import * as T from '../data/text/pg_secret';
import { se } from './ch2/compat';
import { F } from './lib';
import { say3 } from './ch3/common';
import { jumpMap } from './ch3/prologue';
import { hasC3Cut, playC3Cut } from './ch3/cuts';

/** 見た記録（新しく始めても残る。05 10.4）。 */
export const SECRET_KEY = 'hanamaru-secret-v1';

export function secretSeen(): boolean {
  try {
    return !!localStorage.getItem(SECRET_KEY);
  } catch {
    return false;
  }
}

function knWith(): boolean {
  const f = field();
  return flag('flag_pg_kn') > 0 && !flag('flag_follower_hidden') && !!f?.follower?.visible;
}

// ---------------------------------------------------------------- 0 入口

registerWorldFx({
  map: '',
  update(f: FieldScene) {
    if (!pgOn()) return;
    if (!flag('flag_pg_secret')) {
      // （数えるのは 重くない：44行のフラグと 32 の ふしぎ）
      if (yrAllDone()) setFlag('flag_pg_secret', 1);
      return;
    }
    if (flag('flag_pg_secret') !== 1 || flag('flag_pg_secret_open') || !knWith()) return;
    if (!f.controllable || game.scripts.busy) return;
    setFlag('flag_pg_secret_open', 1);
    f.runScriptId('evt_pg_secret_open', 'pg');
  },
});
registerScript('evt_pg_secret_open', function* (): Co {
  yield* say3(T.SEC_OPEN);
});

// ---------------------------------------------------------------- 1 ツガオに話す

/**
 * ツガオ便のツガオに話したとき（events/postgame.ts pgTruck の頭）。true = この台本が話した
 * （ツガオ便の行き先は聞かない）。
 */
export function* pgSecretAtTruck(): Co<boolean> {
  if (!pgOn()) return false;
  const s = flag('flag_pg_secret');
  if (s === 1) {
    if (!knWith()) {
      yield* say3(T.SEC_TSUGAO_NO_KN);
      return false;
    }
    yield* say3(T.SEC_TSUGAO);
    setFlag('flag_pg_secret', 2);
    yield* runSecret(false);
    return true;
  }
  if (s === 2) {
    // （とちゅうで 読みこみ直した：次の日から もう一度）
    yield* runSecret(false);
    return true;
  }
  if (s === 3 && !flag('flag_pg_secret_after_t')) {
    setFlag('flag_pg_secret_after_t', 1);
    yield* say3(T.SEC_AFTER_TSUGAO);
  }
  return false;
}

// ---------------------------------------------------------------- 2〜7

interface Shot {
  map: string;
  x: number;
  y: number;
  dir: Dir;
  /** ゲームの分。 */
  min: number;
  text: string;
}

/** 1日を回る（10.2 #2）：夜明け前の星見台・朝の夕鳴町・昼の港・旧水族館の入口。 */
const DAY: Shot[] = [
  { map: 'map_hoshimidai', x: 41, y: 44, dir: 'up', min: 4 * 60 + 30, text: T.SEC_DAY_HOSHI },
  { map: 'map_town', x: 27, y: 23, dir: 'up', min: 7 * 60, text: T.SEC_DAY_YUNARI },
  { map: 'map_umizoi', x: 21, y: 17, dir: 'left', min: 12 * 60, text: T.SEC_DAY_UMI },
  { map: 'map_c3_aq_iriguchi', x: 7, y: 9, dir: 'up', min: 15 * 60, text: T.SEC_DAY_AQ },
];

/** 公園の時計塔の下（10.2 #3）。ベンチは (15,11)。 */
const PARK = { map: 'map_town', x: 15, y: 13, dir: 'up' as Dir, bench: [15, 11] as [number, number] };
const TSUGAO_ID = 'pg_secret_tsugao';

function goTo(map: string, x: number, y: number, dir: Dir): void {
  jumpMap(map, x, y, dir);
  const f = F();
  f.syncFollower(true);
  f.pgSnap();
  f.snapCamera();
}

/** その日の その時刻へ（前に もどらない：越えるときは 次の日）。 */
function timeTo(min: number): void {
  const d = (min - pgMin() + 1440) % 1440;
  if (d > 0) pgAdvance(d);
}

function* runSecret(replay: boolean): Co {
  const f = F();
  const back = { map: f.map.id, x: f.player.tileX, y: f.player.tileY, dir: f.player.dir, min: pgMin(), day: pgDay(), kn: flag('flag_pg_kn') };
  // グソっ君は いっしょ（隊列）
  setFlag('flag_pg_kn', 1);
  setFlag('flag_follower_hidden', 0);
  setFlag('flag_hud_hidden', 1);
  yield* fieldCurtain(1, 800);
  // ---- 2 次の日（夜明け前へ。日は必ず 1つ 進める）
  if (pgMin() < 4 * 60 + 30) pgAdvance(1440);
  timeTo(DAY[0].min);
  if (hasC3Cut('cut_pg_ichinichi')) {
    yield* playC3Cut('cut_pg_ichinichi', { ms: 60000 });
  } else {
    for (const s of DAY) {
      timeTo(s.min);
      goTo(s.map, s.x, s.y, s.dir);
      // ツガオは 休み：転回場に 立つ ツガオは 出さない
      despawn('pg_tsugao_hoshi');
      yield* fieldCurtain(0, 700);
      yield 600;
      yield* say3(s.text);
      yield 300;
      yield* fieldCurtain(1, 700);
    }
  }
  // ---- 3 夕方の公園
  timeTo(16 * 60 + 50);
  goTo(PARK.map, PARK.x, PARK.y, PARK.dir);
  stopBgm(1.5);
  despawn(TSUGAO_ID);
  const t = spawn(TSUGAO_ID, PARK.bench[0], PARK.bench[1], { sprite: 'npc_tsugao', dir: 'down', pose: 'sleep' });
  t.data.scripted = true;
  yield* fieldCurtain(0, 900);
  yield 800;
  yield* say3(T.SEC_PARK_A);
  yield* say3(T.SEC_PARK_NEGOTO);
  yield 600;
  // ---- 4 迎えに 来たで
  yield* say3(T.SEC_PARK_MUKAE);
  yield 600;
  t.pose = null;
  t.hop(1, 120);
  yield* say3(T.SEC_PARK_OKIRU);
  // ---- 5 17:00 チャイム 8音、焼きそば
  timeTo(17 * 60);
  yield 300;
  yield playChimeMotif({ notes: 8 });
  yield 500;
  yield* say3(T.SEC_PARK_YAKISOBA);
  // ---- 6 『休』に はなまる
  yield* say3(T.SEC_PARK_HANKO);
  se('se_stamp', { vol: 0.6 });
  yield 700;
  yield* say3(T.SEC_PARK_YOKU);
  yield 600;
  // 1枚絵（W）。『おわり』の判は 押さない
  if (!(yield* playC3Cut('cut_pg_secret', { ms: 6000 }))) yield* say3(T.SEC_STILL_NARR);
  // ---- 7 17:10
  timeTo(17 * 60 + 10);
  setFlag('flag_pg_secret', 3);
  try {
    localStorage.setItem(SECRET_KEY, JSON.stringify({ day: pgDay() }));
  } catch {
    /* ignore */
  }
  despawn(TSUGAO_ID);
  setFlag('flag_hud_hidden', 0);
  if (replay) {
    // もう一度 見ただけ：元の場所・時刻・日に もどす
    yield* fieldCurtain(1, 500);
    setFlag('flag_pg_day', back.day);
    pgSetMin(back.min);
    setFlag('flag_pg_kn', back.kn);
    setFlag('flag_follower_hidden', back.kn ? 0 : 1);
    goTo(back.map, back.x, back.y, back.dir);
  }
  F().applyAudio(true);
  yield* fieldCurtain(0, 700);
}

/** U のやり残しのページ（合計の行）から：もう一度 見る。 */
export function* pgSecretReplay(): Co {
  if (!pgOn() || flag('flag_pg_secret') < 3) return;
  yield* runSecret(true);
}
registerScript('evt_pg_secret_replay', function* (): Co {
  yield* pgSecretReplay();
});

// ---------------------------------------------------------------- 見たあとの グソっ君（隊列）

for (const m of mapIds()) {
  const before = getScript('kanenari_' + m);
  registerScript('kanenari_' + m, function* (ctx: ScriptCtx): Co {
    if (pgOn() && flag('flag_pg_secret') === 3 && !flag('flag_pg_secret_after_k')) {
      setFlag('flag_pg_secret_after_k', 1);
      yield* say3(T.SEC_AFTER_KN);
      return;
    }
    if (before) yield* before(ctx);
    else yield* ctx.runDefault();
  });
}

// ---------------------------------------------------------------- QA

if (import.meta.env.DEV)
  registerDebug('pgSecret', (step?: string) => {
    const f = field();
    if (step === 'reset') {
      for (const k of ['flag_pg_secret', 'flag_pg_secret_open', 'flag_pg_secret_after_t', 'flag_pg_secret_after_k']) setFlag(k, 0);
      return 'reset';
    }
    if (step === 'open') setFlag('flag_pg_secret', 1);
    if (step === 'go' && f) {
      setFlag('flag_pg_secret', 1);
      setFlag('flag_pg_kn', 1);
      setFlag('flag_follower_hidden', 0);
      f.syncFollower(true);
      f.runScriptId('evt_pg_secret_go', 'qa');
    }
    if (step === 'replay' && f) f.runScriptId('evt_pg_secret_replay', 'qa');
    return { secret: flag('flag_pg_secret'), seen: secretSeen(), allDone: yrAllDone(), day: pgDay(), min: pgMin(), items: state.inventory.length };
  });
registerScript('evt_pg_secret_go', function* (): Co {
  yield* pgSecretAtTruck();
});

// 第3章のクリア（60_ch3_story 1.4・10.30）：evt_ch3_ending の「おわり」のあと。
//
//   - flag_ch3_clear = 1。第3章の達成数（みました帳 ③：ふしぎ /10、あいて /7、ツッコミ）を
//     別のキー hanamaru-clear-ch3-v1 に。よぶで来た人の数（flag_ch3_yobu_n）もいっしょに
//     （タイトルのカードの最後の行：60 10.30）。
//   - セーブ枠に第3章のクリアデータ：map_town 銀座、焼きそばのたかしの前（朝 5:10、
//     flag_ch3_stage 4、flag_c3_end_light 2）。グソっ君はたかしの店で働いている（隊列に
//     いない：flag_follower_hidden）。HP・朱肉は全回復。
//
// clearRecordCh3() はタイトルが読む（ないときは null）。

import { flag, saveGame, setFlag, state } from '../game/state';
import { getEnemy } from '../data/battle';
import type { ClearRecord } from './flow';

export const CLEAR_CH3_KEY = 'hanamaru-clear-ch3-v1';

/** 第3章の記録（タイトルのカード）。yobu：よぶで来た人の数。 */
export interface ClearRecordCh3 extends ClearRecord {
  yobu: number;
}

/** みました帳 ③ のあいて（60 6.0 の通常5・中ボス2）。 */
export const BOOK3_ENEMIES = ['enemy_nefuda', 'enemy_hoshisugi', 'enemy_asobitarin', 'enemy_yokodori', 'enemy_junro', 'enemy_okawarinabe', 'enemy_nariosame'];
/** ツッコミを数える相手（あいて＋ボス）。 */
const TSUKKOMI3_ENEMIES = [...BOOK3_ENEMIES, 'boss_tsugao_1', 'boss_hirosuke', 'boss_pokosha', 'boss_tsugao'];

function fushigiCh3Count(): number {
  let n = 0;
  for (let i = 1; i <= 10; i++) if (flag(`flag_fushigi_ch3_${String(i).padStart(2, '0')}`)) n++;
  return n;
}

function tsukkomiCh3(): { seen: number; total: number } {
  let total = 0;
  for (const id of TSUKKOMI3_ENEMIES) total += getEnemy(id)?.tsukkomi?.length ?? 0;
  let seen = 0;
  for (const k of Object.keys(state.flags)) {
    if (!state.flags[k]) continue;
    const m = /^flag_tsukkomi_(.+)_(\d+)$/.exec(k);
    if (m && TSUKKOMI3_ENEMIES.includes(m[1]) && Number(m[2]) <= (getEnemy(m[1])?.tsukkomi?.length ?? 0)) seen++;
  }
  return { seen, total };
}

/** みました帳 ③ の数（ふしぎ /10、あいて /7、ツッコミ）。 */
export function bookCountsCh3(): { fushigi: number; aite: number; tsukkomi: number; tsukkomiTotal: number } {
  const t = tsukkomiCh3();
  return {
    fushigi: fushigiCh3Count(),
    aite: BOOK3_ENEMIES.filter((id) => flag('flag_book_' + id)).length,
    tsukkomi: t.seen,
    tsukkomiTotal: t.total,
  };
}

export function clearRecordCh3(): ClearRecordCh3 | null {
  try {
    const raw = localStorage.getItem(CLEAR_CH3_KEY);
    if (raw) return JSON.parse(raw) as ClearRecordCh3;
  } catch {
    /* ignore */
  }
  return null;
}

/** 第3章を この端末で 終えた（記録か、セーブ枠）。 */
export function chapter3Cleared(): boolean {
  return !!clearRecordCh3() || !!flag('flag_ch3_clear');
}

/** 「おわり」のあと：記録とクリアデータ（60 1.4）。 */
export function markClearCh3(): ClearRecordCh3 {
  setFlag('flag_ch3_clear', 1);
  const c = bookCountsCh3();
  const rec: ClearRecordCh3 = { ...c, yobu: flag('flag_ch3_yobu_n') };
  try {
    localStorage.setItem(CLEAR_CH3_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
  setFlag('flag_ch3_stage', 4);
  setFlag('flag_c3_end_light', 2);
  setFlag('flag_hud_hidden', 0);
  setFlag('flag_bgm_hold', 0);
  setFlag('flag_c3_end_goza', 0);
  setFlag('flag_c3_end_tripod', 0);
  // グソっ君 works at たかしの店 now: not in the line (talk to him there)
  setFlag('flag_follower_hidden', 1);
  state.map = 'map_town';
  state.x = 27;
  state.y = 24;
  state.dir = 'up';
  for (const m of state.party) {
    m.hp = m.maxHp;
    m.mp = m.maxMp;
    m.status = {};
  }
  saveGame();
  return rec;
}

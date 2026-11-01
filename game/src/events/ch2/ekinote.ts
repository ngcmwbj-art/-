// 駅ノートの 前の ページ（げむきか10/1の4、依頼主は「そのまま」採用。02_ch2_index #78、50 8.1）。
//
//   ふしぎ① fushigi_ch2_01（星見台駅の 待合の 駅ノート (18,41)）を 押したあと、調べると
//   〔押したあと〕の 文に「前の ページを めくる｜やめておく」。めくるたびに 古いほうへ
//   1つずつ（7月 → 5月 → 1月1日 → 3月24日 → いちばん はじめの ページ）。5つ 見たら、
//   ノートは ひとりでに しゅんの ページへ もどる（調べるたびに、また いちばん 新しい
//   ページから）。グソっ君は 7月（沢の上に 行った 人だけ）と 1月1日に 1回ずつ。
//
//   ★2026-10-01 依頼主「駅ノートが 見つからなかった」（02 #80）：待合室の 屋根の 下で 見えなかった。
//   ノートは 黄色い 表紙と ひもの 鉛筆で 大きく（hoshi_station.ts）、待合室の 入口から 表紙が 見え、
//   入口の 横の 壁に 貼り紙『駅ノート あります』（obj_hoshi_ekinote_hari (17,43)）。駅に 着いて
//   はじめて 動けるように なったとき、グソっ君が 吹き出しで ひとこと（EKINOTE_FLIP、1回）。
//
// ふしぎ①の 押すまでの 流れ・数・報酬は fushigi.ts の まま（その スクリプトを 包む）。
//
// QA：__game.cmd.ekinote('note' | 'sawa' | 'reset')、jump('ch2:ekinote')。

import type { Co } from '../../engine/co';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getScript } from '../../world/scripts';
import { registerWorldFx } from '../../world/fx';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { sfx } from '../../audio';
import { HOSHI_FUSHIGI } from '../../data/text/hoshi_objects';
import { EKINOTE_BACK, EKINOTE_CHOICE, EKINOTE_FLIP, EKINOTE_PAGES } from '../../data/text/hoshi_ekinote';
import { showBubble } from '../../ui/bubble';
import { fushigiCh2Done, runFushigiCh2 } from './fushigi';

const ID = 'fushigi_ch2_01';

export const EKI = {
  /** 沢の上（map_hoshi_sawa）に 行った（7月の ページの グソっ君）。 */
  sawa: 'flag_ekinote_sawa',
  /** いちばん 古いほうへ 何ページ めくったか（0〜5。QA と 記録）。 */
  read: 'flag_ekinote_read',
  /** グソっ君の ひとこと（それぞれ 1回）。 */
  flipJul: 'flag_kanenari_flip_ekinote_jul',
  flipJan: 'flag_kanenari_flip_ekinote_jan',
  /** 駅で はじめて 動けたとき、グソっ君の 吹き出し（02 #80、1回）。 */
  flipArrive: 'flag_kanenari_flip_ekinote',
};

/** At the station, once he can move (just after evt_ch2_arrive): グソっ君 has seen the notebook in the waiting hut (a bubble). */
registerWorldFx({
  map: 'map_hoshimidai',
  update(f) {
    if (flag(EKI.flipArrive) || !flag('flag_ch2_arrived') || fushigiCh2Done(ID) || !f.controllable) return;
    const p = f.player;
    if (p.tileX < 14 || p.tileX > 33 || p.tileY < 40 || p.tileY > 45 || !kanenariHere()) return;
    setFlag(EKI.flipArrive, 1);
    showBubble('kanenari', EKINOTE_FLIP, 2600);
  },
});

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
}

/** 沢の上へ 入ったら（前から 行っていた セーブも、沢の フラグで）。 */
function wentSawa(): boolean {
  return flag(EKI.sawa) > 0 || flag('flag_ch2_sawa_seki') > 0 || flag('flag_ch2_wakimizu') > 0 || flag('flag_ch2_sawa_ishi_get') > 0;
}
registerWorldFx({
  map: 'map_hoshi_sawa',
  update() {
    if (!flag(EKI.sawa)) setFlag(EKI.sawa, 1);
  },
});

/**
 * 水辺の 図鑑（02 #81、events/ch2/yoburi.ts が 入れる）：7月の ページの あとに しゅんの 1行。
 * `choice` が 文を 返すとき（②の『みずべ』を ぜんぶ うめた あと）は、いつもの「めくる」の かわりに
 * その 選択（0 で `write`、どちらでも めくるのは そこまで）。`extra` は 書いた あとの 1ページ。
 */
export const ekinoteHooks: {
  choice: (() => string | null) | null;
  write: (() => Co) | null;
  extra: (() => string | null) | null;
  /** チクタク堂の ばらばら時計（02 #88、events/tokei7.ts が 入れる）：1月1日の ページの あとの グソっ君の 1行（第1章で 7つ目まで 終えた 人だけ）。 */
  jan: (() => string | null) | null;
} = {
  choice: null,
  write: null,
  extra: null,
  jan: null,
};

/** The old pages, from the newest of them back to the first; at the end the notebook turns itself back. */
function* oldPages(): Co {
  for (let i = 0; i < EKINOTE_PAGES.length; i++) {
    const p = EKINOTE_PAGES[i];
    const last = i === EKINOTE_PAGES.length - 1;
    sfx('se_page', { pitch: 1 - i * 0.03 });
    let text = p.text;
    const flipFlag = p.key === 'jul' ? EKI.flipJul : p.key === 'jan' ? EKI.flipJan : '';
    if (p.flip && flipFlag && !flag(flipFlag) && kanenariHere() && (p.key !== 'jul' || wentSawa())) {
      setFlag(flipFlag, 1);
      text += '\n' + p.flip;
    }
    if (flag(EKI.read) < i + 1) setFlag(EKI.read, i + 1);
    if (p.key === 'jan') {
      const jan = ekinoteHooks.jan?.();
      if (jan) text += '\n' + jan;
    }
    if (p.key === 'jul') {
      const extra = ekinoteHooks.extra?.();
      if (extra) text += '\n' + extra;
      const alt = ekinoteHooks.choice?.();
      if (alt && ekinoteHooks.write) {
        const w = yield* runMsg(text + '\n' + alt);
        if (w === 0) yield* ekinoteHooks.write();
        return;
      }
    }
    const r = yield* runMsg(last ? text : text + '\n' + EKINOTE_CHOICE);
    if (!last && r !== 0) return;
  }
  // 5つ 見たら、ノートは いちばん 新しい ページへ もどる
  yield 250;
  sfx('se_page', { pitch: 1.1, vol: 0.6 });
  yield 120;
  sfx('se_page', { pitch: 1.2, vol: 0.5 });
  yield* runMsg(EKINOTE_BACK);
}

{
  const orig = getScript(ID);
  registerScript(ID, function* (ctx): Co {
    if (!fushigiCh2Done(ID)) {
      if (orig) yield* orig(ctx);
      else yield* runFushigiCh2(ID);
      return;
    }
    // 〔押したあと〕の 文の あとに「前の ページを めくる｜やめておく」
    sfx('se_examine');
    const r = yield* runMsg(HOSHI_FUSHIGI[ID].after + '\n' + EKINOTE_CHOICE);
    if (r === 0) yield* oldPages();
  });
}

// ---------------------------------------------------------------- QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.ekinote(step = 'note')
 *   'note'   ふしぎ①は 押してある：駅の 待合の 駅ノートの 前 (18,42) 北向き（調べると〔押したあと〕→ めくる）
 *   'sawa'   'note' に 加えて 沢の上へ 行った ことに（7月の ページで グソっ君）
 *   'reset'  この 案の フラグを もどす
 */
registerDebug('ekinote', (step = 'note') => {
  if (step === 'reset') {
    for (const f of Object.values(EKI)) setFlag(f, 0);
    return 'ekinote: reset';
  }
  cmd().jump?.('ch2:ekinote', true);
  if (step === 'sawa') setFlag(EKI.sawa, 1);
  return `ekinote: examine the notebook (Z)${step === 'sawa' ? ', the stream visited' : ''}`;
});

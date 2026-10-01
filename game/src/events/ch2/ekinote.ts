// 駅ノートの 前の ページ（げむきか10/1の4、依頼主は「そのまま」採用。02_ch2_index #78、50 8.1）。
//
//   ふしぎ① fushigi_ch2_01（星見台駅の 待合の 駅ノート (18,41)）を 押したあと、調べると
//   〔押したあと〕の 文に「前の ページを めくる｜やめておく」。めくるたびに 古いほうへ
//   1つずつ（7月 → 5月 → 1月1日 → 3月24日 → いちばん はじめの ページ）。5つ 見たら、
//   ノートは ひとりでに しゅんの ページへ もどる（調べるたびに、また いちばん 新しい
//   ページから）。グソっ君は 7月（沢の上に 行った 人だけ）と 1月1日に 1回ずつ。
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
import { EKINOTE_BACK, EKINOTE_CHOICE, EKINOTE_PAGES } from '../../data/text/hoshi_ekinote';
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
};

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

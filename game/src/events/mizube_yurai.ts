// 水辺の 図鑑：かくし「おぴぃの 由来」（02_ch2_index #81、10_narrative 6.1〔yurai〕・6.25〔yurai〕）。
// ①の『みずべ』を ぜんぶ うめたら、台所の 母が あだ名の 由来を 話す（mizube.ts が 母の 台本を
// 包む）→ そのあと おぴぃ（対岸でも 堰でも）が 水辺帳を 見せて、しゅんの『みずべ』の いちばん
// うしろに 書く → 朱肉+2、①の 表紙に ザリガニの シール → つりえさ屋の 呼びりんに 1ページ。

import type { Co } from '../engine/co';
import { flag, setFlag, state } from '../game/state';
import { msg } from '../world/api';
import { sfx } from '../audio';
import { YURAI } from '../data/text/mizube';

export const YF = {
  /** 母が 由来を 話した。 */
  mom: 'flag_mizube_yurai_mom',
  /** おぴぃが 書きこんだ（表紙の シール）。 */
  done: 'flag_mizube_yurai_done',
} as const;

/** おぴぃ：母に 聞いた あとの 1回。言ったら true。 */
export function* yuraiAtOpi(): Co<boolean> {
  if (!flag(YF.mom) || flag(YF.done) || flag('flag_stage') > 2) return false;
  yield* msg(YURAI.opi);
  setFlag(YF.done, 1);
  const m = state.party.find((x) => x.id === 'minato');
  if (m) m.mp = Math.min(m.maxMp, m.mp + 2);
  sfx('se_item');
  yield* msg(YURAI.reward);
  return true;
}

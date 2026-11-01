// 大写しの 遊び（改善会議 2026-10-25 の 1・4、ui/closeup.ts）：
//   se_howto      はじめの カード（やりかた）が 出た：紙を 1枚 置く「ぱさ」と 鉛筆の 小さな「チョン」
//   se_closeup_yame もどるで やめた：紙を そっと 閉じる「ぱふ」。
// やめたのは 失敗では ないので、失敗の 音（下がる 音・ブッ）に しない：同じ 高さの 柔らかい 2音
// （E5・E5 の 小さい ほう）と 紙の 音だけ。メニューを 閉じる「ぱふ」より 軽く、短く。

import { se } from './recipe';

const UI = 'UI・メニュー';

se('se_howto', {
  label: '大写しの やりかたカード（ぱさ）',
  group: UI,
  max: 1,
  layers: ['noise env=4/90/0/40 dur=80 v=.06 flt=BP1800→3600q0.8', 'p25 f=1568 env=1/22/0/12 dur=18 v=.05 flt=LP5200 at=90'],
});
se('se_closeup_yame', {
  label: '大写しを もどるで やめた（ぱふ）',
  group: UI,
  max: 1,
  layers: ['noise env=2/60/0/30 dur=50 v=.06 flt=BP2400→1600q0.9', 'sine f=659 env=1/45/0/25 dur=30 v=.07 at=30', 'sine f=659 env=1/40/0/25 dur=25 v=.04 at=105'],
});

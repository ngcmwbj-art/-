// 寄り道が 始まった（改善会議 2026-10-24 の4）：木の 短い 2音「こ・こん」。始まった とき 1回だけ
// （どの 寄り道かは audio/yorimichi.ts の 表）。
//
// ほかの 知らせと 聞き分けられるように：
//   se_fushigi（ふしぎの 知らせ）  sine 1175 → 1568 の 澄んだ 2音（あと 110ms）
//   se_glint（ふしぎの きらり）    sine 3136→4186 の 高い 光
//   se_emote（会話の「！」）       p25 988→1976 の 跳ね上がり
// これは 木の 打つ 音（拍子木・ウッドブロック）：低めの G5・C6、打った 瞬間に 少し 下がる 音程と、
// 木の「こっ」の 帯の 雑音。始まりの 1ページ目の 声や「！」と 重ならないよう 160ms 遅らせて 鳴らし、2音目は
// その 130ms あと。音量は 知らせと 同じくらい 小さく、残響も 短い。

import { se } from './recipe';

const TALK = '会話・エモート・知らせ';
const knock = (f: string, f2: number, at: number, v: number) => [
  `sine f=${f}/22 env=0/95/0/30 dur=14 v=${v} rev=.12 at=${at}`,
  `tri f=${f2} env=0/20/0/8 dur=6 v=${(v * 0.25).toFixed(3)} at=${at}`,
  `noise env=0/9/0/4 dur=5 v=${(v * 0.4).toFixed(3)} flt=BP2300q3 at=${at}`,
];

se('se_yorimichi', {
  label: '寄り道が 始まった（木の 2音「こ・こん」）',
  group: TALK,
  max: 1,
  layers: [...knock('784→720', 1568, 160, 0.26), ...knock('1047→960', 2094, 290, 0.28)],
});

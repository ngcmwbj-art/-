// 第1章のツガオ便 (2026-09-28 依頼主の指示; 10_narrative 6.21). The olive kei
// truck of chapter 2 in 夕鳴町: ツガオ has brought 星見台's vegetables to the
// town for years and knows Shun by name. On the surface he is everyone's old
// man — a warm, rough 「おう！」 (the calm, polite voice belongs to the room of
// cut 7 only). Nothing of まだまだ団 is said here; what links the two is his
// catchphrase, the olive cap, the yellow crates and his way with 「まだ」.
// Every page: at most 3 lines of 336 px (__game.cmd.textcheck2 checks these too).

import type { TalkTable } from '../../world/types';

/** evt_tsugao_hello: the first step out of the house (stage 0, once). */
export const TSUGAO_HELLO = `@npc_tsugao
おう！ しゅん！{w=300}
おつかいか？{w=300}えらいな！
/
おれは 野菜を 運んだ 帰りよ。
{w=300}気ぃ つけて 行けよ！`;

/**
 * ツガオ at the wheel (npc_tsugao_ch1). Stage 0: parked by the police box
 * (s0_1 → s0_2 → s0_3, the last repeats). Stages 1–2: asleep in his nightcap
 * (s1_1 once, then s1_2).
 */
export const TSUGAO_TALK: TalkTable = {
  s0_1: `@npc_tsugao
おう、しゅん！ また 会ったな。
{w=300}ここで、ひと休みよ。
/
星見台の 野菜をな、銀座の
酒屋の 店先に 置いて もらってんだ。
{w=300}うまいぞ！`,
  s0_2: `@npc_tsugao
星見台は、山の 上の 村よ。
{w=300}トマトが、よう できる。
/
帰ったら、ひと眠りだ。{w=300}
……つがおちゃん 寝る〜♪`,
  s0_3: `@npc_tsugao
5時の チャイムが 鳴るまでに、
帰るんだぞ。{w=300}
母ちゃんが 待ってるからな！`,
  s1_1: `@narr
ツガオが、運転席で 寝ている。
水玉の ナイトキャップを かぶって。
{w=300}……寝言を 言った。
@npc_tsugao
……まだ……{w=300}
まだ、夕方じゃ ねえ……。`,
  s1_2: `@narr
ツガオは、とても よく 寝ている。
{w=300}時計が 止まっても、
おかまいなしだ。`,
};

/** obj_hoshimi_yasai: ツガオ便's crate at the sake shop's front (stage keys). */
export const HOSHIMI_YASAI: Record<string, string> = {
  s0: `@narr
木箱に『星見台の やさい』。{w=300}
すみに 小さく『ツガオ便』。
トマトが、つやつや している。`,
  's1-2': `@narr
『星見台の やさい』。{w=300}
トマトに ついた 水の つぶが、
落ちないまま 光っている。`,
};

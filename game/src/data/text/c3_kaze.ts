// 日じゃ なくて、風（げむきか 10-31 の 案3、2026-10-31 依頼主の 採用。03_ch3_index）。第3章の クリア前、段階2（12:01）。
// S13 の あと（flag_ch3_got_gochisou）から S14 の 前まで（flag_ch3_truck_trap が 立ったら 起きない）。
//
//   段階1 の 前ぶれ：干し台を 調べた あと 1回（地の文「風が、ない」・グソっ君）。
//   1 また 言い合い（干物屋の 2人。いつもの〔c2〕の あと、もう 1回 話すと〔kaze〕。ホシミに「！」）
//   2 3つの 所（どの 順でも）：① 路地の 日なた (21,12)、② 路地の 奥の 日かげ (23,11)、③ 路地の 出口の 角 (23,16)。
//     ①②では 干し網が ぴくりとも しない。③では 港からの 風で ゆれる（となりの 物干しの 手ぬぐいも）。
//   3 風で 干す（③で）→ 4 店先へ もどって「さわって みて」→ みやげ → ごほうび
//
// 調べた 事に 合わせて 案から 直した 所（出典は $SP/handoff/himono_progress.md）：
//   ・「日だけ 当たって、干物が 板に なった」は 出典が 見つからないので 言わない。言うのは「干物は、風が ないと
//     乾きが おそい」（風が 強いほど 乾くのが 速い・干物屋の 職人の「少し 風の ある 晴れの 日が 干物日和」）まで。
//     〔c1〕の「板みたいに なっている」は 今の まま（わけは 言わない）。
//   ・「日なた」も「日かげ」も 半分 当たり：干物屋は 天日でも 干す、家で 作るなら 直射日光の 当たらない 所。
//   ・干すのは 本当は 半日（5〜6時間）かかるので、③の 網は「夕方まで 風に まかせる」。さわって みるのは
//     〔c2〕の「ちょうど ええの」（表面が べたつかなく なったら できあがり）。
//   ・12:01 には 食堂かもめの のれんは しまってある（S13、ナミエが 持つ）。ゆれて 見える 物は、路地の 角の
//     物干しの 手ぬぐい・洗濯ばさみに した（グソっ君の「あっちの 洗濯物、ゆれとるで」）。
//   ・② は 案の 軒下 (16,16) から、路地の 奥 (23,11) へ。店先は ③と 同じく 港通りに 面して いて、風が 来ない
//     わけが 立たないので、①② とも 家と 家の あいだの 路地（風が ぬけない）に そろえた。
// 決まり：地の文・名札に「さん」なし。天丼の「干しすぎ！」「干したりない！」は 使わない。時刻の 数字は 出さない。

// ================================================================ 段階1 の 前ぶれ（干し台）

/** 干し台の 今の 文の あと（段階1、1回）。 */
export const KZ_MAE = `@narr
日は 当たっている。{w=300}
……風が、ない。
@npc_kanenari
止まっとるけえな。
洗濯物も、のれんも。`;

// ================================================================ 1 また 言い合い〔kaze〕

export const KZ_A = `@narr
{name:npc_c3_himono_tsuma}が、塩水から
アジを 上げた。
@npc_c3_himono_otto
つぎは、日なたじゃ！
@npc_c3_himono_tsuma
つぎは、日かげよ！
@npc_kanenari
……12時1分に
なっても、それか。
@npc_c3_himono_tsuma
ねえ、{w=300}
いちばん ええ 所に
つるして きて。
@sys
『干し網』を
あずかった。
@npc_c3_himono_otto
かぎは 3つ。{w=300}
路地の 日なたと、奥と、
出口の 角じゃ。`;

/** かくし：段階1 で 干し台の 前ぶれを 見ている（1 の あと、1回）。 */
export const KZ_MITA = `@npc_kanenari
さっき、風 なかったで。
@npc_c3_himono_tsuma
……あら、よう 見とる。`;

/** 始まった あと、まだ ③に つるして いない とき。 */
export const KZ_MADA = `@npc_c3_himono_otto
日なたじゃ。
@npc_c3_himono_tsuma
日かげよ。
@npc_kanenari
……まだ やっとる。`;

// ================================================================ 2 3つの 所

export const KZ_KAGI = `@narr
干し網を つるす かぎ。`;

/** ① 路地の 日なた。 */
export const KZ_HINATA = `@narr
日が、かんかん。{w=300}
……干し網は、
ぴくりとも しない。
@npc_c3_himono_otto
どうじゃ！
@npc_c3_himono_tsuma
……動いとらんよ。`;

/** ② 路地の 奥の 日かげ。 */
export const KZ_HIKAGE = `@narr
すずしい。{w=300}
……干し網は、
ぴくりとも しない。
@npc_c3_himono_tsuma
ほらね！
@npc_c3_himono_otto
……動いとらんぞ。`;

/** ①② で すませようと したら（③の 方を 見る。1回）。 */
export const KZ_ACCHI = `@npc_kanenari
あっちの 洗濯物、{w=300}
ゆれとるで。`;

/** 今 つるして ある 所を もう 1回。 */
export const KZ_KOKO = `@narr
干し網は、ここに
つるして ある。`;

/** ③ 路地の 出口の 角。 */
export const KZ_KADO = `@narr
港から、すうっと 風。{w=300}
干し網が、ゆらゆら
ゆれだした。
@npc_c3_himono_otto
…………
@npc_c3_himono_tsuma
…………`;

// ================================================================ 3 風で 干す

export const KZ_KAZE = `@npc_c3_himono_otto
……そうか。{w=300}
止まっとる 間、風が
いっぺんも 吹かんかった。
@npc_c3_himono_tsuma
干物は、風が ないと
乾きが おそいんよ。
@npc_c3_himono_otto
わしの 日なたも、
半分 当たりじゃ。
@npc_c3_himono_tsuma
あたしの 日かげも、
半分 当たりよ。
/
日じゃ なくて、{w=300}
風で 干すんよ。
@npc_c3_himono_otto
……風で 干す。
@narr
言い合いが、
めずらしく そろった。
@npc_kanenari
そろうたら そろうたで、
なんか さびしいな。`;

/** かくし：段階1 に ホシスギを 2組とも ハンコで 終わらせている（3 の あと、1回）。 */
export const KZ_HOSHISUGI = `@npc_c3_himono_otto
……板に なった 子らも、
見て もろうたけえ、
ええわい。`;

/** 3 の しめ（店先へ よぶ）。 */
export const KZ_YOBU = `@npc_c3_himono_tsuma
網は、夕方まで
風に まかせとこ。{w=300}
……ちょっと、店に 来て。`;

/** かくし：来た マサル（港通り、1回）。 */
export const KZ_MASARU = `@npc_hoshi_gen
……牛舎も、{w=300}
風が 通らんと、
牛が へばる。`;

// ================================================================ 4 べたつかなく なったら

export const KZ_SAWARU = `@npc_c3_himono_otto
……ほれ、さっきの
ちょうど ええのじゃ。
@npc_c3_himono_tsuma
さわって みて。{w=300}
べたっと しなかったら、
できあがり。`;

export const KZ_SARATTO = `@narr
アジの 表面が、
さらっと している。
@npc_c3_himono_otto
みやげじゃ。{w=300}
……軽トラで、
ゆられて 帰りんさい。`;

export const KZ_REWARD = `@sys
朱肉が 2 ふえた。
『アジの開き』を
もらった。
/
みました帳③の すみに、
『日じゃ なくて、風』の
ページ。`;

/** すんだ あと（段階2）。 */
export const KZ_AFTER = `@npc_c3_himono_tsuma
角の 網、よう ゆれとる。
@npc_c3_himono_otto
……ええ 風じゃ。`;

// ================================================================ 路地の 角の 物干し

export const KZ_SENTAKU_C1 = `@narr
物干しの 手ぬぐい。{w=300}
すそが、ななめの まま
止まっている。`;

export const KZ_SENTAKU_C2 = `@narr
物干しの 手ぬぐいと
洗濯ばさみが、{w=300}
港の 風で ゆれている。`;

/** ③ に つるした あとの ③ の かぎ。 */
export const KZ_YURERU = `@narr
干し網が、風で
ゆらゆら ゆれている。`;

/** ③ に つるした あとの ①② の かぎ。 */
export const KZ_KAGI_DONE = `@narr
干し網は、出口の 角で
ゆれている。`;

// ================================================================ 持ち物・帳面

export const KZ_ITEM_AMI_DESC: [string, string] = ['ホシミから あずかった。', '3段の、網の かご。'];
export const KZ_ITEM_HIRAKI_DESC: [string, string] = ['紙に 包んだ アジの 開き。', '表面が、さらっと している。'];

/** みました帳③の すみの 1ページ（ui/menu/book_kaze.ts）。 */
export const KZ_BOOK = {
  title: '日じゃ なくて、風',
  titleLines: ['日じゃ なくて、', '風'],
  spots: (n: number) => `つるした 所 ${n}/3`,
  kn: 'グソっ君も ゆれた',
  quote: ['半分 当たりと、', '半分 当たり'],
};

export const KZ_TEXTS: Record<string, unknown> = {
  KZ_MAE, KZ_A, KZ_MITA, KZ_MADA, KZ_KAGI, KZ_HINATA, KZ_HIKAGE, KZ_ACCHI, KZ_KOKO, KZ_KADO, KZ_KAZE, KZ_HOSHISUGI,
  KZ_YOBU, KZ_MASARU, KZ_SAWARU, KZ_SARATTO, KZ_REWARD, KZ_AFTER, KZ_SENTAKU_C1, KZ_SENTAKU_C2, KZ_YURERU, KZ_KAGI_DONE,
};

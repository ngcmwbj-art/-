// 第3章『海ぞいの町の いただきます』 — 第4期（S25〜S34：みんなが来る、タイキンの時間、
// ツガオ決戦のフィールドの分、決着のあと、エンディング〈昼ごはん・真相・集合写真・帰り道・
// いつもの明日〉、クリア後）の文（60_ch3_story 10.25〜10.30・9.5）。
// 演出は src/events/ch3/minna.ts・ending.ts。
// どのページも 3行 × 336px まで（__game.cmd.textcheck2 が見る）。
//
// 60 に文がなく、ここで作った文には「（E 作）」と書いた（報告に一覧）。
// 名札と地の文では、名前に「さん」をつけない（台詞の中の呼びかけは、その人の言い方のまま）。
// グソっ君の生まれ（真相）は S30 の文（SHINSO_*）だけに書く。

import { fillNames } from './c3_names';

// ================================================================ 10.25 S25 みんなが来る

/** 館内放送（ポコシャ。放送の声）。 */
export const S25_PA = `@？？？:pokosha_pa
……本日は、休館日です。
/
……ですが、ご来館の
みなさま、大水槽ホールへ
どうぞ。`;

/** 最後の集荷（ヒロスケ。表の顔にもどる）。 */
export const S25_SHUUKA = `@npc_hirosuke
ども！{w=300}
……最後の 集荷です！
乗って ください！`;

/** カットのあいだの地の文（2D・HD-2D とも。E 作）。 */
export const S25_SHUUKA_NARR = `@narr
防波堤の ござの ところへ、
ツガオ便が 来た。`;
export const S25_ONIGIRI = `@npc_c3_shokudo
おにぎり、
持ってく よ！`;

/** 入口の券売所：入館の打刻。 */
export const S25_DAKOKU = `@エゴ:dakoku
ゴライカン、
アリガトウ ゴザイマス。
{w=300}ガチャン。`;
/** 来た人が多いとき、打刻のおわり（63 8.9。E 作）。 */
export const S25_DAKOKU_END = `@エゴ:dakoku
……ニュウカン、オワリ。
ガチャン。`;

/** 来た人が降りてくる（E 作。来た人がいないときは出さない）。 */
export function s25Arrive(n: number): string {
  return `@narr
荷台から、${n}人が 降りてきた。
海ぞいの 町の 人たちも いる。`;
}
export const S25_ARRIVE_TOWN = `@narr
荷台から、海ぞいの 町の
人たちが 降りてきた。`;

/** グソっ君（入口で。E 作）。 */
export const S25_KN = `@npc_kanenari
……みんな、
来て くれたんか。`;

/** 大水槽への廊下のひとこと（1人1行。吹き出し。長い行は ／ で2つの吹き出しに分ける）。 */
export const S25_HITOKOTO: Record<string, string> = {
  npc_obaa: '40年、宿題を 出しっぱなしの／子が いるね。',
  npc_mamekichi: 'まいど！／ツガオさんの 伝票、うちのも あるぞ！',
  npc_hoshi_mitsu: '星見台の 伝票だ。……ほどよい 字じゃ。',
  npc_hoshi_gen: '……1万4千6百。／数えたら、日が 暮れる。',
  npc_hoshi_fumi: '寝ないで 走る 人を、／休ませる 授業だね。',
  npc_hoshi_kucho: 'えー、ツガオさんには、／村から 感謝状を。',
  npc_tsurumi: '本官も、休めと 言われる／ほうで あります！',
  npc_sae: '……14枚目の 絵、描くかも。',
  npc_ojii: '冬の たんかんも、／ツガオ便で 運んで もらおう。',
  npc_tamotsu: '待つのは 得意。……でも、待たせすぎだ。',
  npc_tokio: '事務所の 時計、3つとも 見ます。',
  npc_master: 'コーヒー、冷めない うちに／起きて もらいましょう。',
  npc_madam: 'まあ、ここが 事務所？ 古い 革の いすね。',
  npc_bu_body: '……休むのは、限界の 前に。ですね。',
  npc_maru: 'ツガオさんの 軽トラ、／5時の バスより 早いんよ。',
  npc_hoshi_tome: '……あの 顔の まんまじゃ。',
  npc_hoshi_sawako: '置物の ひげ、よう 似合っとる。',
  npc_hoshi_yoshie: 'お茶、持ってきたけえね。',
  npc_jk: '父さんの トマト、／毎朝 運んで くれた 人だ。',
  npc_hoshi_busdriver: '郵便と 同じだ。／毎日 届けるのが 仕事。',
  npc_hoshi_traindriver: '……終点で ございます。',
  npc_fudeno: '『休』の 字は、／人が 木に もたれる 形よ。',
  npc_photo_master: '1枚、撮りたい 顔に なってきた。',
  npc_mizumaki: 'ツガオさんの 軽トラ、／水まきの 前を 毎朝 通るの。',
  npc_c3_shokudo: 'おにぎり、持ってきたよ！',
  npc_c3_sirenban: '……正午は、1秒も ずらさん。決着も。',
};

/** 事務所を通るとき（E 作。3つの時計を見る）。 */
export const S25_JIMUSHO = `@narr
事務所。{w=300}奥の 壁に、
時計が 3つ。
/
夕鳴町、星見台、海ぞいの 町。
{w=300}3つとも、動いている。`;

// ================================================================ 10.26 S26 タイキンの時間

export const S26_A = `@narr
ツガオは、目を 開けずに 言った。
@npc_tsugao
……そろいも そろって、
何しに 来たんじゃ。`;

export const S26_EGO = `@エゴ:dakoku
ツガオ ダンチョウ。
{w=300}
/
……タイキン ノ
ジカン デス。`;

export const S26_MADA = `@npc_tsugao
……わしゃあ、
まだ 打刻せん。`;

export const S26_B = `@npc_tsugao
起こしたんは、
おまえらじゃ。
/
……責任は、
とってもらうけえのう。
@narr
グソっ君が、足を ふみしめた。
@npc_kanenari
……今度は、動くで。`;

/** 戦闘がまだ無いあいだの代わり（E 作。戦闘の中の流れを、文で短く）。 */
export const S27_STANDIN = `@narr
しゅんは、ハンコを 押した。
朱の はなまるが、黒い『まだ』に
半分だけ しみこんだ。
/
……だれかを、よべる 気が する。`;
export function s27StandinYobu(n: number): string {
  return n > 0
    ? `@narr
しゅんは、みんなを よんだ！
/
${n}人が、自分の 手で 描いた
はなまるを、黒い 回覧板に
描きこんだ。`
    : `@narr
しゅんと グソっ君と ヤキソバンが、
最後の はなまるを 描いた！`;
}
export const S27_STANDIN_END = `@narr
黒い 回覧板が、
はなまるで いっぱいに なった！
/
しゅんは『みんなの はなまる』を
押した！`;

// ================================================================ 10.27 evt_ch3_boss_final

export const BOSS_FINAL = `@npc_tsugao
……ハンコは、押したら
それきりじゃ。
/
じゃが、人が 自分の 手で
描いた しるしは……
{w=600}`;

export const BOSS_OTSUKARE = `@sys
おつかれさま でした！`;

// ================================================================ 10.28 S28 決着のあと

export const S28_A = `@npc_tsugao
……40年、ぶりじゃ。
{w=300}『おつかれさま』なんぞ、
言われたんは。
@npc_yakisoban
……毎晩、言いそびれてた。
{w=300}閉店まぎわに。`;

export const S28_PACK = `@npc_yakisoban
これは、あとで
あたためなおす。`;

export const S28_EGO = `@エゴ:dakoku
ツガオ ダンチョウ。{w=300}
……タイキン、
ダコク シマスカ。
@ツガオ:tsugao_omote
……おう。{w=300}
頼むわ。`;

export const S28_TAIKIN = `@エゴ:dakoku
タイキン、ダコク シマス。
{w=900}
ガチャン。`;

/** 館の時計が動きだす（E 作。地の文）。 */
export const S28_CLOCK = `@narr
館の 時計が、12:00 から
動きだした。`;

export const S28_NERU = `@ツガオ:tsugao_omote
……ほいじゃ、
つがおちゃん 寝る〜♪`;

export const S28_B = `@npc_pokosha
……さすが、親分。
@npc_hirosuke
……わはは。{w=300}
起きたら、昼ごはんじゃ。
@npc_c3_shokudo
防波堤で、みんなで 食べよう！
{w=300}……あんたらの ぶん、
ちゃんと とってあるよ！`;

// ================================================================ 10.29 エンディング（S29〜S33）

// ---- カット1 S29 防波堤の昼ごはん

export const S29_A = `@npc_maruyama
……青のりは、別。
/
グソっ君。{w=300}
返して みろ。`;
export const S29_DEKITA = `@npc_kanenari
……できた。`;
export const S29_DEKITATE = `@npc_maruyama
出来たてだ。`;
export const S29_ITADAKIMASU = `@npc_kanenari
……いただきます。`;
export const S29_UMAI = `@npc_kanenari
……な、なんやこれ……！
{w=300}
/
自分で 返した 焼きそば、
めっちゃ 美味いやんけ！`;

/** カット1b みんなの昼ごはん（各2秒。吹き出し）。 */
export const S29_MINNA: [string, string][] = [
  ['npc_c3_shokudo', 'おかわり、あるよ！'],
  ['npc_c3_jouren', '……もう 1パック。'],
  ['npc_c3_himono_otto', 'ほどよい！'],
  ['npc_c3_himono_tsuma', '……あんたが 言うな！'],
  ['npc_hirosuke', '焼き芋も、食うか？'],
];

export const S29_B = `@npc_kanenari
……きょう、何回目の
昼ごはんや。
@npc_c3_shokudo
何回でも ええのよ。{w=300}
……ちゃんと、
ごちそうさま すればね。`;

/** ござのはしのツガオ（地の文。60 の演出メモを文に。E 作）。 */
export const S29_TSUGAO = `@narr
ツガオは、ござの はしで、
たかしの 焼きそばを 1皿、
だまって 食べている。`;

// ---- カット2 S30 真相（灯台の下）

export const SHINSO_A = `@ツガオ:tsugao_omote
……グソっ君。
@npc_kanenari
……なんで、わいの 名前。`;

export const SHINSO_B = `@ツガオ:tsugao_omote
……おまえを、そう 呼んどったのは、
わしじゃ。
/
おまえは、深い 海から
水族館に 来た。
/
閉館の 日、1つだけ
引き取り先が 決まらんかった。
/
わしが 預かった。{w=300}
……そして、おまえを
戦いの 実験に 使うた。
/
わしは、おまえを、
戦闘の 実験用の
ペットに しとった。`;

export const SHINSO_C = `@ツガオ:tsugao_omote
休まずに 戦える 体が、
本当に 作れるか。{w=300}
……わしが、休まずに おるために。
/
答えが 出たら、もう、
おまえは いらんように なった。
/
8月30日の 晩。{w=300}
40年で 1日だけ、仕事を 休んで、
おまえを 夕鳴町の 公園に 置いた。
/
……覚えとらんのは、
わしが『まだ』を 押したからじゃ。
{w=300}『まだ 思い出さん』。
/
よろいの 裏じゃ。{w=300}
自分では、見えん 所に。
@npc_kanenari
……………………`;

export const SHINSO_TOKERU = `@narr
グソっ君の よろいの 裏で、
黒い 判が とけた。`;

export const SHINSO_OMOIDASHITA = `@npc_kanenari
……思い出した。
{w=600}`;
export const SHINSO_ESA = `@npc_kanenari
毎晩、えさの 時間に、
『グソっ君』って
呼ぶ 声が した。
/
……あの 声、
おっちゃん やったんか。`;

export const SHINSO_SUMAN = `@ツガオ:tsugao_omote
……すまんかった。`;

export const SHINSO_KOUEN = `@ツガオ:tsugao_omote
あの 公園は、
焼きそば屋の そばじゃった。
/
……あそこの 焼きそばは、
冷めても うまいけえ。`;

export const SHINSO_KN = `@npc_kanenari
……わい、びっくりしたで。
{w=300}ほんまに。
/
けど。
{w=600}
/
わいは、しゅんが 見つけてくれた
グソっ君や。
/
……それで、ええねん。`;

export const SHINSO_END = `@npc_kanenari
おっちゃんも、
もう 休んで ええで。
@ツガオ:tsugao_omote
……おう。`;

// ---- カット3 S31 集合写真

export const PHOTO_MASTER = `@npc_photo_master
はい、みなさん、
寄って ください。
{w=300}……海の 子も、山の 子も。`;
export const PHOTO_POKOSHA = `@npc_pokosha
……と、撮ります。{w=300}
10秒、です。`;
export const PHOTO_FUE = `@npc_c3_kanshiin
ピッ！{w=300}……あ、つい。`;

// ---- カット4 S32 帰り道と5時のチャイム

export const KAERI_A = `@ツガオ:tsugao_omote
……明日の 朝 5時。{w=300}
星見台の キャベツ、
たかしの 店に 届けるけえ。
@npc_maruyama
……青のりも 頼む。
@ツガオ:tsugao_omote
おう！{w=300}
……まあ、ええわい！`;

export const CHIME_NARR = `@narr
5時の チャイムが、
最後まで 鳴った。`;

export const CHIME_KN = `@npc_kanenari
……夕方や。{w=300}
/
夕方と、夜明けと、
正午。{w=300}……これで、
1日、ぜんぶ やな。`;

export const HOME_A = `@npc_mother
おかえり。{w=300}
……あら、2人とも、
顔が お昼みたいよ。
@npc_kanenari
ただいま。{w=300}
……あ、母ちゃん。
/
わい、あした から、
たかしの 店で 働くねん。
@npc_mother
あら。{w=300}
……顔に『焼きそば』って
書いてあるわよ。`;

// ---- カット5 S33 いつもの明日

export const ASA_A = `@npc_maruyama
ツケの 帳面、
グソっ君の ページは、
『まかない』だ。
@npc_kanenari
おおきに！{w=300}
……あ、しゅん！`;

export const ASA_B = `@npc_kanenari
いってらっしゃい！{w=300}
帰りに、出来たて
食べに 来てや！`;

export const ASA_C = `@ツガオ:tsugao_omote
おう！ しゅん！{w=300}
……行ってこい！`;

/** カット6 みました帳 ③ の表紙の字。 */
export const NOTE3_TITLE = '海ぞいの町 みました帳 ③';

// ================================================================ 10.30 S34 クリア後

/** タイトルのカードの最後の行（flag_ch3_yobu_n で変える）。 */
export function titleThanks(n: number): string {
  return n >= 10 ? `${n}人の はなまる、ありがとう。` : 'みんなに、ありがとう。';
}

/** 焼きそばのたかしのグソっ君（〔c4〕）。 */
export const C4_KN_ASK = `@npc_kanenari
出来たて、食べてくか？
? 食べる | また こんど`;
export const C4_KN_EAT = `@npc_kanenari
まかないや。{w=300}
お金は いらんで。
@sys
HP と 朱肉が ぜんぶ 回復した！`;
export const C4_KN_LATER = `@npc_kanenari
ほな、また 帰りに な。`;

/** ツガオ便のツガオ（〔c4〕）。 */
export const C4_TSUGAO = `@ツガオ:tsugao_omote
おう！ しゅん！
今日は 寝とらんぞ！
{w=300}……昼寝は するがな！`;
export const C4_TSUGAO_ASK = `@ツガオ:tsugao_omote
海ぞいの 町まで、
乗ってくか？
? 乗る | やめておく`;

/** クリア後の旧水族館（開館の準備中。E 作）。 */
export const C4_POKOSHA = `@npc_pokosha
……開館の 準備中 です。
{w=300}自分、受付を します。`;
export const C4_HIROSUKE = `@npc_hirosuke
ども！{w=300}
きょうも 集荷じゃ。わはは。`;
export const C4_EGO = `@エゴ:dakoku
ゴライカン、
アリガトウ ゴザイマス。
{w=300}ガチャン。`;

/** 事務所の黒い回覧板（S28 のあと。9.5）。 */
export const JIMU_KAIRAN = `@narr
黒い 回覧板。『まだまだ団』。
/
最後の ページに、えんぴつで
『解散』。`;
export const JIMU_KAIRAN_BEFORE = `@narr
黒い 回覧板。『まだまだ団』。`;
export const JIMU: Record<string, string> = {
  obj_c3_jimu_clocks: `@narr
夕鳴町、星見台、海ぞいの 町。
3つとも、動いている。`,
  obj_c3_jimu_cap: `@narr
水玉の ナイトキャップ。
ぽんぽんが、少し つぶれている。`,
  obj_c3_jimu_lamp: `@narr
緑の かさの 電気スタンド。
スイッチの ひもが 長い。`,
};

/** 退勤の打刻（fushigi_ch3_10。60 8章）。 */
export const FUSHIGI10_SEEN = `@narr
エゴの タイムカード。
/
1枚だけ、字が ちがう。`;
export const FUSHIGI10_PRESSED = `@narr
タイムカードに、はじめて
『退勤』の 字。`;

// ================================================================ QA（文の検査に渡す）

/** Every msg block of this file, names filled in (textcheck2 measures them). */
export function c3Texts4(): Record<string, unknown> {
  const fill = (v: unknown): unknown =>
    typeof v === 'string' ? fillNames(v) : Array.isArray(v) ? v.map(fill) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v;
  return fill({
    s25: {
      S25_PA, S25_SHUUKA, S25_SHUUKA_NARR, S25_ONIGIRI, S25_DAKOKU, S25_DAKOKU_END, arrive: s25Arrive(24), S25_ARRIVE_TOWN, S25_KN, S25_JIMUSHO,
      // (a bubble is one line: a long one is two bubbles, split at ／)
      hitokoto: Object.fromEntries(Object.entries(S25_HITOKOTO).map(([k, t]) => [k, t.split('／').map((x) => `@${k}\n${x}`)])),
    },
    s26: { S26_A, S26_EGO, S26_MADA, S26_B, S27_STANDIN, yobu: [s27StandinYobu(30), s27StandinYobu(0)], S27_STANDIN_END, BOSS_FINAL, BOSS_OTSUKARE },
    s28: { S28_A, S28_PACK, S28_EGO, S28_TAIKIN, S28_CLOCK, S28_NERU, S28_B },
    s29: { S29_A, S29_DEKITA, S29_DEKITATE, S29_ITADAKIMASU, S29_UMAI, minna: S29_MINNA.map(([k, t]) => `@${k}\n${t}`), S29_B, S29_TSUGAO },
    s30: { SHINSO_A, SHINSO_B, SHINSO_C, SHINSO_TOKERU, SHINSO_OMOIDASHITA, SHINSO_ESA, SHINSO_SUMAN, SHINSO_KOUEN, SHINSO_KN, SHINSO_END },
    s31: { PHOTO_MASTER, PHOTO_POKOSHA, PHOTO_FUE },
    s32: { KAERI_A, CHIME_NARR, CHIME_KN, HOME_A },
    s33: { ASA_A, ASA_B, ASA_C },
    s34: {
      C4_KN_ASK, C4_KN_EAT, C4_KN_LATER, C4_TSUGAO, C4_TSUGAO_ASK, C4_POKOSHA, C4_HIROSUKE, C4_EGO, JIMU_KAIRAN, JIMU_KAIRAN_BEFORE, jimu: JIMU, FUSHIGI10_SEEN, FUSHIGI10_PRESSED,
      thanks: [`@narr\n${titleThanks(24)}`, `@narr\n${titleThanks(3)}`],
    },
  }) as Record<string, unknown>;
}

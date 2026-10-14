// 隊列のグソっ君に話しかけると、本筋の「次にすること」を教えてくれる（2026-10-15 依頼主の指示、fix1015 G3）。
//
// 話しかけると「どないした、しゅん？」→〔次、どうする？｜おしゃべり〕。「おしゃべり」は今までの台詞
// （場所ごとのひとこと・いつもの・寄り道の台本）をそのまま通す。ヒントは答えを言わず、場所と人まで。
// 口調は関西弁・一人称「わい」（10_narrative 2.6）。第3章の真相（03_ch3_memo）は、第3章で明かした
// 範囲から出ない（第1章・第2章のヒントでは ふれない）。どのページも 3行 × 336px まで
// （__game.cmd.textcheck2 が knHintTexts() を見る）。名前は `{name:npc_c3_*}`（say3 が差しこむ）。
//
// クリア後は、やり残しのページ（data/text/yarinokoshi.ts）と同じ考え：今の時間帯に遊べる やり残しを
// 1つ（話すたびに次の行）。ヒントの2行は その行の文（「グソっ君」は「わい」に）。

import type { PgBand } from '../../world/postgame';
import { YR_ROWS, type YrRow } from './yarinokoshi';
import { GUIDE_PARTS } from './c3_story2';

const kn = (t: string): string => `@npc_kanenari\n${t}`;

/** 話しかけたときの1ページと選択。0 = ヒント、1 = おしゃべり（今までの台詞）。 */
export const KH_ASK = kn(`どないした、しゅん？
? 次、どうする？ | おしゃべり`);

// ================================================================ 第1章（グソっ君が仲間になってから）

export const KH_C1 = {
  /** 段階2：駐車場のおじぎ自販機へ（10 4.3「モールへ」）。 */
  ojigi: kn(`影が、みんな 北東 向いとる。
{w=300}北東の 駐車場の ほうや。
……なんか、立っとるで。`),
  mall: kn(`駐車場の 奥が、モールや。
{w=300}入口から 入って みよ。`),
  /** 鍵はフードコート（10 4.3「フードコートは 1階やで」）。 */
  key: kn(`迷子センターの 鍵は、
フードコートや。{w=300}1階やで。
……ぐるぐる 回る 音、せえへん？`),
  /** 2F の通路の『清掃中』（ソウジロウ）。 */
  nikai: kn(`2階は、健康コーナーの 奥の
動く 階段から や。{w=300}
『清掃中』の 前に、だれか おる。`),
  door: kn(`2階の いちばん 奥、
迷子センターの 扉や。{w=300}
鍵、持っとるやろ。`),
  boss: kn(`迷子センターの 中や。
{w=300}……ベンチで 休んでから
行こか。`),
};

// ================================================================ 第2章（50 5.3）

export const KH_C2 = {
  train: kn(`電車の いちばん 前まで
行って みよ。`),
  yoriai: kn(`村で 1つだけ、明るい 窓が
あるやろ。{w=300}集会所や。
まっすぐ 北やで。`),
  house: kn(`西の 斜面の、3つ目の
ハウスや。{w=300}ペロさんに
聞いて みよ。`),
  tomato: kn(`ハウスの いちばん 奥や。
{w=300}光っとるの、見えるやろ。`),
  gen: kn(`東の 牛舎の ほうや。
{w=300}県道の 坂を 上がろ。
明かり、持っとるな。`),
  barn: kn(`牛舎の 見回り、手伝お。
{w=300}いちばん 奥の 暗い とこ、
照らして みよか。`),
  gate: kn(`マサルさんに 話そ。
{w=300}ゲートの 先に、用が あるで。`),
  tetsuya: kn(`ゲートの 先の、暗い 畑や。
{w=300}奥で、ライトが 行ったり
来たり しとる。`),
  hill: kn(`かかしが、みんな 山を
向いとる。{w=300}星見の 丘や。
山道の 入口に、まつ先生。`),
  hillTop: kn(`赤い ランプが 光っとる。
{w=300}……ベンチで、ひと休み
してから 行こか。`),
};

// ================================================================ 第3章（60 5.1〜5.3。S00〜S34）

export const KH_C3 = {
  // 序（夕鳴町の昼前）
  tomato: kn(`おまけの トマト、
ひのやの おばあに 届けよ。`),
  truck: kn(`銀座の 角に、
ツガオ便が 来とるで。
{w=300}乗せて もらお。`),
  truckNap: kn(`ツガオさん、運転席で
寝とるで。{w=300}……もう いっぺん
声 かけて みよか。`),

  // 2幕 ①〜③（どの順でも）
  /** ①〜③のどれも始めていないとき、ヒントの前に（5.3 の「どこから 行こか」と同じ考え）。 */
  anyOrder: kn(`地図の 印は 3つ。
{w=300}市場、食堂、海水浴場……
どこからでも ええで。`),
  ichiba: {
    a: kn(`市場の セリ場に おる、
{name:npc_c3_seri_deshi}に 話しかけて みよ。`),
    b: kn(`{name:npc_c3_seri_deshi}、まだ なんか
言いたそうやったで。{w=300}
もう いっぺん 話そ。`),
    c: (n: number): string =>
      kn(`符丁の 切れはし、
市場の 床に 落ちとるで。
{w=300}あと ${n}枚は ほしいな。`),
    d: kn(`切れはし、そろたな。
{w=300}セリ場の {name:npc_c3_seri_deshi}の とこ、
行こか。`),
  },
  shokudo: {
    a: kn(`食堂かもめの {name:npc_c3_shokudo}さんに、
話しかけて みよ。`),
    b: kn(`常連の {name:npc_c3_jouren}さんの 話、
聞いて みよか。`),
    c: kn(`{name:npc_c3_shokudo}さんに、
もう いっぺん 話そ。`),
    /** 品が足りないとき（最低2品）：どこで手に入るか。 */
    himono: (n: number): string =>
      kn(`定食の 品、あと ${n}つや。
{w=300}干物屋の 2人、
言い合い しとったな。`),
    kita: (n: number): string =>
      kn(`定食の 品、あと ${n}つや。
{w=300}市場の あぜ道市、
のぞいて みよか。`),
    sakana: (n: number): string =>
      kn(`定食の 品、あと ${n}つや。
{w=300}市場の 魚も、品に なるで。`),
    any: (n: number): string =>
      kn(`定食の 品、あと ${n}つや。
{w=300}町の 人に、聞いて まわろ。`),
    e: kn(`品、そろたで。
{w=300}{name:npc_c3_shokudo}さんに 持って 行こ。`),
  },
  umi: {
    a: kn(`海水浴場の {name:npc_c3_mago}と
{name:npc_c3_kanshiin}に、話しかけて みよ。`),
    dive: kn(`わいの 出番や。{w=300}
港の 階段か、浜の
波打ちぎわから 潜るで。`),
    give: kn(`拾うた ブレスレット、
{name:npc_c3_mago}に 返そ。`),
    lens: kn(`灯台の {name:npc_c3_toudai}の とこや。
{w=300}光で、波を 起こそ。`),
    d: kn(`{name:npc_c3_mago}の とこ、行こ。
{w=300}波、もどって 来とるで。`),
  },
  /** S11（5.3 の吹き出しと同じ文）。 */
  itadakimasu: kn(GUIDE_PARTS),
  siren: kn(`サイレン塔、開いたで。
{w=300}てっぺんまで 上がろ。`),
  /** S14 の前（S14 の直前に「やり残し、ないか？」がある：5.4）。 */
  trap: kn(`港に、なんか 来とる。
{w=300}……やり残しが あったら、
先に すませとこ。`),

  // 3幕 旧水族館
  aqDoor: kn(`旧水族館の 入口や。
{w=300}ガラス戸の とこへ 行こ。`),
  kairo: (n: number): string =>
    kn(`回廊の 壁の 伝票、
読んで いこ。{w=300}
あと ${n}枚は 読みたいな。`),
  kairoEnd: kn(`東の はしに、
ヒロスケさんが おるで。`),
  diorama: kn(`ジオラマの 部屋や。
{w=300}町の 模型、よう 見て
まわろ。ヒロスケさんも おる。`),
  shinkai: kn(`次は、奥の 暗い 部屋や。
{w=300}……はぐれんように
行こな。`),
  esa: kn(`えさの 部屋に、
ポコシャさんが おるで。
{w=300}話しかけて みよ。`),
  hall: kn(`ホールの 鍵、もろたな。
{w=300}大水槽の ホールへ 行こ。`),

  // 4幕（倉庫のグソっ君は弱っている）
  soukoDoor: kn(`……扉、もう いっぺん
見て みい。{w=300}
……カチって、鳴ったやろ。`),
  /** S24 の前（ヤキソバンが仲間にいる）。 */
  hp: `${kn(`廊下の 先に、ヒロスケさんと
ポコシャさんや。{w=300}
3人で 行こ。`)}
@npc_yakisoban
……3人前、だな。`,
  /** S25 のあと、決戦の前。 */
  boss: `${kn(`ホールで、ツガオの
おっちゃんが 待っとる。`)}
@npc_yakisoban
……鉄板は、あたたまっとる。`,
};

// ================================================================ クリア後（05_postgame 9章のやり残し）

const BAND_NAME: Record<PgBand, string> = { asa: '朝', hiru: '昼', yu: '夕方', yoru: '夜' };

/** やり残しのヒント2行を、グソっ君の口から（「グソっ君」は「わい」）。 */
function rowLines(r: YrRow): [string, string] {
  return r.hint.map((l) => l.replace(/グソっ君/g, 'わい')) as [string, string];
}

/**
 * 今（または次の時間帯に）遊べる やり残し1つ。
 * later：今の時間帯には無く、その時間帯の物。away：今と ちがう町。
 */
export function khPgRow(r: YrRow, later: PgBand | null, away: boolean): string {
  const head = later
    ? kn(`今の 時間は、やり残し
ないなあ。{w=300}${BAND_NAME[later]}に なったら、
「${r.name}」や。`)
    : kn(`今の 時間やったら……
「${r.name}」、まだ やで。`);
  const [a, b] = rowLines(r);
  const third = later ? '\n時間、待つ ことも できるで。' : away ? '\n{w=300}ツガオ便で 行こか。' : '';
  return `${head}\n/\n${a}\n${b}${third}`;
}

/** やり残しの行は済んで、ふしぎが残っているとき。 */
export function khPgFushigi(ch: 1 | 2 | 3): string {
  const place = ch === 1 ? '夕方の 夕鳴町' : ch === 2 ? '夜の 星見台' : '昼の 海ぞいの町';
  return kn(`やり残しは、ぜんぶ はなまるや。
{w=300}あとは ふしぎ。
${place}に、まだ あるで。`);
}

/** 全部そろった（シークレットエンディングの入口。05 10.1 の「おっちゃんに、見せに 行こか」と同じ範囲）。 */
export const KH_PG_SECRET = kn(`……ぜんぶ はなまるや。
{w=300}ツガオ便の おっちゃんに、
みました帳 見せに 行こか。`);
export const KH_PG_ALL = kn(`もう、ぜんぶ はなまるや。
{w=300}……のんびり 歩こか。`);

// ================================================================ QA（文の検査に渡す）

/** Every page of this file (textcheck2 walks them; numbers at their widest). */
export function knHintTexts(): Record<string, unknown> {
  const rows: Record<string, string> = {};
  for (const r of YR_ROWS) {
    rows[r.id] = khPgRow(r, null, true);
    rows[r.id + '_later'] = khPgRow(r, 'yu', false);
  }
  return {
    ask: KH_ASK,
    c1: KH_C1,
    c2: KH_C2,
    c3: {
      ...KH_C3,
      ichiba: { ...KH_C3.ichiba, c: KH_C3.ichiba.c(3) },
      shokudo: { ...KH_C3.shokudo, himono: KH_C3.shokudo.himono(2), kita: KH_C3.shokudo.kita(2), sakana: KH_C3.shokudo.sakana(2), any: KH_C3.shokudo.any(2) },
      kairo: KH_C3.kairo(4),
    },
    pg: { rows, f1: khPgFushigi(1), f2: khPgFushigi(2), f3: khPgFushigi(3), secret: KH_PG_SECRET, all: KH_PG_ALL },
  };
}

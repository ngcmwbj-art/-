// みました帳の『みずべ』（水辺の 図鑑、02_ch2_index #81、10_narrative 12.3〔みずべ〕、
// 30_level_art 10.7、52_ch2_level_art 13.2）。① 夕鳴町 12種＋らん外（おぴぃの 長靴）、
// ② 星見台 7種。②の『むし』と 同じ 作り：左の ページに 名前の 一覧（見ていない 種は
// 「…………」）、右の ページに しゅんの えんぴつの 絵・名前・場所・記録・ひとこと。見ていない
// 種は「…………」と、どこに いそうかの 1行だけ。
//
// 記録は 2つの 欄：『本当』（定規の 数字）と『おぴぃ 認定』（盛った 数字）。テナガエビの オスは
// 『認定 20cm（手こみ）』。ぬし・お母さんエビは『計らない』、メダカ・ツバメ・沢ガニは『見た』。
// ②は『本当』だけ（トマじいは 盛らない）。
//
// フラグ（10 3.6）：
//   flag_zukan_<id>          見た（つかまえた）回数。1 以上で ページが うまる
//   flag_zukan_<id>_cm       いちばん 大きい『本当』の cm
//   flag_zukan_<id>_cert     いちばん 大きい『認定』の cm
//   flag_zukan_<id>_still    段階1（止まった 時間）に 取った（ページの すみに『止まっていた 1ぴき』）
//   flag_mizube_book / flag_mizube_book2   ① ② に 欄が できた

import { flag, setFlag } from '../../game/state';

export type ZukanMeasure = 'cm' | 'tenaga' | 'none' | 'see';

export interface ZukanEntry {
  id: string;
  vol: 1 | 2;
  name: string;
  /** どこで 見たか（地図の ピン）。 */
  place: string;
  /** 見ていない とき：どこに いそうか。 */
  hint: string;
  /** ひとこと（その場で おぴぃや グソっ君、トマじいが 言った こと）。 */
  note: string;
  /** 記録の 書き方。 */
  measure: ZukanMeasure;
  /** らん外（数に 入れない）。 */
  bonus?: boolean;
}

export const ZUKAN: ZukanEntry[] = [
  // ---- ① 夕鳴町（対岸の 水口、つりえさ屋、夕鳴川の 堰）
  { id: 'kozari', vol: 1, name: '小さい ザリガニ', place: '対岸の 水口（畦の 草の下）', hint: '畦の 草の下？', note: '「来年、また 来な。」', measure: 'cm' },
  { id: 'zari', vol: 1, name: 'ザリガニ', place: '対岸の 水口（石の陰）', hint: '水口の 石の陰？', note: '「定規が のびるの。」', measure: 'cm' },
  { id: 'makka', vol: 1, name: 'マッカチン', place: '対岸の 水口（土管の 口）', hint: '土管の 口？', note: '「盛らなくても、でかい。」', measure: 'cm' },
  { id: 'can', vol: 1, name: '缶の 中の ザリガニ', place: '対岸の 水口（空き缶）', hint: '空き缶の 中？', note: '「家ごと 釣れたね。」', measure: 'cm' },
  { id: 'zari_nushi', vol: 1, name: 'ザリガニの ぬし', place: '対岸の 水口（土管の 奥）', hint: '土管の 奥？ 北東の 夕方？', note: '「ぬしは、ぬしだから。」', measure: 'none' },
  { id: 'mesu', vol: 1, name: 'テナガエビ メス', place: '堰の 下（石の すき間）', hint: '堰の 石の すき間？', note: '長いのは、はさみの ついた 足。', measure: 'tenaga' },
  { id: 'osu', vol: 1, name: 'テナガエビ オス', place: '堰の 下（白い 泡の 中）', hint: '堰の 下の 泡？', note: '「……手を 入れとく。」', measure: 'tenaga' },
  { id: 'tamago', vol: 1, name: 'たまごの エビ', place: '堰の 下（流木の 陰）', hint: '流木の 陰？ 夕方の はじめ？', note: '「……お母さん。すぐ 帰す。」', measure: 'none' },
  { id: 'goby', vol: 1, name: 'ヨシノボリ', place: '堰の 下（石の すき間）', hint: '石の すき間？ エビじゃ ない？', note: 'エビの えさを 横取りする 名人。', measure: 'tenaga' },
  { id: 'taisho', vol: 1, name: '片手の 大将', place: '堰の 下（流木の 陰の 奥）', hint: '流木の 陰の 奥？ 北東の 夕方？', note: 'ぬしってのは、だいたい 片方が 変。', measure: 'none' },
  { id: 'medaka', vol: 1, name: 'メダカ', place: 'つりえさ屋の 水そう', hint: 'つりえさ屋の 中？', note: '「メダカは、閉められない。」', measure: 'see' },
  { id: 'tsubame', vol: 1, name: 'ツバメ', place: '夕鳴川の ヨシ原の 上', hint: '川の ヨシ原の 上？', note: '「ヨシの 宿。南へ 行く 前の。」', measure: 'see' },
  { id: 'boot', vol: 1, name: 'おぴぃの 長靴', place: '対岸の 水口（畦の 草の下）', hint: '', note: '「1年、片方で。」', measure: 'none', bonus: true },
  // ---- ② 星見台（用水路の 夜振り、沢の上）
  { id: 'dojou', vol: 2, name: 'ドジョウ', place: '用水路（橋の 西の 泥だまり）', hint: '用水路の 泥の 中？ 夜？', note: '「ぬるぬるや！」（グソっ君）', measure: 'cm' },
  { id: 'chibi', vol: 2, name: 'ちびドジョウ', place: '用水路（橋の 西の 泥だまり）', hint: '泥だまりの すみ？', note: '「朝に なったら、寝る 時間やで。」', measure: 'cm' },
  { id: 'ooki', vol: 2, name: '大きい ドジョウ', place: '用水路（水口の 下）', hint: '水口の 下？', note: 'ひげ 10本、足 14本。勝った。', measure: 'cm' },
  { id: 'yago', vol: 2, name: 'ヤゴ', place: '用水路（水口の 下）', hint: '水口の 下の 泥？', note: '「こいつも、いつか 飛ぶんか。」', measure: 'cm' },
  { id: 'kawanina', vol: 2, name: 'カワニナ', place: '用水路（石垣の すき間）', hint: '石垣の すき間？', note: '「6月は、ここ ホタルが 出る。」', measure: 'cm' },
  { id: 'sawagani', vol: 2, name: '沢ガニ', place: '沢の上（飛び石と わき水）', hint: '沢の上？ 3びき？', note: 'はさみを 上げて、横に 歩く。', measure: 'see' },
  { id: 'dojou_nushi', vol: 2, name: '用水路の ぬし', place: '用水路（石垣の すき間の 奥）', hint: '石垣の 奥？', note: '「みな 同じ ことを 言う。」', measure: 'none' },
];

export const ZUKAN1 = ZUKAN.filter((e) => e.vol === 1);
export const ZUKAN2 = ZUKAN.filter((e) => e.vol === 2);

/** 『止まっていた 1ぴき』（段階1に 取った）。 */
export const STILL_LABEL = '止まっていた 1ぴき';
/** ②の 認定の 欄。 */
export const TOME_LABEL = 'トマじいは盛らない';
/** おぴぃの 書きこみ（①の いちばん うしろ）。 */
export const OPI_NOTE = ['夕鳴の 水辺、ぜんぶ 見た。', 'おぴぃ 認定'];
/** しゅんの 1行（②を ぜんぶ うめて、駅ノートに 書きたした あと）。 */
export const SHUN_NOTE = ['駅ノートに 書きたした。'];

const f = (id: string, k = '') => `flag_zukan_${id}${k}`;

/** 見た（つかまえた）か。メダカは つりえさ屋の 水そうを 見ていれば、長靴・ぬし・缶は 前からの フラグも。 */
export function zukanSeen(id: string): boolean {
  if (flag(f(id)) > 0) return true;
  if (id === 'medaka') return flag('flag_seen_obj_sb_tank') > 0;
  if (id === 'boot') return flag('flag_zari_boot') > 0;
  if (id === 'zari_nushi') return flag('flag_zari_nushi') > 0;
  if (id === 'can') return flag('flag_zari_can') > 0;
  return false;
}

/** 見た（数を 1つ 足す）。 */
export function zukanSee(id: string): void {
  setFlag(f(id), flag(f(id)) + 1);
}

/** 記録：大きい ほうを とっておく。新しい『本当』の 記録なら true。 */
export function zukanRecord(id: string, real: number, cert = real): boolean {
  zukanSee(id);
  const was = flag(f(id, '_cm'));
  if (real > was) setFlag(f(id, '_cm'), real);
  if (cert > flag(f(id, '_cert'))) setFlag(f(id, '_cert'), cert);
  return real > was;
}

export function zukanCm(id: string): [number, number] {
  return [flag(f(id, '_cm')), flag(f(id, '_cert'))];
}

export function zukanStill(id: string): boolean {
  return flag(f(id, '_still')) > 0;
}
export function setZukanStill(id: string): void {
  setFlag(f(id, '_still'), 1);
}

export function zukanBook(vol: 1 | 2): boolean {
  return flag(vol === 1 ? 'flag_mizube_book' : 'flag_mizube_book2') > 0;
}

/** その 巻の 数に 入る 種（らん外を のぞく）の うち、見た 数と 全部の 数。 */
export function zukanCount(vol: 1 | 2): [number, number] {
  const list = (vol === 1 ? ZUKAN1 : ZUKAN2).filter((e) => !e.bonus);
  return [list.filter((e) => zukanSeen(e.id)).length, list.length];
}

export function zukanComplete(vol: 1 | 2): boolean {
  const [a, b] = zukanCount(vol);
  return a >= b;
}

/** ①の 表紙の ザリガニの シール（おぴぃの 書きこみの あと）／②の ドジョウの シール（駅ノートの あと）。 */
export function zukanSticker(vol: 1 | 2): boolean {
  return flag(vol === 1 ? 'flag_mizube_yurai_done' : 'flag_yoburi_ekinote_done') > 0;
}

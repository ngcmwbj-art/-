// やり残しのページ（05_postgame 2章・9章）の行：ID・章・窓・済んだかの関数・名前（短く）・ヒント2行。
// U のページ（みました帳の「やり残し」）と、E のクリア後の会話（events/pg_talk.ts：その人の寄り道が
// 窓の中で まだなら、今の台本＝寄り道の入口に通す）が読む。
//
// 窓：第1章の行は 夕方の夕鳴町、第2章は 夜の星見台、第3章は 昼の海ぞいの町（05 2.0）。旧水族館の行は
// 9:00〜16:59（3.5）。ヒントは 1行目＝時間帯と場所、2行目＝だれと（中身は ばらさない。9.1）。
// グソっ君の生まれには ふれない。

import { flag } from '../../game/state';
import { pgMin, type PgBand, type PgTown } from '../../world/postgame';
import { pageFlag } from './hajimete';

export interface YrRow {
  id: string;
  ch: 1 | 2 | 3;
  /** 窓の帯（town の町で）。 */
  band: PgBand;
  town: PgTown;
  /** 帯より細かい窓（ゲームの分で）：旧水族館 9:00〜16:59。 */
  win?: () => boolean;
  /** グソっ君が いっしょで ないと 始まらない。 */
  kn: boolean;
  /** 済んだ。 */
  done: () => boolean;
  /** ページの名前（短く）。 */
  name: string;
  /** ヒント2行。 */
  hint: [string, string];
  /** 寄り道の入口の人（クリア後の会話：窓の中で まだなら、その人は今の台本で話す）。 */
  npcs: string[];
}

const f = (id: string) => (): boolean => flag(id) > 0;
const all = (...ids: string[]) => (): boolean => ids.every((i) => flag(i) > 0);
const aq = (): boolean => pgMin() >= 9 * 60 && pgMin() < 17 * 60;

/** グソっ君の はじめて帳①・② の人（data/text/hajimete.ts の npc のある欄）。 */
const HJ1 = ['uchimizu', 'tofu', 'higasa', 'shinbun', 'fude', 'kansouki', 'keirei', 'atari'];
const HJ2 = ['tsukemono', 'tomatoha', 'inaho', 'iro', 'shikiji', 'tegami'];

/** 「ダンゴムシ ちゃうで」の 報告書：巡査・聞き込みの 8人・さや・母。 */
const HK_NPCS = ['npc_tsurumi', 'npc_ojii', 'npc_gacha_boy', 'npc_sand_girl', 'npc_postman', 'npc_chugaku', 'npc_mamekichi', 'npc_tokio', 'npc_master', 'npc_sae', 'npc_mother'];

const C1 = { ch: 1 as const, band: 'yu' as PgBand, town: 'yunari' as PgTown };
const C2 = { ch: 2 as const, band: 'yoru' as PgBand, town: 'hoshi' as PgTown };
const C3 = { ch: 3 as const, band: 'hiru' as PgBand, town: 'umi' as PgTown };

export const YR_ROWS: YrRow[] = [
  // ---------------------------------------------------------------- ① 夕鳴町（夕方）
  { ...C1, id: 'yr_c1_roof', kn: true, done: f('flag_roof_handshake'), name: '屋上の『4人目』', hint: ['夕方。モールの 屋上。', 'グソっ君と いっしょに。'], npcs: [] },
  { ...C1, id: 'yr_c1_maru', kn: false, done: f('flag_maru_dengon'), name: '5時の バスを 待つ', hint: ['夕方。駐車場の バス停。', 'ベンチの マルに。'], npcs: ['npc_maru'] },
  { ...C1, id: 'yr_c1_kensui', kn: false, done: f('flag_got_hanamaru_kensui'), name: '巡査の 懸垂', hint: ['夕方。公園の 鉄棒と、交番。', 'ワイスタ巡査に。'], npcs: ['npc_tsurumi'] },
  { ...C1, id: 'yr_c1_zari', kn: false, done: f('flag_zari_ramune'), name: '浮きを 見ている だけ', hint: ['夕方。川の 向こう岸。', '水口の おぴぃに。'], npcs: ['npc_tamotsu'] },
  { ...C1, id: 'yr_c1_mizube', kn: false, done: f('flag_mizube_yurai_done'), name: '水辺の 図鑑①', hint: ['夕方。堰と、家の 台所。', 'おぴぃと、母に。'], npcs: ['npc_tamotsu', 'npc_mother'] },
  { ...C1, id: 'yr_c1_suito', kn: false, done: f('flag_aze_suito'), name: '水の はなまる', hint: ['夕方。畦道の 先の 分水。', 'いつきと あさひに。'], npcs: ['npc_yone', 'npc_toyozou'] },
  { ...C1, id: 'yr_c1_kitsune', kn: false, done: f('flag_abura_eaten'), name: 'きつねの 常連', hint: ['夕方。豆腐屋と、畦道の 祠。', 'くま吉に。'], npcs: ['npc_mamekichi'] },
  { ...C1, id: 'yr_c1_toban', kn: false, done: f('flag_toban_done'), name: '8月31日の 水やり当番', hint: ['夕方。小学校の 裏庭。', 'さやに。'], npcs: ['npc_sae'] },
  { ...C1, id: 'yr_c1_kotei', kn: true, done: f('flag_kotei_done'), name: '二人十五脚', hint: ['夕方。坂の なんばるわんの 家。', 'グソっ君と いっしょに。'], npcs: ['npc_madam', 'npc_kazuo'] },
  { ...C1, id: 'yr_c1_tokei7', kn: true, done: f('flag_tokei7_done'), name: 'チクタク堂の 7つの 時計', hint: ['夕方。時計屋の ウィンドウ。', 'グソっ君と いっしょに。'], npcs: ['npc_tokio'] },
  { ...C1, id: 'yr_c1_hajimete', kn: true, done: all(...HJ1.map(pageFlag)), name: 'はじめて帳①', hint: ['夕方。町の あちこちの 8人。', 'グソっ君と いっしょに。'], npcs: ['npc_mizumaki', 'npc_mamekichi', 'npc_madam', 'npc_kazuo', 'npc_fudeno', 'npc_inui', 'npc_tsurumi', 'npc_obaa'] },
  { ...C1, id: 'yr_c1_hokoku', kn: true, done: f('flag_hk_closed'), name: 'ダンゴムシ ちゃうで', hint: ['夕方。交番と、町の 人たち。', 'グソっ君と いっしょに。'], npcs: HK_NPCS },
  { ...C1, id: 'yr_c1_katanuki', kn: true, done: f('flag_katanuki_rank'), name: '型ぬき 番付', hint: ['夕方。駄菓子 ひのや。', 'グソっ君と いっしょに。'], npcs: ['npc_obaa'] },
  { ...C1, id: 'yr_c1_cape', kn: true, done: f('flag_cape_takashi'), name: 'ふろしきの マント', hint: ['夕方。焼きそばの たかしの 店。', 'グソっ君と いっしょに。'], npcs: ['npc_maruyama', 'npc_obaa'] },
  { ...C1, id: 'yr_c1_bu', kn: false, done: f('flag_bu_left'), name: '減らない コーヒー', hint: ['夕方。喫茶 初日の出。', 'すみの 席の 人に。'], npcs: ['npc_bu_body', 'npc_master'] },
  { ...C1, id: 'yr_c1_hera', kn: false, done: f('flag_hera_look'), name: '置物の ヘラ', hint: ['夕方。焼きそばの たかしの 前。', '何度か 見に 行って。'], npcs: [] },
  { ...C1, id: 'yr_c1_tankan', kn: false, done: f('flag_tankan_given'), name: 'しんごの たんかん', hint: ['夕方。しんごの 縁台。', '喫茶の 冷凍庫も。'], npcs: ['npc_ojii', 'npc_master'] },
  { ...C1, id: 'yr_c1_hunting', kn: true, done: f('flag_hunting_chichi'), name: 'ハンチングの 値札①', hint: ['夕方。踏切の そば。', 'グソっ君と いっしょに。'], npcs: ['npc_jk'] },

  // ---------------------------------------------------------------- ② 星見台（夜）
  { ...C2, id: 'yr_c2_barn', kn: false, done: f('flag_ch2_barn_work'), name: '牛舎の おてつだい', hint: ['夜。東の 牛舎。', 'マサルに。'], npcs: ['npc_hoshi_gen'] },
  { ...C2, id: 'yr_c2_deli', kn: false, done: f('flag_ch2_delivery'), name: '野菜を 家に 運ぼう', hint: ['夜。転回場の 軽トラ。', 'ツガオ便の 3人と。'], npcs: ['npc_hirosuke', 'npc_pokosha'] },
  { ...C2, id: 'yr_c2_mushi', kn: false, done: f('flag_ch2_mushi_done'), name: '捕まえない 自由研究', hint: ['夜。村の 灯りの 中。', '灯りで 照らして。'], npcs: ['npc_hoshi_yoshie'] },
  { ...C2, id: 'yr_c2_sawa', kn: false, done: f('flag_ch2_sawa_seki'), name: '沢の上「水の 元」', hint: ['夜。沢の 上。', 'トマじいに。'], npcs: ['npc_hoshi_tome'] },
  { ...C2, id: 'yr_c2_maru', kn: false, done: () => flag('flag_ch2_maru_told') >= 2, name: 'マルの 伝言', hint: ['夜。星見台の 田んぼ。', 'マルの 伝言を トマじいへ。'], npcs: ['npc_hoshi_tome'] },
  { ...C2, id: 'yr_c2_wakime', kn: false, done: f('flag_ch2_wakime_done'), name: '脇芽は 朝に かく', hint: ['夜。トマトの ハウス。', 'ペロに。'], npcs: ['npc_hoshi_mitsu'] },
  { ...C2, id: 'yr_c2_nihyaku', kn: false, done: f('flag_nihyaku_done'), name: '二百十日の 前の 晩', hint: ['夜。村の 4人。', '風の 話を 聞いて。'], npcs: ['npc_hoshi_tome', 'npc_hoshi_gen', 'npc_hoshi_mitsu', 'npc_hoshi_kucho'] },
  { ...C2, id: 'yr_c2_dome', kn: false, done: f('flag_kanbo_report'), name: '朝の ほうだけ 光る 星', hint: ['夜。分校の 裏の 丘。', 'まつ先生に。'], npcs: ['npc_hoshi_fumi'] },
  { ...C2, id: 'yr_c2_ekinote', kn: false, done: () => flag('flag_ekinote_read') >= 5, name: '駅ノートの 前の ページ', hint: ['夜。駅の 待合小屋。', 'ノートを めくって。'], npcs: [] },
  { ...C2, id: 'yr_c2_shikishi', kn: false, done: f('flag_shikishi_done'), name: '70年の 色紙', hint: ['夜。集会所。', 'ハモ区長に。'], npcs: ['npc_hoshi_kucho'] },
  { ...C2, id: 'yr_c2_yoburi', kn: false, done: f('flag_yoburi_report'), name: '夜振りの ドジョウ', hint: ['夜。田んぼの 水路。', 'トマじいに。'], npcs: ['npc_hoshi_tome'] },
  { ...C2, id: 'yr_c2_ashiato', kn: false, done: f('flag_ashiato_six'), name: '夜の 足あと帳', hint: ['夜。村の 道。', 'マサルに。'], npcs: ['npc_hoshi_gen'] },
  { ...C2, id: 'yr_c2_hajimete', kn: true, done: all(...HJ2.map(pageFlag)), name: 'はじめて帳②', hint: ['夜。村の 6人。', 'グソっ君と いっしょに。'], npcs: ['npc_hoshi_yoshie', 'npc_hoshi_mitsu', 'npc_hoshi_tome', 'npc_hoshi_sawako', 'npc_hoshi_kucho', 'npc_hoshi_busdriver'] },
  { ...C2, id: 'yr_c2_tenban', kn: false, done: f('flag_tenban_done'), name: '無人販売所の 店番', hint: ['夜。ソワカの 無人販売所。', 'ソワカに。'], npcs: ['npc_hoshi_sawako'] },
  { ...C2, id: 'yr_c2_mimi', kn: true, done: f('flag_mimi_awase'), name: 'ふくじんづけと 耳', hint: ['夜。村の 5人。', 'グソっ君と いっしょに。'], npcs: ['npc_hoshi_gen', 'npc_hoshi_fumi'] },
  { ...C2, id: 'yr_c2_taihi', kn: true, done: f('flag_taihi_done'), name: '堆肥の 中の 親戚', hint: ['夜。堆肥舎の 張り紙。', '灯りと、グソっ君と。'], npcs: ['npc_hoshi_gen', 'npc_hoshi_mitsu', 'npc_hoshi_tome'] },
  { ...C2, id: 'yr_c2_saku', kn: true, done: f('flag_saku_done'), name: '上の 柵ぞいの 見回り', hint: ['夜。牛舎の 上の 柵。', 'グソっ君と いっしょに。'], npcs: ['npc_hoshi_gen'] },
  { ...C2, id: 'yr_c2_tetsu', kn: true, done: f('flag_tetsu_done'), name: '分校の 鉄棒', hint: ['夜。分校の 鉄棒。', 'グソっ君と いっしょに。'], npcs: ['npc_hoshi_fumi'] },
  { ...C2, id: 'yr_c2_hunting', kn: true, done: f('flag_hunting_on'), name: 'ハンチングの 値札②', hint: ['夜。ペロの 家の 壁。', 'グソっ君と いっしょに。'], npcs: ['npc_hoshi_mitsu'] },
  { ...C2, id: 'yr_c2_sawako', kn: false, done: f('flag_ch2_sawako_yk'), name: 'ソワカの 色見本', hint: ['夜。ソワカの 家の 壁。', '2回 見てから、ソワカに。'], npcs: ['npc_hoshi_sawako'] },
  { ...C2, id: 'yr_c2_tegami', kn: false, done: f('flag_ch2_tegami'), name: '『あした』宛ての 手紙', hint: ['夕方の 夕鳴町で 郵便屋に。', '夜の 星見台で さんかどに。'], npcs: ['npc_hoshi_busdriver'] },

  // ---------------------------------------------------------------- ③ 海ぞいの町（昼）
  { ...C3, id: 'yr_c3_moguri', kn: true, done: () => flag('flag_ch3_moguri_n') >= 4, name: 'グソっ君の 潜り', hint: ['昼。港の 階段から 海へ。', 'グソっ君が 潜る。'], npcs: [] },
  { ...C3, id: 'yr_c3_denpyo', kn: false, win: aq, done: () => flag('flag_ch3_denpyo_n') >= 12, name: '回廊の 伝票', hint: ['朝から 夕方まで。旧水族館。', '回廊の 壁を。'], npcs: [] },
  { ...C3, id: 'yr_c3_nisshi', kn: false, win: aq, done: () => flag('flag_ch3_nisshi_n') >= 6, name: '深海の 飼育日誌', hint: ['朝から 夕方まで。旧水族館。', '深海の 展示室の 床を。'], npcs: [] },
  { ...C3, id: 'yr_c3_esa', kn: false, win: aq, done: f('flag_ch3_esa_fuda'), name: 'えさの 札', hint: ['朝から 夕方まで。旧水族館。', 'えさの 部屋を。'], npcs: [] },
  { ...C3, id: 'yr_c3_fucho', kn: false, done: () => flag('flag_ch3_fucho_n') >= 5, name: '符丁の 切れはし', hint: ['昼。市場の 床。', '足もとを よく 見て。'], npcs: ['npc_c3_seri_deshi'] },
];

/** 窓が 今 開いているか（町は問わない。ページの印の明るさ・会話の判定）。 */
export function yrWindowOpen(r: YrRow, band: PgBand): boolean {
  return r.win ? r.win() : r.band === band;
}

/** やり残しの数（済んでいない行）。 */
export function yrLeft(): number {
  return YR_ROWS.filter((r) => !r.done()).length;
}

/** ふしぎ：①12・②10・③10（2.1〜2.3）。 */
export const YR_FUSHIGI: { ch: 1 | 2 | 3; ids: string[] }[] = [
  { ch: 1, ids: Array.from({ length: 12 }, (_, i) => `fushigi_${String(i + 1).padStart(2, '0')}`) },
  { ch: 2, ids: Array.from({ length: 10 }, (_, i) => `fushigi_ch2_${String(i + 1).padStart(2, '0')}`) },
  { ch: 3, ids: Array.from({ length: 10 }, (_, i) => `fushigi_ch3_${String(i + 1).padStart(2, '0')}`) },
];

/** その章の ふしぎ [押した数, 全部]。 */
export function yrFushigi(ch: 1 | 2 | 3): [number, number] {
  const ids = YR_FUSHIGI.find((x) => x.ch === ch)!.ids;
  return [ids.filter((id) => flag('flag_' + id) > 0).length, ids.length];
}

/** 全部そろった（44行とふしぎ32。10.1 の入口）。 */
export function yrAllDone(): boolean {
  return yrLeft() === 0 && YR_FUSHIGI.every((x) => x.ids.every((id) => flag('flag_' + id) > 0));
}

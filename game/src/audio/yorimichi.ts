// 寄り道が 始まった ときの 小さな 音（改善会議 2026-10-24 の4。音は sfx_yorimichi.ts の se_yorimichi）。
//
// 寄り道（げむきか案ほかの サブイベント）には 始まりの 共通の 入口が ないので、それぞれが 始まった ときに
// 立てる flag（台本の「〔…〕＋ flag_xx_start」）を 表で 持つ。setFlag が その flag を 0 から 立てた ときに
// 1回だけ 鳴らす（セーブを 読んだ とき・新しく 始めた ときは state.flags を まとめて 入れるので 鳴らない）。
// 寄り道を 足したら、その 始まりの flag を 下の 表に 1行 足す。

import { onFlagRaised } from '../game/state';
import { registerDebug } from '../debug';
import { sfx } from './index';

/** 寄り道の 始まりの flag（ファイル：寄り道の 名前）。 */
export const YORIMICHI_START: Record<string, string> = {
  // ---- 第2章（src/events/ch2）
  flag_an_start: 'akinasu 切ったら、また なる',
  flag_as_start: 'asairo 朝の 前の 色',
  flag_ashiato_start: 'ashiato 夜の 足あと帳',
  flag_bm_start: 'busmaku 幕の 中の 停留所',
  flag_hg_start: 'hagama 赤子 泣いても',
  flag_ky_start: 'kyuri 絵の きゅうりは、とり遅れない',
  flag_hn_start: 'hana ごはん 一粒、花 一つ',
  flag_hm_start: 'himo 紐の 番',
  flag_ku_start: 'kutsu はく 前に、ふる',
  flag_rt_start: 'retasu 寝とる うちに、とる',
  flag_hb_start: 'hokihata 穂は ほうき、茎は 柄',
  flag_sb_start: 'soba ちがう 花が、となりに',
  flag_ks2_start: 'touge 雲の 下にも、郵便受け',
  flag_nh_start: 'negi 土を 寄せるほど、白く なる',
  flag_mimi_start: 'mimi ふくじんづけと 耳の あいさつ',
  flag_mg_start: 'mushigomu 上へ 降る 雪',
  flag_nr_start: 'neru 前から 寝る',
  flag_saku_start: 'sakuzoi 上の 柵ぞいの 見回り',
  flag_ub_start: 'ushibana 鼻が しゃべる',
  flag_shikishi_start: 'shikishi 70年の 色紙と 小さな 夏祭り',
  flag_ss_start: 'shishito 当たりは、かじって みんと',
  flag_uz_start: 'uzu 2枚の うず',
  flag_yw_start: 'yuwaka 湯を わかしてから',
  // ---- 第3章（src/events/ch3）
  flag_ab_start: 'abura 毎晩の 油',
  flag_im_start: 'imo 急かすと、甘うならん',
  flag_iso_start: 'iso 本日は、開館です',
  flag_kr_start: 'kori 明日の 朝の 氷',
  flag_ag_start: 'amigoya 破れたら、つくろう',
  flag_hs_start: 'housou 終わりの 音は、下がる',
  flag_fr_start: 'fureai 目で、いちばん 長く',
  flag_mh_start: 'mahiru 真昼の 顔',
  flag_mk_start: 'mikan 落とすけえ、甘うなる',
  flag_mz_start: 'mizukiri 低う、平たく',
  flag_ng_start: 'nukegara 背中から、1回で',
  flag_sk_start: 'sakana やっと、魚の 昼',
  flag_tk_start: 'tokoro つるっと、終われる',
  flag_sr_start: 'shiro 波に 見せる 城',
  flag_dm_start: 'diorama3 荷台から 見た 村',
  flag_tm_start: 'tsumeta 穴は、だれかの ごちそうさま',
  flag_yd_start: 'yose 海の 水で 寄せる',
};

/** QA: 鳴らした 寄り道（flag と 時刻）。 */
const rang: { flag: string; at: number }[] = [];

onFlagRaised((id) => {
  if (!(id in YORIMICHI_START)) return;
  sfx('se_yorimichi');
  if (import.meta.env.DEV) rang.push({ flag: id, at: Math.round(performance.now()) });
});

if (import.meta.env.DEV) {
  /** QA：寄り道の 始まりで 鳴らした 記録（`clear`：空に）、表の flag。 */
  registerDebug('yorimichiLog', (clear = false) => {
    const r = { rang: rang.slice(), table: Object.keys(YORIMICHI_START) };
    if (clear) rang.length = 0;
    return r;
  });
}

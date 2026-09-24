// ミナトの家（潮見家）: map_home_2f（開始地点）と map_home_1f。
// 30_level_art.md 4.1 / 4.2、テキストは 10_narrative.md 7.1 / 7.2。

import { registerMap } from '../../world/maps';
import type { MapObj, TileSpec } from '../../world/types';

export const INDOOR_LEGEND: Record<string, TileSpec> = {
  '#': { ground: 'void', solid: true, tag: 'void' },
  W: { ground: 'void', solid: true, tag: 'iwall' },
  '.': { ground: 'wood_bare' },
  t: { ground: 'tatami', step: 'se_step_tatami' },
  k: { ground: 'kitchen' },
  g: { ground: 'genkan' },
  o: { ground: 'auto', solid: true, tag: 'prop' },
  '<': { ground: 'wood_bare', door: true, tag: 'stairs' },
  '>': { ground: 'wood_bare', door: true, tag: 'stairs' },
  D: { ground: 'void', solid: true, door: true, tag: 'door' },
  e: { ground: 'engawa' },
};

const T = (id: string, x: number, y: number, text: string | Record<string, string>, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'obj', id, x, y, text, ...extra }) as MapObj;

// ---------------------------------------------------------------- 2F
const ROWS_2F = [
  '#WWWWWWWW#',
  '#WWWWWWWW#',
  '#oo.ooo.o#',
  '#oo.....o#',
  '#ooo.....#',
  '#.......>#',
  '##########',
];

const OBJ_2F: MapObj[] = [
  { t: 'prop', prop: 'room_home_2f', x: 0, y: 0 },
  { t: 'prop', prop: 'room_home_2f_decor', x: 3, y: 3 },
  // 天井の丸い照明（前景。ひもが揺れる）— 4.1
  { t: 'prop', prop: 'prop_ceiling_light', x: 7, y: 4, opts: { ly: -30, cord: 22 } },
  T('obj_bed', 1, 2, `@narr
タオルケットが ねじれて、
なにかの 生き物みたいに
なっている。`, { w: 2, h: 3 }),
  T('obj_calendar_room', 3, 1, `@narr
夏休みの 予定表。
『8/31 じゆうけんきゅう』に、
赤丸が 3重に ついている。`, { face: 'up' }),
  T('obj_desk_room', 5, 2, `@narr
消しゴムの カスで、
小さな 山脈が できている。`),
  T('obj_jiyukenkyu', 4, 2, {
    s0: `@narr
表紙が まぶしいほど 白い。`,
    's1+': `@narr
表紙は まだ 白い。{w=300}
……でも、書きたい ことは
増えてきた。`,
  }),
  T('obj_mushikago', 6, 2, {
    s0: `@narr
カブトムシの ゲンジロウ。
夏休みの 最初の 日に 捕まえた。
/
……あした、放しに 行こう。`,
    's1+': `@narr
ゲンジロウも、空を 見上げている。
……気が する。`,
  }),
  T('obj_window_room', 7, 1, {
    s0: `@narr
夕日が まるい。{w=300}
赤い ハンコを 押したみたいに、
くっきり している。`,
    s1: `@narr
夕日が 動かない。{w=300}
空に 貼りついている。`,
    's2+': `@narr
夕日の まわりだけ、空が
めくれかけて 見える。`,
  }, { face: 'up' }),
  T('obj_bookshelf_room', 8, 2, `@narr
図鑑と マンガと、
開いていない 『夏休みの友』。{w=300}
友だちとは 言いにくい。`),
  T('obj_randoseru', 8, 3, `@narr
あしたから また 背負う。{w=300}
中に まだ 1学期の
プリントが 入っている。`),
  T('obj_fan', 3, 4, {
    s0: `@narr
『強』の ボタンだけ
すりへっている。`,
    's1+': `@narr
首ふりが、右を 向いたまま
止まった。`,
  }),
  { t: 'door', id: 'door_home_stairs_down', x: 8, y: 5, to: 'map_home_1f', tx: 12, ty: 3, dir: 'down', se: 'se_stairs', step: true },
];

registerMap({
  id: 'map_home_2f',
  name: 'ミナトの部屋',
  kind: 'indoor',
  rows: ROWS_2F,
  legend: INDOOR_LEGEND,
  objects: OBJ_2F,
  camera: 'fixed',
  onEnter: ['evt_opening'],
  bgm: { 0: 'bgm_home', 1: 'bgm_home', 2: 'bgm_home' },
  amb: { 0: ['amb_fan', 'amb_higurashi'], 1: ['amb_fan'], 2: ['amb_fan'] },
  space: 'room',
  theme: 'home',
  light: 'top',
});

// ---------------------------------------------------------------- 1F
const ROWS_1F = [
  '#WWWWWWWWWWWW#',
  '#WWWWWWWWWWWW#',
  '#oooooo.oo..<#',
  '#kkkkk.tttttt#',
  '#kkkkk.ttoott#',
  '#......tttttt#',
  '#oggg..tttttt#',
  '#ggggeeeeeeee#',
  '##D###########',
];

const OBJ_1F: MapObj[] = [
  { t: 'prop', prop: 'room_home_1f', x: 0, y: 0 },
  { t: 'prop', prop: 'prop_ceiling_light', x: 9, y: 4, opts: { ly: -28 } },
  T('obj_cabbage', 1, 2, `@narr
キャベツの 千切りが 山に
なっている。{w=300}コロッケを
迎える 準備は 万全だ。`),
  { t: 'prop', prop: 'prop_cutting_board', x: 2, y: 2 },
  T('obj_rice_cooker', 3, 2, {
    s0: `@narr
炊飯器が 『保温』で 光っている。
炊きあがりまで、あと 42分。`,
    's1+': `@narr
炊きあがりまで 『あと 42分』。{w=300}
さっきも 42分だった。`,
  }),
  { t: 'prop', prop: 'prop_stove', x: 4, y: 2 },
  T('obj_fridge', 5, 2, {
    s0: `@narr
麦茶、なすの 漬物、
名前の 書いてある プリン。{w=300}
名前は 母。`,
    's1+': `@narr
冷蔵庫の 音が 止まっている。{w=300}
中は、冷えたまま。`,
  }),
  T('obj_cat_calendar', 6, 2, {
    s0: `@narr
猫の カレンダー。{w=300}
8月の 猫は、箱に 入っている。
/
9月の 猫も、たぶん
箱に 入っている。`,
    's1+': `@narr
めくろうと したが、
9月が めくれない。{w=300}
のりで 貼ったみたいに。`,
  }),
  T('obj_tv', 8, 2, {
    s0: `@narr
夕方の ニュース。{w=300}
『夕鳴町の 5時の チャイム、
今年で 50周年』。`,
    s1: `@narr
アナウンサーが 同じ 原稿を
3回 読んでいる。{w=300}
本人は 気づいていない。`,
    's2+': `@narr
画面には 『しばらく お待ち
ください』。{w=300}お待ちしている
人の 絵が 描いてある。`,
  }, { w: 2 }),
  T('obj_chabudai', 9, 4, `@narr
麦茶の ポット。
水滴で、ちゃぶ台に
輪じみが できている。`, { w: 2 }),
  T('obj_newspaper', 9, 5, `@narr
夕刊。テレビ欄に、母の 字で
赤丸が ついている。{w=300}
『ドラマ 最終回』。`, { flat: true }),
  T('obj_genkan', 1, 6, `@narr
靴箱の 上の カギ置き。{w=300}
ミナトの カギは、
首に かかっている。`),
  T('obj_katori', 8, 7, {
    s0: `@narr
蚊取り線香。{w=300}
うずまきの 真ん中まで、
あと 半分。`,
    's1+': `@narr
煙が、空中で 止まっている。`,
  }, { flat: true }),
  T('obj_furin', 10, 7, {
    s0: `@narr
風鈴が 鳴った。{w=300}
……風は ないのに。`,
    's1+': `@narr
風鈴が、鳴りかけの
形の まま 止まっている。`,
  }, { flat: true, face: 'down' }),
  {
    t: 'npc', id: 'npc_mother', x: 2, y: 3, dir: 'up', script: 'npc_mother', pose: 'chop',
    talk: {
      s0_1: `@npc_mother
コロッケ 4つ。ソースは 別。{w=300}
……はい、復唱。
? べつ | いっしょ
[べつ]
@npc_mother
よろしい。
[いっしょ]
@npc_mother
別！
[-]`,
      s0_2: `@npc_mother
肉屋は 坂を 上って、右。
チャイムが 鳴るまでに 帰ること。`,
      s1_1: `@npc_mother
チャイム、途中で 止まったわね。
/
……止まったなら、
まだ 5時じゃ ないって ことよ。
/
顔が 夕焼け色よ。{w=300}
麦茶 飲んでいきなさい。
!heal
@sys
麦茶を 飲んだ。
HPが 回復した。`,
      s1_2: `@npc_mother
チャイム、途中で 止まったわね。
@narr
……さっきと 同じ ところで、
同じ ように 首を かしげた。
@npc_mother
麦茶 飲んでいきなさい。
!heal
@sys
麦茶を 飲んだ。
HPが 回復した。`,
      s2_1: `@npc_mother
あら、カネナリくん。{w=300}
引退したんじゃ なかったの？
@flip
（非公式です）
@npc_mother
そう。{w=300}
非公式なら しかたないわね。
/
麦茶、2人ぶん いれとくわね。
!heal
@narr
カネナリくんの 麦茶は、
いつのまにか からに なっていた。`,
      s2_2: `@npc_mother
キャベツ、切りすぎちゃった。{w=300}
……コロッケ、まだかしら。
/
麦茶 飲んでいきなさい。
!heal
@sys
麦茶を 飲んだ。
HPが 回復した。`,
    },
  },
  { t: 'door', id: 'door_home_stairs', x: 12, y: 2, to: 'map_home_2f', tx: 7, ty: 5, dir: 'left', se: 'se_stairs', step: true },
  { t: 'door', id: 'door_home_genkan', x: 2, y: 8, to: 'map_town', tx: 4, ty: 31, dir: 'down', se: 'se_door' },
  { t: 'trig', id: 'trig_errand', x: 1, y: 2, w: 5, h: 4, script: 'evt_errand', cond: { notFlag: 'flag_errand' } },
];

registerMap({
  id: 'map_home_1f',
  name: '潮見家 1F',
  kind: 'indoor',
  rows: ROWS_1F,
  legend: INDOOR_LEGEND,
  objects: OBJ_1F,
  camera: 'fixed',
  bgm: { 0: 'bgm_home', 1: 'bgm_home', 2: 'bgm_home' },
  amb: { 0: ['amb_fridge', 'amb_tv'], 1: ['amb_tv'], 2: ['amb_tv'] },
  space: 'room',
  theme: 'home',
  light: 'left',
});

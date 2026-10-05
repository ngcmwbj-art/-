// ヒキヅナ (enemy_hikizuna, 二人十五脚 02 #82、10_narrative 7.25、30_level_art 3.17): 運動会の 綱引きの 綱。
// 夕鳴小学校の 体育倉庫に しまわれて いたが、段階2（北東へ 引かれる 町）で 倉庫の 戸の すきまから 出て、
// 校庭を 北東へ ずるずる 這っていく。引っぱる 相手（もう 1組）が いないので、ひとりで「オーエス」。
// ボケは「ひとりで 綱引き」。はなまる（だれも 倒されない）で 直すと、倉庫の 前で とぐろを 巻いて まるまる。
// 任意の 敵で、みました帳の『あいて』には 数えない（第1章の 7体・ツッコミ 19 は そのまま。タイトルの 達成数を
// 変えない）。お金は 落とさない。

import type { AiCtx, EnemyDef } from './types';

export const HIKIZUNA: EnemyDef = {
  id: 'enemy_hikizuna', name: 'ヒキヅナ', lvl: 3, size: [96, 56], core: [46, 36], face: [80, 16],
  hp: 46, atk: 11, def: 6, spd: 6, luck: 4, exp: 16, money: 0, attr: { da: 1, han: 1, wara: 1.3 }, drops: [],
  bg: 'bg_kanenari', bgm: 'bgm_battle', tsukkomiCount: 2,
  tsukkomi: ['ひとりで 綱引きするな！', 'ゴールは そっちじゃない！'],
  skills: ['skill_hiki_tsuna', 'skill_hiki_oesu', 'skill_hiki_zuru', 'skill_hiki_toguro', 'skill_idle'],
  colors: ['#C8A06A', '#8A5A3A', '#E8C890', '#E23B2E', '#F4F1E8'],
  ai: (c: AiCtx) => {
    if (c.acts === 0) return 'skill_hiki_tsuna';
    const coil = c.defStage >= 2 ? 0 : 1;
    return c.pick([['skill_hiki_tsuna', 35], ['skill_hiki_oesu', 25], ['skill_hiki_zuru', 25], ['skill_hiki_toguro', 10 * coil], ['skill_idle', 5]]);
  },
  texts: {
    appear: ['ヒキヅナが 北東へ\nずるずる 這ってきた！'],
    yousu: ['ヒキヅナの まん中に、\n赤と 白の 布が まいてある。', 'ヒキヅナは 引っぱる 相手を\nさがしている。', 'ヒキヅナの はしが、\n北東を 向いている。'],
    tele: {
      skill_hiki_tsuna: ['ヒキヅナは $targetに\nからみついて 引っぱった！'],
      skill_hiki_oesu: ['ヒキヅナは ひとりで\n『オーエス！ オーエス！』'],
      skill_hiki_zuru: ['ヒキヅナは $targetを\n北東へ ずるずる 引きずった！'],
      skill_hiki_toguro: ['ヒキヅナは その場で\nとぐろを 巻いた。'],
    },
    extra: {
      toguroResult: ['ヒキヅナの まもりが 上がった！'],
    },
    idle: [['ヒキヅナは 引く 相手が いなくて、\nちょっと たるんだ。'], ['ヒキヅナは 自分の はしを\n自分で 引っぱった。']],
    defeat: ['ヒキヅナは、運動会の\n日を 思いだした。', '綱は、倉庫の 前で\nまるまった。'],
  },
  book: { short: '綱', shotai: '運動会の 綱引きの 綱。体育倉庫に しまわれて いた。', weak: '笑い。引っぱる 相手が いないと、たるむ。', hitokoto: '引っぱる 相手を、ずっと 待っていた。' },
};

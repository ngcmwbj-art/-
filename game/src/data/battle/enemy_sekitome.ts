// セキトメ (enemy_sekitome, 51 8.7・50 6.9、02 #65): 沢の上の、石を積んだ小さなせき。
// 分校の子ども（もと・アスカ）が夏休みに作ったプールのせきで、『遊泳は 5時まで』の
// 札がある。5時が来ないので閉場できず、水をためこんで取水口の水を細くしている。
// ボケは監視員（ラウンドの終わりに「閉場 1分前です。……ずっと。」）。
//
// 仕組みはテツヤの「徹夜」と同じ（status_tetsuya・restAlways・restActions 2）で、
// 見た目と音だけが違う（duty：テープ「監視中」、笛の音、石を積みなおすポーズ）。
// おつかれさまで「閉場」すると、まもりの段階が0にもどり、2回休む（弱点）。
// 任意の敵（第2章の敵が1体ふえる。51 8.6）。

import type { AiCtx, EnemyDef } from './types';

export const SEKITOME: EnemyDef = {
  id: 'enemy_sekitome', name: 'セキトメ', lvl: 6, size: [80, 48], core: [40, 30], face: [40, 14], chapter: 2,
  hp: 160, atk: 16, def: 13, spd: 7, luck: 5, exp: 40, money: 0, attr: { da: 0.7, han: 1.3, wara: 1 }, drops: [],
  bg: 'bg_h_sawa', bgm: 'bgm_battle', tsukkomiCount: 2, startStatus: ['status_tetsuya'], restActions: 2, restAlways: true,
  duty: { tape: '監視中', restSe: 'se_h_seki_heijou', restartSe: 'se_h_whistle', nightSe: 'se_h_whistle', nightPose: 'whistle' },
  tsukkomi: ['走ってないし！', 'ここ、沢だよ！'],
  skills: ['skill_seki_fue', 'skill_seki_shibuki', 'skill_seki_mansui', 'skill_idle'],
  colors: ['#C8C2B4', '#9AA0A8', '#E84E3C', '#4AA8E0', '#F4F1E8'],
  ai: (c: AiCtx) => {
    // the first move is always the whistle (the lifeguard's first word)
    if (c.acts === 0) return 'skill_seki_fue';
    // 満水 (まもり+1) only while it has room to harden (its 監視 adds more at the round's end)
    const full = c.defStage >= 2 ? 0 : 1;
    return c.pick([['skill_seki_fue', 35], ['skill_seki_shibuki', 35], ['skill_seki_mansui', 20 * full], ['skill_idle', 10]]);
  },
  texts: {
    appear: ['セキトメが 笛を くわえて\n沢を ふさいでいる！'],
    yousu: ['セキトメの 札：\n『遊泳は 5時まで』。', 'せきの 上で、水が\nぱんぱんに ふくらんでいる。', 'セキトメは 笛を くわえたまま、\nまばたきを しない。'],
    yousuSpecial: {
      first: 'グソっ君「真水は ちょっと\n苦手やねん」',
      tetsuya: 'セキトメは 水面を\n見張りつづけている。',
      kyuukei: 'セキトメは 札を 裏返して、\nひと息 ついている。',
    },
    tele: {
      skill_seki_fue: ['セキトメは 笛を 吹いた！\n『プールサイドは 走らない！』'],
      skill_seki_shibuki: ['セキトメは 水を はね上げた！\n『シャワーを あびてから！』'],
      skill_seki_mansui: ['セキトメは 石を 1つ\n積みなおした。『満水です』'],
    },
    extra: {
      // the round's end while it keeps watch (the first two nights say it; 51 9.2 の決まり)
      roundEnd: ['セキトメ『閉場 1分前です。』\n……ずっと。'],
      mansuiResult: ['セキトメの まもりが 上がった！'],
      otsukareOk: ['セキトメの 札が、くるりと\n裏返った。『本日の 営業は 終了』', 'プールが 閉場した！'],
      restEnd: ['セキトメは 札を 表に もどした。\n『閉場 1分前です』'],
      // グソっ君 says it (battle/gusokkun.ts knSay); hintNarr when he is down
      hint: ['プールの 人も、\n休む 時間やで。'],
      hintNarr: ['セキトメは、ずっと\n見張りつづけている。'],
      hintFlip: ['プールの 人も、\n休む 時間やで'],
      hintFlip2: ['監視の 人も、\n休む 時間やで'],
    },
    idle: [['セキトメは 流れてきた 葉っぱに\n笛を 吹いた。ピッ。'], ['セキトメは 水面を じっと\n見張っている。']],
    defeat: ['セキトメは、夏休みの\nおわりを 思いだした。', '石が ほどけて、\n水が 流れはじめた。'],
  },
  book: { short: '石の せき', shotai: '分校の 子どもが 沢に 積んだ、プールの せき。', weak: 'おつかれさま（閉場すると まもりが 下がる）。', hitokoto: '5時まで 見張る 約束を、ずっと 守っていた。' },
};

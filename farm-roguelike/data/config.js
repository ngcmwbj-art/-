'use strict';
/* =========================================================
   ゲーム全体の設定
   - ゲーム名は title を書き換えるだけで全画面に反映される
   ========================================================= */
window.FR = window.FR || {};

FR.Config = {
  title: '追い返せ！ボクらの防農作戦！',   // ゲーム名
  subtitle: '山と森と畑の一年',
  saveKey: 'farm-roguelike-save',
  energy: 3,                      // 毎ターンのエネルギー
  handSize: 5,                    // 毎ターン引く枚数
  handMax: 10,                    // 手札の上限
  rewardChoices: 3,               // 戦闘後に選べるカードの数
  // 進み具合（レベル）ごとの敵の強化。レベル = 季節×3 ＋ 段÷2（春の最初が 0、冬の終わりが 11）
  // 勢いは レベル1つにつき hpPerLevel 割増え、力（攻撃の上乗せ）は strengthEvery レベルごとに+1
  scaling: { hpPerLevel: 0.12, strengthEvery: 2 },
  // 難しさ（農家を選ぶ画面で選ぶ）。enemyHp・enemyDamage：敵の勢い（体力）と攻撃に掛ける倍率
  difficulties: {
    normal: { name: 'ふつう', text: 'ほどよい手ごたえ', enemyHp: 1, enemyDamage: 1 },
    easy:   { name: 'のんびり', text: '敵が少し弱い。はじめての人に', enemyHp: 0.8, enemyDamage: 0.8 }
  },
  defaultDifficulty: 'normal',

  // 戦闘を始めるたびに回復する健康度
  battleStartHeal: 5,
  saveVersion: 2
};

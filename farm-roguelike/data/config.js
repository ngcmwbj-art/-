'use strict';
/* =========================================================
   ゲーム全体の設定
   - タイトルは未定。決まったら title を書き換えるだけで全画面に反映される
   ========================================================= */
window.FR = window.FR || {};

FR.Config = {
  title: 'タイトル未定',          // ゲーム名（考え中）
  subtitle: '山と森と畑の一年',
  saveKey: 'farm-roguelike-save',
  saveVersion: 1,
  energy: 3,                      // 毎ターンのエネルギー
  handSize: 5,                    // 毎ターン引く枚数
  handMax: 10,                    // 手札の上限
  rewardChoices: 3,               // 戦闘後に選べるカードの数
  // 戦闘を重ねるごとの敵の強化（最小プレイ版の「何戦続けられるか」用）
  scaling: { hpPerBattle: 5, damageEveryBattles: 2 }
};

'use strict';
/* =========================================================
   保存（localStorage）
   - run：遊びかけのラン（なければ null）
   - meta：ランをまたいで残るもの（最高スコア・挑戦回数）
   - 形を変えたら FR.Config.saveVersion を上げ、migrate に直し方を足す
   ========================================================= */
FR.Save = {
  load() {
    let data = null;
    try {
      data = JSON.parse(localStorage.getItem(FR.Config.saveKey));
    } catch (e) { data = null; }
    if (!data || typeof data !== 'object') data = {};
    data = FR.Save.migrate(data);
    data.meta = Object.assign({ best: 0, runs: 0, clears: 0, tutorialDone: false, difficulty: 'normal' }, data.meta);
    return data;
  },

  migrate(data) {
    const r = data.run;
    // 1 → 2：季節と行き先ができた。遊びかけは春の途中として続ける
    if (r && r.version === 1) {
      r.season = 0;
      r.step = Math.min(r.battleIndex || 0, FR.Seasons[0].steps - 2);
      r.choices = null; r.node = null; r.nextBattle = null;
      if (r.phase === 'battle') r.phase = 'map';
      if (r.phase === 'reward') r.node = { type: 'battle' };
      r.stats.seasonsCleared = 0; r.stats.bossesWon = 0;
      r.version = 2;
    }
    if (r && r.version !== FR.Config.saveVersion) data.run = null;
    return data;
  },

  write(data) {
    try {
      localStorage.setItem(FR.Config.saveKey, JSON.stringify(data));
    } catch (e) {
      console.warn('保存できませんでした', e);
    }
  }
};

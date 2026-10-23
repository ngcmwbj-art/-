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
    data.meta = Object.assign({ best: 0, runs: 0, clears: 0 }, data.meta);
    return data;
  },

  migrate(data) {
    // いまは version 1 のみ。古い形を直す処理はここに足していく
    if (data.run && data.run.version !== FR.Config.saveVersion) data.run = null;
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

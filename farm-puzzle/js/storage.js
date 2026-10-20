'use strict';
/* =========================================================
   保存まわり（localStorage）
   - 保存データの形を変えたら VERSION を上げる（古いデータは初期化される）
   ========================================================= */
const SaveData = (() => {
  const KEY = 'hatake-puzzle-save';
  const VERSION = 1;

  // はじめて遊ぶときのデータ
  function defaults() {
    return {
      version: VERSION,
      highScore: 0,
      puzzle: null,                                    // 遊びかけの盤面（null なら新しく始める）
      resources: { water: 0, fertilizer: 0, coins: 0 },
      seasonIndex: 0,                                  // 今の季節（data/vegetables.json の seasons の番号）
      plots: [],                                       // 畑の区画。null は空き、{ vegId, stage }
      harvested: {},                                   // 図鑑用 { 野菜ID: 収穫した回数 }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const data = JSON.parse(raw);
      if (data.version !== VERSION) return defaults();
      return Object.assign(defaults(), data);
    } catch (e) {
      // プライベートモードなどで読めないときは、保存なしで遊べるようにする
      return defaults();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* 保存できない環境では何もしない */
    }
  }

  function reset() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {
      /* 同上 */
    }
  }

  return { load, save, reset, defaults };
})();

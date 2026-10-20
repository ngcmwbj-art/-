'use strict';
/* =========================================================
   保存まわり（localStorage）
   - 保存データの形を変えたら VERSION を上げ、MIGRATIONS に「古い形→新しい形」の直し方を足す
   - 古いデータは消さずに直して使う（育てた畑や図鑑が消えないように）
   ========================================================= */
const SaveData = (() => {
  const KEY = 'hatake-puzzle-save';
  const VERSION = 2;

  // はじめて遊ぶときのデータ
  function defaults() {
    return {
      version: VERSION,
      highScore: 0,
      puzzle: null,                                    // 遊びかけの盤面（null なら新しく始める）
      resources: { water: 0, fertilizer: 0, coins: 0 },
      seasonIndex: 0,                                  // 今の季節（data/vegetables.json の seasons の番号）
      plots: [],                                       // 畑の区画。null は空き、{ vegId, stage, growLeft }
      harvested: {},                                   // 図鑑用 { 野菜ID: 収穫した回数 }
      tutorialDone: false,                             // 初回ガイドを見たか
      firstGrowDone: false,                            // 初めての「育ち時間」を終えたか（1回目は短くする）
      settings: { sound: false, vibrate: true },       // 音は最初オフ
    };
  }

  // 古い形のデータを、1つずつ新しい形に直す
  const MIGRATIONS = {
    // 1 → 2：「育ち時間」が増えたので、収穫待ち（旧 stage 2）を stage 3 に
    1: (d) => {
      d.plots = (d.plots || []).map((p) => (p && p.stage === 2 ? { ...p, stage: 3, growLeft: 0 } : p));
      // 前から遊んでいる人には初回ガイドを出さない
      d.tutorialDone = true;
    },
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const data = JSON.parse(raw);
      let v = data.version || 1;
      while (v < VERSION && MIGRATIONS[v]) {
        MIGRATIONS[v](data);
        v += 1;
      }
      data.version = VERSION;
      // 新しく増えた項目は初期値で埋める（中の項目も）
      const base = defaults();
      return {
        ...base,
        ...data,
        resources: { ...base.resources, ...data.resources },
        settings: { ...base.settings, ...data.settings },
      };
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

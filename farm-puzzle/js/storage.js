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
      seasonHarvested: [],                             // 今の季節に収穫した旬の野菜（基本の旬がぜんぶそろうと次の季節へ）
      unlocked: [],                                    // ミッションで種が手に入ったチャレンジ野菜
      quizDone: [],                                    // 正解した育て方クイズ（チャレンジ野菜のミッション）
      quizCorrect: 0,                                  // おさらいクイズで正解した数の合計（称号に使う）
      showRuby: true,                                  // 画面の言葉に読みがなを付けるか
      stats: { bestCombo: 0, bestMulti: 0, bestLines: 0, bestMarks: 0 },  // ミッション用のいままでの最高
      onboardStep: null,                               // はじめの案内：0=種まき 1=水やり 2=おわり（null は起動時に決める）
      seasonWorkShown: false,                          // 最初の収穫のあとに「季節の畑しごと」を見せたか
      lastFamily: [],                                  // 区画ごとに、前に収穫した野菜のなかま（連作のひとこと用）
      tipHiddenDay: '',                                // 「今日のひとこと」を出さない日（「今日はもう出さない」を押した日）
      settings: { sound: false, vibrate: true, bigText: false },       // 音は最初オフ
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
        stats: { ...base.stats, ...data.stats },
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

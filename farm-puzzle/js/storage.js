'use strict';
/* =========================================================
   保存まわり（localStorage）
   - 保存データの形を変えたら VERSION を上げ、MIGRATIONS に「古い形→新しい形」の直し方を足す
   - 古いデータは消さずに直して使う（育てた畑や図鑑が消えないように）
   ========================================================= */
const SaveData = (() => {
  const KEY = 'hatake-puzzle-save';
  const BACKUP = 'hatake-puzzle-save-bak';      // ひとつ前の保存（読めなくなったときの予備）
  const BROKEN = 'hatake-puzzle-save-broken';   // 読めなかったデータの控え（消さずに残す）
  let recovered = null;   // 起動時に予備から戻したか（'backup'＝予備から再開、'reset'＝はじめから）
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
      lastPlayed: null,                                // 最後に開いた日（'2026-10-27'。しばらくぶりのときに「おかえりなさい」）
      zukanComplete: null,                             // 図鑑35種をそろえた記録 { y, m, d, total }（賞状を見返す用）
      seasonClears: {},                                // 季節ごとの賞状の記録 { spring: { count, y, m, d, total, n, all } }
      lastFamily: [],                                  // 区画ごとに、前に収穫した野菜のなかま（連作のひとこと用）
      tipHiddenDay: '',                                // 「今日のひとこと」を出さない日（「今日はもう出さない」を押した日）
      settings: { sound: false, vibrate: true, bigText: false, textSize: 'normal', volume: 'normal' },       // 音は最初オフ
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

  // 保存データを読む。読めないときは予備（ひとつ前の保存）から再開し、読めなかったデータも別に残しておく
  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      // プライベートモードなどで読めないときは、保存なしで遊べるようにする
      return defaults();
    }
    if (!raw) return defaults();
    try {
      return parse(raw);
    } catch (e) {
      try { localStorage.setItem(BROKEN, raw); } catch (e2) { /* 控えが残せなくても続ける */ }
      try {
        const bak = localStorage.getItem(BACKUP);
        if (bak) {
          const data = parse(bak);
          recovered = 'backup';
          return data;
        }
      } catch (e3) { /* 予備も読めない */ }
      recovered = 'reset';
      return defaults();
    }
  }

  function parse(raw) {
    {
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') throw new Error('bad save');
      let v = data.version || 1;
      while (v < VERSION && MIGRATIONS[v]) {
        MIGRATIONS[v](data);
        v += 1;
      }
      data.version = VERSION;
      // 新しく増えた項目は初期値で埋める（中の項目も）
      const base = defaults();
      const settings = { ...base.settings, ...data.settings };
      // 文字の大きさは3段（normal・big・xl）。前の版の「大きめ（bigText）」だけの保存は big として読む
      if (!data.settings || !data.settings.textSize) settings.textSize = settings.bigText ? 'big' : 'normal';
      if (!['normal', 'big', 'xl'].includes(settings.textSize)) settings.textSize = 'normal';
      settings.bigText = settings.textSize !== 'normal';
      return {
        ...base,
        ...data,
        resources: { ...base.resources, ...data.resources },
        settings,
        stats: { ...base.stats, ...data.stats },
      };
    }
  }

  function save(data) {
    try {
      // 今の保存を「ひとつ前」として予備に移してから書く（読める保存だけを予備にする）
      const prev = localStorage.getItem(KEY);
      if (prev) {
        try { JSON.parse(prev); localStorage.setItem(BACKUP, prev); } catch (e) { /* 壊れた保存は予備にしない */ }
      }
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* 保存できない環境では何もしない */
    }
  }

  // 起動時に予備から戻したか（お知らせ用）
  function recoveredFrom() {
    return recovered;
  }

  return { load, save, defaults, recoveredFrom };
})();

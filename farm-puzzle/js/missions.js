'use strict';
/* =========================================================
   チャレンジ野菜のミッション
   - data/vegetables.json で unlock が付いた野菜は、ミッションをクリアするまで種がない（🔒）
   - ミッションの種類（unlock.type）
       harvest … 決まった野菜を n 回収穫する（unlock.veg）
       combo   … コンボ ×n を出す
       multi   … n 列いっしょに消す
       lines   … 1回のプレイで n 列消す
       marks   … 1回のプレイで 💧・🍂 のマークを合わせて n 個消す
       score   … 1回のプレイで n 点
       plots   … 畑の区画を n つにする
       quiz    … その野菜の育て方クイズに正解する（js/quiz.js）
   - 記録は保存データの stats（いままでの最高）と unlocked・quizDone
   ========================================================= */
const Missions = (() => {
  let data = null;
  let cfg = null;
  let hooks = {};   // { onUnlock(野菜の一覧) }

  function init(options) {
    data = options.data;
    cfg = options.config;
    hooks = options;
    // すでに育てたことがある・畑にあるチャレンジ野菜は、最初から使えるようにする
    cfg.vegetables.forEach((v) => {
      if (!v.unlock || data.unlocked.includes(v.id)) return;
      const planted = data.plots.some((p) => p && p.vegId === v.id);
      if (data.harvested[v.id] || planted) data.unlocked.push(v.id);
    });
  }

  function isChallenge(v) {
    return !!v.unlock;
  }

  function isLocked(v) {
    return isChallenge(v) && !data.unlocked.includes(v.id);
  }

  // いまの進み具合 { now, goal }
  function progress(v) {
    const u = v.unlock;
    const s = data.stats;
    switch (u.type) {
      case 'harvest': return { now: data.harvested[u.veg] || 0, goal: u.n };
      case 'combo': return { now: s.bestCombo, goal: u.n };
      case 'multi': return { now: s.bestMulti, goal: u.n };
      case 'lines': return { now: s.bestLines, goal: u.n };
      case 'marks': return { now: s.bestMarks, goal: u.n };
      case 'score': return { now: data.highScore, goal: u.n };
      case 'plots': return { now: data.plots.length, goal: u.n };
      case 'quiz': return { now: data.quizDone.includes(v.id) ? 1 : 0, goal: 1 };
      default: return { now: 0, goal: 1 };
    }
  }

  // ミッションの文（例：「コンボ ×3 を出す」）
  function text(v) {
    const u = v.unlock;
    const target = u.veg ? cfg.vegetables.find((x) => x.id === u.veg).name : '';
    return Msg.t('mission.' + u.type, { n: u.n, veg: target, name: v.name });
  }

  // 進み具合の文（例：「いままでの最高 ×2」）
  function progressText(v) {
    const { now, goal } = progress(v);
    if (v.unlock.type === 'quiz') return '';
    return Msg.t('mission.progress', { now: Math.min(now, goal), goal });
  }

  // パズルで列を消したときの記録（1回のプレイの合計は puzzle.js が数えて渡す）
  function recordClear({ lines, combo, gameLines, gameMarks }) {
    const s = data.stats;
    s.bestMulti = Math.max(s.bestMulti, lines);
    s.bestCombo = Math.max(s.bestCombo, combo);
    s.bestLines = Math.max(s.bestLines, gameLines);
    s.bestMarks = Math.max(s.bestMarks, gameMarks);
  }

  function passQuiz(v) {
    if (!data.quizDone.includes(v.id)) data.quizDone.push(v.id);
  }

  // 条件を満たしたチャレンジ野菜を使えるようにする。新しく使えるようになった野菜を返す
  function check() {
    const fresh = cfg.vegetables.filter((v) => {
      if (!isLocked(v)) return false;
      const { now, goal } = progress(v);
      return now >= goal;
    });
    fresh.forEach((v) => data.unlocked.push(v.id));
    if (fresh.length && hooks.onUnlock) hooks.onUnlock(fresh);
    return fresh;
  }

  return { init, isChallenge, isLocked, progress, text, progressText, recordClear, passQuiz, check };
})();

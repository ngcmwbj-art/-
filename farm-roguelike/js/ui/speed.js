'use strict';
/* =========================================================
   戦闘の速さ（ゆっくり・ふつう・はやい）
   - 待ち時間と動きの長さに mult を掛ける。CSS の動きは --spd で同じ倍率にする
   - 選んだ速さは localStorage に保存（ゲームのセーブとは別）。はじめは「ゆっくり」
   ========================================================= */
FR.Speed = {
  KEY: 'farm-roguelike-speed',
  LEVELS: [
    { id: 'slow', name: 'ゆっくり', mult: 1 },
    { id: 'normal', name: 'ふつう', mult: 0.7 },
    { id: 'fast', name: 'はやい', mult: 0.45 }
  ],
  id: 'slow',

  init() {
    try { const v = localStorage.getItem(FR.Speed.KEY); if (FR.Speed.LEVELS.some(l => l.id === v)) FR.Speed.id = v; } catch (e) { /* 読めなければゆっくり */ }
    FR.Speed.apply();
  },
  level() { return FR.Speed.LEVELS.find(l => l.id === FR.Speed.id) || FR.Speed.LEVELS[0]; },
  mult() { return FR.Speed.level().mult; },
  // 読む必要がある表示（出荷票など）は、はやくても縮めすぎない
  readMult() { return Math.max(0.7, FR.Speed.mult()); },
  apply() {
    document.documentElement.style.setProperty('--spd', FR.Speed.mult());
    document.documentElement.dataset.speed = FR.Speed.id;   // 「はやい」では待機中の揺れを止める（css）
  },
  // 次の速さへ（ゆっくり → ふつう → はやい → ゆっくり）
  next() {
    const i = FR.Speed.LEVELS.findIndex(l => l.id === FR.Speed.id);
    FR.Speed.id = FR.Speed.LEVELS[(i + 1) % FR.Speed.LEVELS.length].id;
    try { localStorage.setItem(FR.Speed.KEY, FR.Speed.id); } catch (e) { /* 保存できなくても遊べる */ }
    FR.Speed.apply();
    return FR.Speed.level();
  }
};

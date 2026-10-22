// 中断と「つづきから」：準備タイムの始めにだけ自動保存する（localStorage）
const KEY = 'masato-save-v1';

const toB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (b) => { const s = atob(b); const u8 = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i); return u8; };

export function saveGame(game) {
  try {
    const data = {
      v: 1, savedAt: Date.now(), wave: game.wave, q: Math.floor(game.q), solo: Math.floor(game.solo),
      chords: game.score.chords, cards: [...game.cards], cowLog: game.cowLog, harvestYen: game.harvestYen || 0, stats: game.threats.stats, memo: [...game.memoSeen],
      cab: toB64(game.cabbages.snapshot()),
      towers: game.towers.list.map((t) => ({ id: t.id, x: +t.pos.x.toFixed(2), y: +t.pos.y.toFixed(2), z: +t.pos.z.toFixed(2) })),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d.v !== 1) return null;
    d.cab = fromB64(d.cab);
    return d;
  } catch (e) { return null; }
}

export function clearSave() { try { localStorage.removeItem(KEY); } catch (e) { /* 保存できない環境 */ } }

// 出荷の記録（前回比のため。プレイをまたいで残す）
const REC = 'masato-records-v1';
export function loadRecords() {
  try { return JSON.parse(localStorage.getItem(REC) || '{}'); } catch (e) { return {}; }
}
export function saveRecords(r) {
  try { localStorage.setItem(REC, JSON.stringify(r)); } catch (e) { /* 保存できない環境 */ }
}

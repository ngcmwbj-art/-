'use strict';
/* =========================================================
   共通の小道具（乱数・配列・文字列）
   ========================================================= */
FR.Util = {
  // シード付き乱数（mulberry32）。同じシードなら同じ並びになる
  rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  // 日本時間の今日（'2026-10-30'）と、その日の種（今日の農場：同じ日ならみんな同じ1年）
  todayJst(now) {
    const d = new Date((now || Date.now()) + 9 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  },
  dailySeed(date) {
    let h = 2166136261;
    for (const ch of 'farm-daily:' + date) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return h % 2 ** 31;
  },
  newSeed() {
    return Math.floor(Math.random() * 2 ** 31);
  },
  randInt(rnd, min, max) {
    return min + Math.floor(rnd() * (max - min + 1));
  },
  pick(rnd, arr) {
    return arr[Math.floor(rnd() * arr.length)];
  },
  // 配列をその場で混ぜる（Fisher–Yates）
  shuffle(rnd, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
  // 重み付きで1つ選ぶ。items: [{ value, weight }]
  weighted(rnd, items) {
    const total = items.reduce((s, it) => s + it.weight, 0);
    let r = rnd() * total;
    for (const it of items) {
      if ((r -= it.weight) < 0) return it.value;
    }
    return items[items.length - 1].value;
  },
  escape(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};

'use strict';
/* =========================================================
   効果音と振動
   - 音のファイルは使わず、ブラウザの機能でその場で音を作る
   - 音は最初オフ。オンにしたタップで鳴らせるようになる（スマホの決まり）
   - 振動は対応している端末だけ（iPhone のブラウザは振動できない）
   ========================================================= */
const Sound = (() => {
  // 音の設計図：[はじめの高さ(Hz), 鳴りはじめ(秒), 長さ(秒), 音色, おわりの高さ(Hz), 大きさの倍率]
  // よく鳴る音・高い音ほど倍率を下げて、耳に刺さらないようにしている
  const RECIPES = {
    place:   [[300, 0, 0.08, 'triangle', 200, 0.6]],                               // コトッ（いちばんよく鳴る）
    clear:   [[660, 0, 0.18, 'sine', 990]],                                        // ポン
    work:    [[520, 0, 0.1, 'sine', 640]],                                         // 畑の作業
    harvest: [[784, 0, 0.12, 'sine'], [988, 0.09, 0.12, 'sine'], [1175, 0.18, 0.22, 'sine', 0, 0.8]],
    ripen:   [[784, 0, 0.25, 'sine', 0, 0.7], [988, 0.12, 0.3, 'sine', 0, 0.7]],  // 実ったよ（ソ・シ）
    fanfare: [[523, 0, 0.13, 'sine'], [659, 0.12, 0.13, 'sine'], [784, 0.24, 0.13, 'sine'], [1047, 0.36, 0.5, 'sine'], [659, 0.36, 0.5, 'triangle', 0, 0.5]],  // 季節をそろえた：ドミソド
    drop:    [[1100, 0.08, 0.1, 'sine', 550, 0.7]],                                // 💧を消した：ぽちゃん（ポンのすぐあとに1回）
    leaf:    [[260, 0.08, 0.07, 'triangle', 180], [300, 0.12, 0.05, 'triangle', 220]],  // 🍂を消した：カサッ
    zukan:   [[587, 0, 0.15, 'triangle', 0, 0.6], [784, 0.14, 0.35, 'triangle', 0, 0.6]],  // 図鑑に載った：レ→ソ
  };
  // 振動の長さ（ミリ秒）
  const VIBES = { place: 8, clear: 25, harvest: [20, 40, 20], fanfare: [20, 40, 20] };
  const VOLUME = 0.16;

  let settings = { sound: false, vibrate: true };
  let ctx = null;

  function init(s) {
    settings = s;
    // 前回オンのまま閉じた場合は、最初のタップで音の準備をする
    window.addEventListener('pointerdown', () => { if (settings.sound) prepare(); });
  }

  function prepare() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // level：列やコンボが多いほど少しずつ高い音に
  function play(name, level = 1) {
    if (settings.vibrate && VIBES[name] && navigator.vibrate) navigator.vibrate(VIBES[name]);
    if (!settings.sound || !RECIPES[name]) return;
    const ac = prepare();
    if (!ac) return;
    const pitch = Math.pow(2, Math.min(level - 1, 4) / 12);   // 上がるのは4半音まで
    RECIPES[name].forEach(([from, start, dur, type, to, gain = 1]) => {
      tone(ac, from * pitch, (to || from) * pitch, start, dur, type, gain);
    });
  }

  // 音の大きさ（小さめは1/3）
  function volume() {
    return settings.volume === 'small' ? VOLUME / 3 : VOLUME;
  }

  function tone(ac, from, to, start, dur, type, gain = 1) {
    const t = ac.currentTime + start;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(volume() * gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function setSound(on) {
    settings.sound = on;
    if (on) {
      prepare();
      play('clear');
    }
  }

  function setVibrate(on) {
    settings.vibrate = on;
    if (on && navigator.vibrate) navigator.vibrate(20);
  }

  return { init, play, setSound, setVibrate };
})();

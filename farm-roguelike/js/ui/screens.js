'use strict';
/* =========================================================
   画面の切り替え・お知らせ・ダイアログ
   ========================================================= */
FR.Screens = {
  /* 背景：画面ごとに使う背景の名前。assets/img/bg/<名前>_landscape.jpg（横長）と <名前>_portrait.jpg（縦長）を探し、
     なければ次の名前、どれもなければ今の森の絵（forest.svg）を使う */
  BG: {
    title: ['title', 'battle'],
    select: ['title', 'battle'],
    battle: ['battle'],
    reward: ['battle'],
    market: ['title', 'battle'],
    result: ['title', 'battle']
  },
  BG_DIR: 'assets/img/bg/',
  BG_FALLBACK: 'forest.svg',

  // 季節ごとの背景：秋と冬は assets/img/bg/autumn_*.jpg・winter_*.jpg（なければ battle の絵）
  SEASON_BG: { 2: 'autumn', 3: 'winter' },
  SEASON_SCREENS: ['battle', 'reward', 'map', 'rest', 'event'],

  setBackground(screen) {
    let chain = FR.Screens.BG[screen] || ['battle'];
    const run = typeof App !== 'undefined' && App.data && App.data.run;
    const sb = run && FR.Screens.SEASON_BG[run.season];
    if (sb && FR.Screens.SEASON_SCREENS.includes(screen)) chain = [sb].concat(chain);
    const key = chain.join(',');
    const box = document.querySelector('.scene');
    if (!box || box.dataset.key === key) return;
    box.dataset.key = key;
    const dir = FR.Screens.BG_DIR;
    const isPortrait = () => window.matchMedia('(orientation: portrait)').matches;
    // 名前の候補を順に試す（縦長の画面では _portrait を先に、なければ _landscape）
    const tries = [];
    chain.forEach(n => {
      if (isPortrait()) tries.push(n + '_portrait.jpg');
      tries.push(n + '_landscape.jpg');
      if (!isPortrait()) tries.push(n + '_portrait.jpg');
    });
    tries.push(FR.Screens.BG_FALLBACK);
    const img = box.querySelector('img');
    let k = 0;
    img.onerror = () => { if (++k < tries.length) img.src = dir + tries[k]; };
    img.src = dir + tries[0];
  },

  show(name) {
    FR.Screens.setBackground(name);
    // 戦闘で大きく表示していたカードは消す
    const pv = document.getElementById('card-preview');
    if (pv && name !== 'battle') pv.className = '';
    if (name !== 'battle' && FR.HandInput) FR.HandInput.selected = null;
    // 前の画面のお知らせは持ち越さない
    clearTimeout(FR.Screens._toastTimer);
    document.getElementById('toast').className = '';
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    if (FR.Sound) FR.Sound.screen(name);
  },

  toast(text, kind) {
    if (kind === 'warn' && FR.Sound) FR.Sound.sfx('warn');
    const t = document.getElementById('toast');
    t.textContent = text;
    t.className = 'show ' + (kind || '');
    clearTimeout(FR.Screens._toastTimer);
    FR.Screens._toastTimer = setTimeout(() => { t.className = ''; }, 1600);
  },

  modal(title, html) {
    const m = document.getElementById('modal');
    m.querySelector('.modal-title').textContent = title;
    m.querySelector('.modal-body').innerHTML = html;
    m.classList.add('open');
  },

  closeModal() {
    document.getElementById('modal').classList.remove('open');
  }
};

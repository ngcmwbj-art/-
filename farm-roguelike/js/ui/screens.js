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
    result: ['title', 'battle']
  },
  BG_DIR: 'assets/img/bg/',
  BG_FALLBACK: 'forest.svg',

  setBackground(screen) {
    const chain = FR.Screens.BG[screen] || ['battle'];
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
    // 前の画面のお知らせは持ち越さない
    clearTimeout(FR.Screens._toastTimer);
    document.getElementById('toast').className = '';
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  },

  toast(text, kind) {
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

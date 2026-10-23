'use strict';
/* =========================================================
   画面の切り替え・お知らせ・ダイアログ
   ========================================================= */
FR.Screens = {
  show(name) {
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

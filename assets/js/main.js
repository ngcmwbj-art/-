/* 米粉の焼き菓子 pOna
   参考サイトと同じくナビが無い1枚ものなので、動きは最小限にとどめる。 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ヒーローのスクロール記号：一度でも下へ動いたら消す */
  var cue = document.querySelector('.hero-scroll');
  if (cue) {
    cue.style.transition = 'opacity .6s ease';
    window.addEventListener('scroll', function () {
      cue.style.opacity = window.scrollY > 80 ? '0' : '1';
    }, { passive: true });
  }

  /* 固定ヘッダーが無いので、アンカーはそのまま先頭へ */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', id);
    });
  });
})();

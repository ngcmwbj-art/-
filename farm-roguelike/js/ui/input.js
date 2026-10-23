'use strict';
/* =========================================================
   手札の操作（マウス・タッチ共通。Pointer Events）
   - タップ：カードを選ぶ → もう一度タップ、または敵をタップで使う
   - ドラッグ：カードを上へ引っぱって離すと使う（手札の上端より上で離す）
     1体を狙うカードは、敵の上で離すとその敵に使う
   ========================================================= */
FR.HandInput = {
  selected: null,   // 選んでいるカードの uid
  drag: null,

  // hand：手札の要素 / handlers: { onPlay(uid), onSelect(uid) }
  attach(hand, handlers) {
    FR.HandInput.handlers = handlers;
    hand.addEventListener('pointerdown', FR.HandInput.down);
    window.addEventListener('pointermove', FR.HandInput.move, { passive: false });
    window.addEventListener('pointerup', FR.HandInput.up);
    window.addEventListener('pointercancel', FR.HandInput.cancel);
  },

  down(ev) {
    const card = ev.target.closest('.card');
    if (!card || FR.HandInput.locked) return;
    FR.HandInput.drag = {
      el: card, uid: +card.dataset.uid,
      x0: ev.clientX, y0: ev.clientY, moved: false, id: ev.pointerId,
      handTop: card.parentElement.getBoundingClientRect().top
    };
  },

  move(ev) {
    const d = FR.HandInput.drag;
    if (!d || ev.pointerId !== d.id) return;
    const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) > 10) {
      d.moved = true;
      d.el.classList.add('dragging');
      FR.HandInput.select(d.uid);
    }
    if (d.moved) {
      ev.preventDefault();
      d.el.style.setProperty('--dx', dx + 'px');
      d.el.style.setProperty('--dy', dy + 'px');
      d.el.classList.toggle('will-play', ev.clientY < d.handTop - 30);
      // 指の下の敵を光らせる
      const over = FR.HandInput.enemyAt(ev.clientX, ev.clientY);
      document.querySelectorAll('.enemy-unit.targeted').forEach(e => { if (e !== over) e.classList.remove('targeted'); });
      if (over) over.classList.add('targeted');
    }
  },

  up(ev) {
    const d = FR.HandInput.drag;
    if (!d || ev.pointerId !== d.id) return;
    FR.HandInput.drag = null;
    if (d.moved) {
      const play = ev.clientY < d.handTop - 30;
      const over = FR.HandInput.enemyAt(ev.clientX, ev.clientY);
      document.querySelectorAll('.enemy-unit.targeted').forEach(e => e.classList.remove('targeted'));
      d.el.classList.remove('dragging', 'will-play');
      d.el.style.removeProperty('--dx');
      d.el.style.removeProperty('--dy');
      if (play) FR.HandInput.handlers.onPlay(d.uid, over ? +over.dataset.uid : undefined);
      return;
    }
    // タップ
    if (FR.HandInput.selected === d.uid) FR.HandInput.handlers.onPlay(d.uid);
    else FR.HandInput.select(d.uid);
  },

  cancel() {
    const d = FR.HandInput.drag;
    if (!d) return;
    d.el.classList.remove('dragging', 'will-play');
    FR.HandInput.drag = null;
  },

  // 画面のその位置にいる敵（ドラッグ中のカード自身は無視する）
  enemyAt(x, y) {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      const u = el.closest && el.closest('.enemy-unit:not(.dead)');
      if (u) return u;
    }
    return null;
  },

  select(uid) {
    FR.HandInput.selected = uid;
    document.querySelectorAll('#hand .card').forEach(c => c.classList.toggle('selected', +c.dataset.uid === uid));
    FR.HandInput.handlers.onSelect && FR.HandInput.handlers.onSelect(uid);
  },

  clear() {
    FR.HandInput.selected = null;
    document.querySelectorAll('#hand .card.selected').forEach(c => c.classList.remove('selected'));
    const st = document.getElementById('b-stage');
    if (st) st.classList.remove('targeting');
  }
};

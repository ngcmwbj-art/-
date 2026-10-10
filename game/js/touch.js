// スマホ用タッチ操作：左側スティックで移動、右側スワイプで視点、右下ボタンでアクション
export const IS_TOUCH = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;

export function setupTouch(game) {
  const root = document.getElementById('touch');
  root.hidden = false;
  document.body.classList.add('touch');

  const stick = document.getElementById('stick');
  const knob = stick.querySelector('i');
  const R = 56;
  let stickId = null, sx = 0, sy = 0;
  let lookId = null, lx = 0, ly = 0;

  const zone = document.getElementById('touch-zone');
  zone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth * 0.42 && stickId === null) {
        // 触れた位置にスティックを出す
        stickId = t.identifier; sx = t.clientX; sy = t.clientY;
        stick.style.left = sx + 'px'; stick.style.top = sy + 'px';
        stick.classList.add('on');
      } else if (lookId === null) {
        lookId = t.identifier; lx = t.clientX; ly = t.clientY;
      }
    }
  }, { passive: false });
  zone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        let dx = t.clientX - sx, dy = t.clientY - sy;
        const d = Math.hypot(dx, dy);
        if (d > R) { dx *= R / d; dy *= R / d; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        game.input.ax = dx / R;
        game.input.az = dy / R;
        game.input.sprint = d > R * 0.95;
      } else if (t.identifier === lookId) {
        game.player.look((t.clientX - lx) * 2.2, (t.clientY - ly) * 2.2);
        lx = t.clientX; ly = t.clientY;
      }
    }
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        stickId = null;
        knob.style.transform = '';
        stick.classList.remove('on');
        game.input.ax = game.input.az = 0;
        game.input.sprint = false;
      }
      if (t.identifier === lookId) lookId = null;
    }
  };
  zone.addEventListener('touchend', end);
  zone.addEventListener('touchcancel', end);

  // ボタン（押した瞬間に反応させる）
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      el.classList.add('down');
      if (!game.paused) fn();
    }, { passive: false });
    el.addEventListener('touchend', () => el.classList.remove('down'));
    el.addEventListener('click', () => { if (!game.paused) fn(); });
  };
  bind('tb-guitar', () => game.doChord());
  bind('tb-observe', () => game.doObserve());
  bind('tb-teleport', () => game.doTeleport());
  bind('tb-solo', () => game.doSolo());
  bind('tb-jump', () => { game.input.jump = true; });
  bind('tb-build', () => game.doBuild());
  bind('tb-go', () => game.skipPrep());
  bind('tb-help', () => document.getElementById('help').classList.toggle('show'));

  // ホットバーをタップでタワー選択（もう一度タップで解除）
  for (const slot of document.querySelectorAll('#hotbar .slot')) {
    slot.addEventListener('touchstart', (e) => {
      e.preventDefault();
      game.selectTower(slot.dataset.id);
    }, { passive: false });
  }
  document.getElementById('help').addEventListener('click', (e) => e.currentTarget.classList.remove('show'));
}

// 毎フレーム：状況に応じてボタンの表示を切り替える
export function updateTouch(game) {
  const b = document.getElementById('tb-build');
  b.hidden = !game.buildSel;
  const go = document.getElementById('tb-go');
  go.hidden = game.phase !== 'prep';
  const label = game.mission ? '練習を飛ばす ▶' : '台風を迎え撃つ ▶';
  if (go.textContent !== label) go.textContent = label;
  document.getElementById('tb-solo').classList.toggle('ready', game.solo >= 100);
  document.getElementById('tb-observe').style.setProperty('--p', Math.max(0, game.cd.observe / 4));
  document.getElementById('tb-teleport').style.setProperty('--p', Math.max(0, game.cd.teleport / 3));
  const beat = game.audio.beatInfo();
  document.getElementById('tb-guitar').classList.toggle('beat', beat.offset < 0.11);
}

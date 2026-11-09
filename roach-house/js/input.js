// キーボード・マウス・タッチの入力をまとめる
export class Input {
  constructor(canvas, touchRoot) {
    this.keys = new Set();
    this.pressed = new Set(); // このフレームで押された操作
    this.mx = 0; this.mz = 0; this.dash = false;
    this.camDX = 0; this.camDY = 0;
    this.touchMode = false;
    this.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.btnHeld = new Set();
    this.drag = null;
    this.canvas = canvas;
    this.enabled = true;

    const map = {
      Space: 'action', KeyF: 'attack', KeyR: 'egg', KeyX: 'dead', KeyC: 'dead', Digit1: 'cmd1', Digit2: 'cmd2', Digit3: 'cmd3',
      Numpad1: 'cmd1', Numpad2: 'cmd2', Numpad3: 'cmd3', Escape: 'pause', KeyP: 'pause', KeyM: 'mute',
    };
    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code) && map[e.code]) this.pressed.add(map[e.code]);
      this.keys.add(e.code);
      this.keyFlash(e.code);
      this.touchMode = false;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.mouseAct = false; this.keys.clear(); this.btnHeld.clear(); this.resetJoy(); this.drag = null; });

    // マウス／指で画面をドラッグ → 視点を回す
    // 第19回：マウスは右ボタン（または中ボタン）を押している間だけ視点が回る。左クリックは Space と同じ「何でも」
    this.mouseAct = false;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') this.touchMode = true;
      else if (e.button === 0) {
        if (!this.enabled) return;
        this.pressed.add('action'); this.mouseAct = true; this.keyFlash('Space');
        return;
      }
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* 無視 */ }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      this.camDX += e.clientX - this.drag.x;
      this.camDY += e.clientY - this.drag.y;
      this.drag.x = e.clientX; this.drag.y = e.clientY;
    });
    const end = (e) => { if (e.pointerType === 'mouse' && e.button === 0) this.mouseAct = false; if (this.drag && this.drag.id === e.pointerId) this.drag = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    if (touchRoot) this.bindTouch(touchRoot);
  }

  bindTouch(root) {
    const pad = root.querySelector('.joy-zone');
    const knob = root.querySelector('.joy-knob');
    const base = root.querySelector('.joy-base');
    this.knob = knob; this.base = base;
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.touchMode = true;
      if (this.joy.id !== null) return;
      const r = pad.getBoundingClientRect();
      this.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      base.style.left = `${e.clientX - r.left}px`;
      base.style.top = `${e.clientY - r.top}px`;
      base.classList.add('on');
      try { pad.setPointerCapture(e.pointerId); } catch (_) { /* 無視 */ }
    });
    pad.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joy.id) return;
      const R = 52;
      let dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      this.joy.x = dx / R; this.joy.y = dy / R;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const end = (e) => { if (e.pointerId === this.joy.id) this.resetJoy(); };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);

    root.querySelectorAll('[data-act]').forEach((b) => {
      const act = b.dataset.act;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.touchMode = true;
        this.pressed.add(act);
        this.btnHeld.add(act);
        b.classList.add('down');
        try { b.setPointerCapture(e.pointerId); } catch (_) { /* 無視 */ }
      });
      const up = () => { this.btnHeld.delete(act); b.classList.remove('down'); };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }
  resetJoy() {
    this.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    if (this.knob) this.knob.style.transform = 'translate(0,0)';
    if (this.base) this.base.classList.remove('on');
  }
  press(act) { this.pressed.add(act); }
  // 第19回 T10：押したキーを覚えておき、画面の札のキーの絵を光らせる
  keyFlash(code) {
    if (!this.flash) this.flash = {};
    const k = /^(Key[WASD]|Arrow)/.test(code) ? 'move' : code === 'Space' ? 'Space' : (code === 'KeyX' || code === 'KeyC') ? 'X' : code === 'Escape' ? 'Esc' : null;
    if (k) this.flash[k] = performance.now();
  }
  lit(k) { return this.flash && this.flash[k] && performance.now() - this.flash[k] < 260; }

  // 毎フレームの最初に呼ぶ
  poll() {
    const k = this.keys;
    let x = 0, z = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) z += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) z -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    let dash = k.has('ShiftLeft') || k.has('ShiftRight');
    // 第19回：Shift を押さなくても、同じ向きに2秒まっすぐ歩き続けると少し速くなる（向きを変えたら元にもどる）
    const now = performance.now();
    if (x || z) {
      const dir = `${x},${z}`;
      if (dir !== this.runDir) { this.runDir = dir; this.runSince = now; }
      if (now - this.runSince > 2000) { dash = true; this.autoDash = true; } else this.autoDash = false;
    } else { this.runDir = null; this.autoDash = false; }
    if (this.joy.id !== null) {
      x = this.joy.x; z = -this.joy.y;
      dash = Math.hypot(x, z) > 0.92;
    }
    const m = Math.hypot(x, z);
    if (m > 1) { x /= m; z /= m; }
    this.mx = x; this.mz = z; this.dash = dash;
    this.actionHeld = k.has('Space') || this.btnHeld.has('action') || this.mouseAct;
    if (this.actionHeld && k.has('Space')) this.keyFlash('Space');
    if (x || z) this.keyFlash('KeyW');
    let rot = 0;
    if (k.has('KeyQ')) rot -= 1;
    if (k.has('KeyE')) rot += 1;
    this.keyRot = rot;
  }
  consume(act) {
    if (this.pressed.has(act)) { this.pressed.delete(act); return true; }
    return false;
  }
  endFrame() { this.pressed.clear(); this.camDX = 0; this.camDY = 0; }
}

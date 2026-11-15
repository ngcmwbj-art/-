// 画面の上に出る小さな窓たち（お知らせ・入力・下から出る選択肢・進み具合・ひとこと）。
// 昔の iPod touch のような、つやのある紺色の窓と、下からせり上がる選択肢にしてあります。

const root = () => document.getElementById('overlays');

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

let openCount = 0;
function lockBackground(on) {
  openCount += on ? 1 : -1;
  if (openCount < 0) openCount = 0;
  document.body.classList.toggle('modal-open', openCount > 0);
}

// 窓を閉じる（アニメーションのあとで消す）
function closeLayer(layer, done) {
  layer.classList.remove('in');
  layer.classList.add('out');
  lockBackground(false);
  setTimeout(() => { layer.remove(); if (done) done(); }, 260);
}

// ── お知らせの窓 ─────────────────────────────────────────
// buttons: [{ label, value, style: 'default' | 'cancel' }]。押したボタンの value を返す
export function alertBox({ title, message, buttons }) {
  buttons = buttons && buttons.length ? buttons : [{ label: 'OK', value: true }];
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    const layer = el('div', 'ov ov-alert');
    const box = el('div', 'alert');
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-modal', 'true');
    if (title) box.appendChild(el('div', 'alert-title', title));
    if (message) box.appendChild(el('div', 'alert-msg', message));
    const row = el('div', 'alert-btns');
    const finish = (value) => {
      document.removeEventListener('keydown', onKey, true);
      closeLayer(layer, () => { if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (_) { /* 何もしない */ } } });
      resolve(value);
    };
    const cancel = buttons.find((b) => b.style === 'cancel');
    const onKey = (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); finish(cancel ? cancel.value : buttons[buttons.length - 1].value); }
    };
    buttons.forEach((b) => {
      const btn = el('button', `alert-btn${b.style === 'cancel' ? ' cancel' : ''}`, b.label);
      btn.type = 'button';
      btn.addEventListener('click', () => finish(b.value));
      row.appendChild(btn);
    });
    if (buttons.length > 2) row.classList.add('stack');
    box.appendChild(row);
    layer.appendChild(box);
    root().appendChild(layer);
    lockBackground(true);
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => {
      layer.classList.add('in');
      const last = row.lastElementChild;
      if (last) last.focus({ preventScroll: true });
    });
  });
}

// ── 文字を入れる窓 ───────────────────────────────────────
// 入れた文字を返す（やめたら null）
export function promptBox({ title, message, value = '', placeholder = '', okLabel = '保存' }) {
  return new Promise((resolve) => {
    const layer = el('div', 'ov ov-alert ov-prompt');
    const box = el('form', 'alert');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    if (title) box.appendChild(el('div', 'alert-title', title));
    if (message) box.appendChild(el('div', 'alert-msg', message));
    const input = el('input', 'alert-input');
    input.type = 'text';
    input.value = value;
    input.placeholder = placeholder;
    input.maxLength = 80;
    input.setAttribute('aria-label', title || placeholder);
    input.autocomplete = 'off';
    box.appendChild(input);
    const row = el('div', 'alert-btns');
    const cancelBtn = el('button', 'alert-btn cancel', 'キャンセル');
    cancelBtn.type = 'button';
    const okBtn = el('button', 'alert-btn', okLabel);
    okBtn.type = 'submit';
    row.append(cancelBtn, okBtn);
    box.appendChild(row);
    layer.appendChild(box);
    const finish = (v) => {
      document.removeEventListener('keydown', onKey, true);
      input.blur();
      closeLayer(layer);
      resolve(v);
    };
    const onKey = (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); finish(null); } };
    const sync = () => { okBtn.disabled = !input.value.trim(); };
    input.addEventListener('input', sync);
    sync();
    cancelBtn.addEventListener('click', () => finish(null));
    box.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const v = input.value.trim();
      if (v) finish(v);
    });
    root().appendChild(layer);
    lockBackground(true);
    document.addEventListener('keydown', onKey, true);
    // iPhone では、タップの流れの中で focus しないとキーボードが出ない
    input.focus({ preventScroll: true });
    try { input.select(); } catch (_) { /* 何もしない */ }
    requestAnimationFrame(() => layer.classList.add('in'));
  });
}

// ── 下から出る選択肢 ─────────────────────────────────────
// buttons: [{ label, value, style: 'default' | 'destructive' | 'cancel' }]。
// 押した value を返す（外側を押す・Esc は null）
export function actionSheet({ title, buttons }) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    const layer = el('div', 'ov ov-sheet');
    const sheet = el('div', 'sheet');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    if (title) sheet.appendChild(el('div', 'sheet-title', title));
    const finish = (v) => {
      document.removeEventListener('keydown', onKey, true);
      closeLayer(layer, () => { if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (_) { /* 何もしない */ } } });
      resolve(v);
    };
    const onKey = (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); finish(null); } };
    for (const b of buttons) {
      const btn = el('button', `sheet-btn ${b.style || 'default'}`, b.label);
      btn.type = 'button';
      btn.addEventListener('click', () => finish(b.value));
      sheet.appendChild(btn);
    }
    layer.addEventListener('click', (ev) => { if (ev.target === layer) finish(null); });
    layer.appendChild(sheet);
    root().appendChild(layer);
    lockBackground(true);
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => {
      layer.classList.add('in');
      const first = sheet.querySelector('.sheet-btn');
      if (first) first.focus({ preventScroll: true });
    });
  });
}

// ── 進み具合の窓（取り込み中など）───────────────────────
// 返すもの: { update(done, total, text), close(), cancelled }
export function progressBox({ title, cancelLabel = '中止' }) {
  const layer = el('div', 'ov ov-hud');
  const box = el('div', 'hud');
  box.setAttribute('role', 'status');
  box.setAttribute('aria-live', 'polite');
  const t = el('div', 'hud-title', title);
  const bar = el('div', 'hud-bar');
  const fill = el('div', 'hud-fill');
  bar.appendChild(fill);
  const sub = el('div', 'hud-sub', '');
  const btn = el('button', 'hud-btn', cancelLabel);
  btn.type = 'button';
  box.append(t, bar, sub, btn);
  layer.appendChild(box);
  root().appendChild(layer);
  lockBackground(true);
  requestAnimationFrame(() => layer.classList.add('in'));
  const api = {
    cancelled: false,
    update(done, total, text) {
      fill.style.width = total ? `${Math.round((done / total) * 100)}%` : '0%';
      if (text != null) sub.textContent = text;
    },
    setTitle(text) { t.textContent = text; },
    close() { closeLayer(layer); },
  };
  btn.addEventListener('click', () => {
    api.cancelled = true;
    btn.disabled = true;
    btn.textContent = '中止しています…';
  });
  return api;
}

// ── ひとこと（しばらくすると消える）─────────────────────
let toastTimer = 0;
export function toast(text, ms = 1800) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = el('div', 'toast');
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    root().appendChild(t);
  }
  t.textContent = text;
  t.classList.remove('in');
  // 続けて出したときも、もう一度ふわっと出す
  void t.offsetWidth;
  t.classList.add('in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('in'), ms);
}

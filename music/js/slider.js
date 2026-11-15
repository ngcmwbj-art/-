// つまみ（再生位置・音量）。
// ブラウザ標準のつまみ（input type="range"）は、iPhone では「線の上を押しても動かない」
// 「つまみが小さくてつかみにくい」ことがあるので、自前で作っています。
// 線のどこを押してもそこへ動き、そのまま左右に引けます。キーボードの ← → でも動きます。
//
//   const s = createSlider(el, { onInput(v), onChange(v), onCancel(), text(v) });
//   s.value = 0.5;      // 0〜1。指でさわっている間は外からの値を受けつけない

export function createSlider(el, opts = {}) {
  el.classList.add('slider');
  el.setAttribute('role', 'slider');
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', '100');
  el.tabIndex = 0;
  el.innerHTML = '<div class="slider-track"><div class="slider-fill"></div></div><div class="slider-thumb"></div>';

  let value = 0;
  let dragging = false;

  const show = (v) => {
    value = Math.min(1, Math.max(0, Number(v) || 0));
    el.style.setProperty('--v', String(value));
    el.setAttribute('aria-valuenow', String(Math.round(value * 100)));
    if (opts.text) el.setAttribute('aria-valuetext', opts.text(value));
  };

  // 押した場所 → 0〜1（つまみの半分ぶん、両はしに余白がある）
  const fromEvent = (ev) => {
    const r = el.getBoundingClientRect();
    const pad = (opts.thumb || 22) / 2;
    const w = Math.max(1, r.width - pad * 2);
    return (ev.clientX - r.left - pad) / w;
  };

  el.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    dragging = true;
    el.classList.add('on');
    try { el.setPointerCapture(ev.pointerId); } catch (_) { /* 何もしない */ }
    show(fromEvent(ev));
    if (opts.onInput) opts.onInput(value);
    ev.preventDefault();
  });
  el.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    show(fromEvent(ev));
    if (opts.onInput) opts.onInput(value);
  });
  const end = (commit) => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('on');
    if (commit) { if (opts.onChange) opts.onChange(value); } else if (opts.onCancel) opts.onCancel();
  };
  el.addEventListener('pointerup', () => end(true));
  el.addEventListener('pointercancel', () => end(false));
  el.addEventListener('lostpointercapture', () => end(true));

  el.addEventListener('keydown', (ev) => {
    let v = value;
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') v -= 0.02;
    else if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') v += 0.02;
    else if (ev.key === 'Home') v = 0;
    else if (ev.key === 'End') v = 1;
    else return;
    ev.preventDefault();
    show(v);
    if (opts.onInput) opts.onInput(value);
    if (opts.onChange) opts.onChange(value);
  });

  show(0);

  return {
    get value() { return value; },
    set value(v) { if (!dragging) show(v); },
    get dragging() { return dragging; },
  };
}

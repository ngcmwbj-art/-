// 長い一覧を軽く出す部品。
// 画面に見えているあたりの行だけを作り、スクロールに合わせて入れ替えます。
// 曲が何千あっても、作る行は数十だけなので、開いた瞬間に出て、なめらかに流れます。
//
// items: [{ kind: 'header' | 'row' | …, h?: 高さ(px), … }] のならび。
//   kind ごとの高さは opts.heights で決める（item.h があればそれを優先）。
//   kind が 'header' のものは見出しで、上に貼りつき、右の索引（あ か さ … A B C …）にも並ぶ。

export class VList {
  constructor(host, opts) {
    this.host = host;
    this.opts = opts;
    this.items = [];
    this.offsets = [0];
    this.headers = [];          // 見出しの位置（items の番号）
    this.rendered = new Map();  // 番号 → 行の要素
    this.selected = -1;         // 青く選ばれている行
    this._confirm = -1;         // 「削除」ボタンを出している行
    this._raf = 0;
    this._press = null;
    this._suppressClick = false;

    host.classList.add('vl');
    this.scroller = el('div', 'vl-scroll');
    this.space = el('div', 'vl-space');
    this.scroller.appendChild(this.space);
    this.sticky = el('div', 'vl-sticky vl-header');
    this.sticky.hidden = true;
    this.index = el('div', 'vl-index');
    this.index.hidden = true;
    this.index.setAttribute('aria-hidden', 'true');
    host.append(this.scroller, this.sticky, this.index);

    this._onScroll = () => {
      this._cancelPress();
      this._dismissConfirm();
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this._render(); });
    };
    this.scroller.addEventListener('scroll', this._onScroll, { passive: true });

    this._bindRows();
    this._bindIndex();

    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => { this._layoutIndex(); this._render(); });
      this._ro.observe(host);
    }
  }

  // ── 中身を入れる ─────────────────────────────────────
  setItems(items, { keepScroll = false } = {}) {
    const top = keepScroll ? this.scroller.scrollTop : 0;
    this.items = items;
    const heights = this.opts.heights || {};
    const n = items.length;
    const offsets = new Array(n + 1);
    const headers = [];
    let y = 0;
    for (let i = 0; i < n; i++) {
      offsets[i] = y;
      const it = items[i];
      if (it.kind === 'header') headers.push(i);
      y += it.h || heights[it.kind] || 44;
    }
    offsets[n] = y;
    this.offsets = offsets;
    this.headers = headers;
    this.space.style.height = `${y}px`;
    for (const node of this.rendered.values()) node.remove();
    this.rendered.clear();
    this._confirm = -1;
    if (!keepScroll) this.selected = -1;
    this.scroller.scrollTop = top;
    this._buildIndex();
    this._render();
  }

  // いま見えている行を作りなおす（再生中の印が変わったときなど）
  refresh() {
    for (const node of this.rendered.values()) node.remove();
    this.rendered.clear();
    this._render();
  }

  scrollToIndex(i, align = 'top') {
    if (i < 0 || i >= this.items.length) return;
    let y = this.offsets[i];
    if (align === 'center') {
      y -= (this.scroller.clientHeight - (this.offsets[i + 1] - this.offsets[i])) / 2;
    }
    this.scroller.scrollTop = Math.max(0, y);
    this._render();
  }

  select(i) {
    this._setSelected(i);
  }

  // 戻ってきたときに、青い選択をふわっと消す
  deselect(animated = true) {
    const i = this.selected;
    if (i < 0) return;
    this.selected = -1;
    const node = this.rendered.get(i);
    if (!node) return;
    if (animated) {
      node.classList.add('desel');
      node.classList.remove('sel');
      setTimeout(() => node.classList.remove('desel'), 400);
    } else {
      node.classList.remove('sel');
    }
  }

  // その行に「削除」ボタンを出す（編集中の赤い丸を押したとき）
  showConfirm(i) { this._showConfirm(i); }

  destroy() {
    this.scroller.removeEventListener('scroll', this._onScroll);
    if (this._ro) this._ro.disconnect();
    if (this._raf) cancelAnimationFrame(this._raf);
    this._cancelPress();
    this.rendered.clear();
    this.host.textContent = '';
  }

  // ── 行を作る ─────────────────────────────────────────
  _render() {
    const items = this.items;
    const n = items.length;
    const top = this.scroller.scrollTop;
    const view = this.scroller.clientHeight || this.host.clientHeight || 0;
    const buffer = Math.max(300, view);
    const first = Math.max(0, this._indexAt(top - buffer));
    const last = Math.min(n - 1, this._indexAt(top + view + buffer));

    for (const [i, node] of this.rendered) {
      if (i < first || i > last) { node.remove(); this.rendered.delete(i); }
    }
    let frag = null;
    for (let i = first; i <= last; i++) {
      if (this.rendered.has(i)) continue;
      const it = items[i];
      const node = el('div', `vl-item vl-${it.kind}`);
      node.style.top = `${this.offsets[i]}px`;
      node.style.height = `${this.offsets[i + 1] - this.offsets[i]}px`;
      node.dataset.i = i;
      if (it.kind === 'header') {
        node.textContent = it.label;
      } else {
        this.opts.render(it, node, i);
        if (it.tap !== false) { node.tabIndex = 0; node.setAttribute('role', 'button'); }
        if (i === this.selected) node.classList.add('sel');
      }
      (frag || (frag = document.createDocumentFragment())).appendChild(node);
      this.rendered.set(i, node);
    }
    if (frag) this.space.appendChild(frag);
    this._updateSticky(top);
  }

  // 高さ y にある行の番号（二分探索）
  _indexAt(y) {
    const o = this.offsets;
    let lo = 0;
    let hi = this.items.length - 1;
    if (hi < 0) return 0;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (o[mid] <= y) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  // ── 上に貼りつく見出し ───────────────────────────────
  _updateSticky(top) {
    const hs = this.headers;
    if (!hs.length || top < this.offsets[hs[0]] || top <= 0) {
      this.sticky.hidden = true;
      return;
    }
    // top 以下で最後の見出し
    let lo = 0;
    let hi = hs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.offsets[hs[mid]] <= top) lo = mid; else hi = mid - 1;
    }
    const cur = hs[lo];
    const h = this.offsets[cur + 1] - this.offsets[cur];
    let push = 0;
    if (lo + 1 < hs.length) {
      const nextTop = this.offsets[hs[lo + 1]] - top;
      if (nextTop < h) push = nextTop - h;
    }
    this.sticky.hidden = false;
    if (this.sticky._label !== this.items[cur].label) {
      this.sticky._label = this.items[cur].label;
      this.sticky.textContent = this.items[cur].label;
    }
    this.sticky.style.height = `${h}px`;
    this.sticky.style.transform = push ? `translateY(${push}px)` : '';
  }

  // ── 右の索引 ─────────────────────────────────────────
  _buildIndex() {
    const show = this.opts.showIndex && this.headers.length >= 3 && this.items.length >= 20;
    this.index.hidden = !show;
    this.host.classList.toggle('vl-has-index', !!show);
    if (show) this._layoutIndex();
  }

  _layoutIndex() {
    if (this.index.hidden) return;
    const labels = this.headers.map((i) => this.items[i].label);
    const avail = Math.max(60, (this.host.clientHeight || 400) - 12);
    const per = 14;
    let shown = labels;
    if (labels.length * per > avail) {
      // 入りきらないときは、間を「•」にして間引く
      const max = Math.max(3, Math.floor(avail / per));
      const keep = Math.max(2, Math.ceil(max / 2));
      shown = [];
      for (let k = 0; k < keep; k++) {
        const idx = Math.round((k * (labels.length - 1)) / (keep - 1));
        if (k > 0) shown.push('•');
        shown.push(labels[idx]);
      }
    }
    const key = shown.join('|');
    if (this.index._key === key) return;
    this.index._key = key;
    this.index.textContent = '';
    for (const s of shown) {
      const d = el('div', 'vl-index-item');
      d.textContent = s;
      this.index.appendChild(d);
    }
  }

  _bindIndex() {
    const jump = (ev) => {
      const r = this.index.getBoundingClientRect();
      if (!r.height || !this.headers.length) return;
      const p = Math.min(0.9999, Math.max(0, (ev.clientY - r.top) / r.height));
      const hi = this.headers[Math.floor(p * this.headers.length)];
      const max = Math.max(0, this.offsets[this.items.length] - this.scroller.clientHeight);
      this.scroller.scrollTop = Math.min(this.offsets[hi], max);
      this._render();
    };
    let active = false;
    this.index.addEventListener('pointerdown', (ev) => {
      active = true;
      this.index.classList.add('on');
      try { this.index.setPointerCapture(ev.pointerId); } catch (_) { /* 何もしない */ }
      jump(ev);
      ev.preventDefault();
    });
    this.index.addEventListener('pointermove', (ev) => { if (active) jump(ev); });
    const end = () => { active = false; this.index.classList.remove('on'); };
    this.index.addEventListener('pointerup', end);
    this.index.addEventListener('pointercancel', end);
  }

  // ── 行へのタップ・長押し・横なぞり ───────────────────
  _bindRows() {
    const sc = this.scroller;

    const rowOf = (target) => {
      const node = target && target.closest ? target.closest('.vl-item') : null;
      if (!node || !sc.contains(node)) return null;
      const i = Number(node.dataset.i);
      const item = this.items[i];
      if (!item || item.kind === 'header') return null;
      return { node, i, item };
    };

    sc.addEventListener('pointerdown', (ev) => {
      if (ev.button > 0) return;
      const hit = rowOf(ev.target);
      this._suppressClick = false;
      if (!hit) return;
      if (ev.target.closest('.vl-del, input, button, a, [data-nopress]')) return;
      if (this._confirm >= 0) return;   // 削除ボタンが出ている間は、次のタップで閉じるだけ
      const press = { ...hit, x: ev.clientX, y: ev.clientY, hlTimer: 0, lpTimer: 0 };
      this._press = press;
      if (hit.item.tap !== false) {
        press.hlTimer = setTimeout(() => { hit.node.classList.add('hl'); }, 70);
      }
      if (this.opts.onLongPress && hit.item.longPress) {
        press.lpTimer = setTimeout(() => {
          if (this._press !== press) return;
          this._suppressClick = true;
          this._cancelPress();
          // 指をはなした瞬間の「押した」が、いま出したメニューに届かないようにする
          swallowNextClick();
          this.opts.onLongPress(hit.item, hit.node, hit.i);
        }, 520);
      }
    });

    sc.addEventListener('pointermove', (ev) => {
      const p = this._press;
      if (!p) return;
      const dx = ev.clientX - p.x;
      const dy = ev.clientY - p.y;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (!p.moved && (ax > 8 || ay > 8)) {
        // 指が動いた：もう「押した」でも「長押し」でもない
        p.moved = true;
        clearTimeout(p.hlTimer);
        clearTimeout(p.lpTimer);
        p.node.classList.remove('hl');
        this._suppressClick = true;
      }
      if (!p.moved) return;
      if (ay > 12 && ay >= ax) {
        this._cancelPress();   // たてに動いた（スクロール）
      } else if (ax > 24 && ax > ay * 2 && p.item.swipe && this.opts.onDelete) {
        // 横になぞった：その行に「削除」ボタンを出す
        this._cancelPress();
        this._showConfirm(p.i);
      }
    });

    const up = () => {
      const p = this._press;
      if (!p) return;
      clearTimeout(p.lpTimer);
      // 青い光はクリックの処理が終わるまで残す
      setTimeout(() => { if (this._press === p) this._cancelPress(); }, 120);
    };
    sc.addEventListener('pointerup', up);
    sc.addEventListener('pointercancel', () => this._cancelPress());
    sc.addEventListener('pointerleave', () => this._cancelPress());

    // パソコンでは右クリックを長押しの代わりに
    sc.addEventListener('contextmenu', (ev) => {
      const hit = rowOf(ev.target);
      if (!hit || !this.opts.onLongPress || !hit.item.longPress) return;
      ev.preventDefault();
      this._cancelPress();
      this.opts.onLongPress(hit.item, hit.node, hit.i);
    });

    sc.addEventListener('click', (ev) => {
      const del = ev.target.closest('.vl-del');
      if (del) {
        this._suppressClick = false;
        const i = this._confirm;
        this._dismissConfirm();
        if (i >= 0 && this.items[i]) this.opts.onDelete(this.items[i], i);
        return;
      }
      // なぞった直後に届くクリックは無視（出したばかりの「削除」を消さない）
      if (this._suppressClick) { this._suppressClick = false; return; }
      if (this._confirm >= 0) { this._dismissConfirm(); return; }
      const hit = rowOf(ev.target);
      if (!hit || hit.item.tap === false) return;
      if (ev.target.closest('input, a')) return;
      const btn = ev.target.closest('[data-act]');
      this._cancelPress();
      if (this.opts.onTap) this.opts.onTap(hit.item, hit.node, hit.i, btn ? btn.dataset.act : null, ev);
    });

    // キーボード（Enter / スペース）でも押せるように
    sc.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      if (ev.target.closest('input, button, a')) return;
      const hit = rowOf(ev.target);
      if (!hit || hit.item.tap === false) return;
      ev.preventDefault();
      if (this.opts.onTap) this.opts.onTap(hit.item, hit.node, hit.i, null, ev);
    });
  }

  _cancelPress() {
    const p = this._press;
    if (!p) return;
    clearTimeout(p.hlTimer);
    clearTimeout(p.lpTimer);
    p.node.classList.remove('hl');
    this._press = null;
  }

  _setSelected(i) {
    if (this.selected >= 0) {
      const old = this.rendered.get(this.selected);
      if (old) old.classList.remove('sel');
    }
    this.selected = i;
    const node = this.rendered.get(i);
    if (node) node.classList.add('sel');
  }

  _showConfirm(i) {
    this._dismissConfirm();
    const node = this.rendered.get(i);
    if (!node) return;
    this._confirm = i;
    const b = el('button', 'vl-del');
    b.type = 'button';
    b.textContent = '削除';
    node.appendChild(b);
    node.classList.add('confirming');
    requestAnimationFrame(() => b.classList.add('in'));
  }

  _dismissConfirm() {
    if (this._confirm < 0) return;
    const node = this.rendered.get(this._confirm);
    this._confirm = -1;
    if (!node) return;
    node.classList.remove('confirming');
    const b = node.querySelector('.vl-del');
    if (b) b.remove();
  }
}

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

// 長押しのあと、指をはなしたときに届く click を、どこに届いても1回だけ捨てる。
// これをしないと、長押しで出したメニューが、はなした瞬間に閉じたり、指の下のボタンが押されたりする
function swallowNextClick() {
  const kill = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
  const off = () => {
    window.removeEventListener('pointerup', off, true);
    window.removeEventListener('pointercancel', off, true);
    // click は pointerup のすぐあとに届く。届かなかったとき（指を動かしたときなど）のために、少し待って外す
    setTimeout(() => window.removeEventListener('click', kill, true), 350);
  };
  window.addEventListener('click', kill, { capture: true, once: true });
  window.addEventListener('pointerup', off, true);
  window.addEventListener('pointercancel', off, true);
}

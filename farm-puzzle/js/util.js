'use strict';
/* =========================================================
   共通の小道具（文言・要素づくり・ダイアログ）
   ========================================================= */

// JSON ファイルを読み込む
async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path} を読み込めませんでした（${res.status}）`);
  return res.json();
}

// 要素をつくる小さなヘルパー： h('div', { class: 'x', onclick: fn }, '文字', 子要素)
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style') el.style.cssText = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value);
  }
  children.flat().forEach((child) => {
    if (child == null || child === false) return;
    el.append(child instanceof Node ? child : String(child));
  });
  return el;
}

/* ---------- 文言（data/messages.json） ---------- */
const Msg = (() => {
  let dict = {};

  function init(data) {
    dict = data;
  }

  // "puzzle.score" のようなドット区切りのキーで文言を取り出す。
  // 文言の中の {name} は vars.name で置き換える
  function t(key, vars = {}) {
    const raw = get(key);
    if (typeof raw !== 'string') return key;
    return raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  }

  // 文字以外（配列など）をそのまま取り出す
  function get(key) {
    return key.split('.').reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined), dict);
  }

  // HTML の data-msg="キー" の要素に文言を入れる
  function applyToDom(root = document) {
    root.querySelectorAll('[data-msg]').forEach((el) => {
      el.textContent = t(el.dataset.msg);
    });
  }

  return { init, t, get, applyToDom };
})();

/* ---------- ダイアログ ---------- */
const Modal = (() => {
  // buttons: [{ label, primary, onClick }]
  function open({ title, body, buttons = [] }) {
    const root = document.getElementById('modal');
    root.querySelector('.modal-title').textContent = title || '';

    const bodyEl = root.querySelector('.modal-body');
    bodyEl.innerHTML = '';
    if (typeof body === 'string') bodyEl.textContent = body;
    else if (body) bodyEl.append(body);

    const btnBox = root.querySelector('.modal-buttons');
    btnBox.innerHTML = '';
    buttons.forEach((b) => {
      btnBox.append(
        h('button', {
          class: 'btn' + (b.primary ? ' primary' : ''),
          onclick: () => {
            close();
            if (b.onClick) b.onClick();
          },
        }, b.label)
      );
    });

    root.classList.remove('hidden');
  }

  function close() {
    document.getElementById('modal').classList.add('hidden');
  }

  return { open, close };
})();

/* ---------- ふわっと浮かぶ文字 ---------- */
function floatText(text, x, y, parent = document.body) {
  const el = h('div', { class: 'float-text' }, text);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  parent.append(el);
  setTimeout(() => el.remove(), 1400);
}

/* ---------- 野菜の絵 ---------- */
// data/vegetables.json の icon の書き方：
//   "🍅"           … 絵文字をそのまま表示
//   "css:daikon"   … CSS で描いた絵（style.css の .veg-css.daikon）
//   "img:img/tomato.png" … 画像に差し替えるとき
function vegIcon(veg) {
  const icon = veg.icon || '❓';
  if (icon.startsWith('css:')) return h('span', { class: 'veg-icon veg-css ' + icon.slice(4), 'aria-label': veg.name });
  if (icon.startsWith('img:')) return h('img', { class: 'veg-icon veg-img', src: icon.slice(4), alt: veg.name });
  return h('span', { class: 'veg-icon', 'aria-label': veg.name }, icon);
}

/* ---------- 画面下にしばらく出るお知らせ ---------- */
let toastTimer = null;
function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
}

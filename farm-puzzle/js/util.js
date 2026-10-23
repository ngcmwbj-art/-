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

  // 読みがな：文言の中で {追肥|ついひ} と書いた所に、rich() でふりがなを付ける
  const RUBY = /\{([^{}|]+)\|([^{}]+)\}/g;
  let rubyOn = true;

  function setRuby(on) {
    rubyOn = on;
  }

  // "puzzle.score" のようなドット区切りのキーで文言を取り出す。
  // 文言の中の {name} は vars.name で置き換える（読みがなは外したただの文字になる）
  function t(key, vars = {}) {
    return raw(key, vars).replace(RUBY, '$1');
  }

  function raw(key, vars) {
    const text = get(key);
    if (typeof text !== 'string') return key;
    return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  }

  // 読みがな付きで取り出す（ボタンや見出し用。要素のまとまりを返す）
  function rich(key, vars = {}) {
    return richText(raw(key, vars));
  }

  // {語|よみ} の入った文（data/vegetables.json のコツなど）を、読みがな付きの要素にする
  function richText(text) {
    const frag = document.createDocumentFragment();
    let last = 0;
    text.replace(RUBY, (m, word, reading, at) => {
      frag.append(text.slice(last, at));
      if (rubyOn) {
        const ruby = document.createElement('ruby');
        ruby.append(word);
        const rt = document.createElement('rt');
        rt.textContent = reading;
        ruby.append(rt);
        frag.append(ruby);
      } else {
        frag.append(word);
      }
      last = at + m.length;
      return m;
    });
    frag.append(text.slice(last));
    return frag;
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

  // {語|よみ} の入った文から、読みがなを外したただの文字にする（お知らせなど）
  function plain(text) {
    return String(text).replace(RUBY, '$1');
  }

  return { init, t, rich, richText, plain, get, setRuby, applyToDom };
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
//   "draw:ball:#色1:#色2" … CSS で描いた絵の型（ball・tall・leaf・shiso・lobed・round・thin・stalk・pod・long・root・imo）と2つの色
//   "mark:キ:#cfe8b0" … 絵文字がない野菜の仮の絵（色つきの丸に1文字）
//   "img:img/tomato.png" … 画像に差し替えるとき
function vegIcon(veg) {
  const icon = veg.icon || '❓';
  if (icon.startsWith('css:')) return h('span', { class: 'veg-icon veg-css ' + icon.slice(4), 'aria-label': veg.name });
  if (icon.startsWith('draw:')) {
    const [, type, c1, c2] = icon.split(':');
    return h('span', { class: `veg-icon veg-draw ${type}`, style: `--c1:${c1};--c2:${c2}`, role: 'img', 'aria-label': veg.name },
      h('i', { class: 'a' }), h('i', { class: 'b' }), h('i', { class: 'c' }));
  }
  if (icon.startsWith('mark:')) {
    const [, char, color] = icon.split(':');
    return h('span', { class: 'veg-icon veg-mark', style: `--mark:${color || '#d6ecc4'}`, 'aria-label': veg.name },
      h('span', { class: 'veg-mark-char' }, char));
  }
  if (icon.startsWith('img:')) return h('img', { class: 'veg-icon veg-img', src: icon.slice(4), alt: veg.name });
  return h('span', { class: 'veg-icon', 'aria-label': veg.name }, icon);
}

/* ---------- 画面下にしばらく出るお知らせ ---------- */
let toastTimer = null;
// ms：表示する時間（長いお知らせは少し長めに）
function toast(text, ms = 4000) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

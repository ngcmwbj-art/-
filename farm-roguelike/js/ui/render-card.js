'use strict';
/* =========================================================
   カード1枚の描画（戦闘の手札・報酬・山札の一覧で共通）
   ========================================================= */
FR.renderCard = function (v, opts) {
  opts = opts || {};
  const cls = ['card', 'type-' + v.type];
  if (v.upgraded) cls.push('upgraded');
  if (opts.unplayable) cls.push('unplayable');
  if (opts.extraClass) cls.push(opts.extraClass);
  const E = FR.Util.escape;
  // 名前と説明の長さで文字の大きさを変え、カードに収める
  const nl = [...v.name].length;
  cls.push(nl <= 4 ? 'name-s' : nl <= 5 ? 'name-m' : nl <= 6 ? 'name-l' : nl <= 8 ? 'name-xl' : 'name-xxl');
  const tl = [...v.text].length;
  cls.push(tl <= 16 ? 'text-s' : tl <= 26 ? 'text-m' : tl <= 36 ? 'text-l' : 'text-xl');
  return `<div class="${cls.join(' ')}" data-uid="${v.uid || ''}" data-id="${v.id}" ${opts.style ? `style="${opts.style}"` : ''}>
    <span class="cost">${v.cost}</span>
    <div class="name">${E(v.name)}</div>
    <div class="art ${FR.Art.CARDS.has(v.id) ? 'has-photo' : ''}">${FR.Art.cardImg(v)}</div>
    <div class="kind">${FR.CardTypes[v.type] || ''}</div>
    <div class="text">${E(v.text)}</div>
  </div>`;
};

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
  return `<div class="${cls.join(' ')}" data-uid="${v.uid || ''}" data-id="${v.id}" ${opts.style ? `style="${opts.style}"` : ''}>
    <span class="cost">${v.cost}</span>
    <div class="name">${E(v.name)}</div>
    <div class="art">${FR.Art.img(v.art, '', '')}</div>
    <div class="kind">${FR.CardTypes[v.type] || ''}</div>
    <div class="text">${E(v.text)}</div>
  </div>`;
};

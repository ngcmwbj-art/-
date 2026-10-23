'use strict';
/* =========================================================
   戦闘画面の描画
   - 状態 b を見て、毎回つくり直す（数が少ないので十分速い）
   - b.fx に積まれた「起きたこと」を、浮き上がる数字やゆれで見せる
   ========================================================= */
FR.BattleView = {
  render(b) {
    const r = b.run;
    const E = FR.Util.escape;
    const $ = id => document.getElementById(id);

    // 上の帯
    $('b-season').textContent = `夏 ・ ${r.battleIndex + 1}戦目`;
    $('b-gold').textContent = r.gold;
    $('b-relics').innerHTML = r.relics.map(id => {
      const rl = FR.Relics[id];
      return `<button class="relic" data-relic="${id}" aria-label="${E(rl.name)}">${FR.Art.img(rl.art, '', rl.name)}</button>`;
    }).join('');

    // 敵
    const e = b.enemy;
    const it = FR.Battle.intentLabel(b);
    $('b-intent').innerHTML = b.over ? '' : `<span class="intent-name">${E(it.name)}</span><span class="intent-value">${E(it.value)}</span>`;
    $('b-intent').className = 'intent ' + (it.kind || '') + (b.over ? ' hidden' : '');
    $('b-enemy-art').innerHTML = FR.Art.img(e.def.art, '', e.name);
    $('b-enemy-name').textContent = e.name;
    $('b-enemy-bar').style.width = (100 * e.hp / e.maxHp) + '%';
    $('b-enemy-hp').textContent = `勢い ${e.hp} / ${e.maxHp}`;
    $('b-enemy-str').textContent = e.strength ? `力 +${e.strength}` : '';
    $('b-enemy').classList.toggle('defeated', b.over && b.won);

    // 畑
    $('b-field').style.gridTemplateColumns = `repeat(${b.plots.length}, minmax(0, 1fr))`;
    $('b-field').innerHTML = b.plots.map((p, i) => {
      if (!p) return `<div class="plot empty" data-plot="${i}"><small>空き</small></div>`;
      const c = FR.Crops[p.crop];
      const ripe = p.growth >= p.stages;
      return `<div class="plot ${ripe ? 'ripe' : ''}" data-plot="${i}">
        ${FR.Art.img(ripe ? c.art.ripe : c.art.growing, '', c.name)}
        <span class="crop-name">${E(c.name)}</span>
        <small>${ripe ? '実った' : p.growth + '/' + p.stages}</small>
      </div>`;
    }).join('');

    // プレイヤー
    $('b-energy').textContent = b.energy;
    $('b-hp-text').textContent = `農場の健康度 ${r.hp} / ${r.maxHp}`;
    $('b-hp-bar').style.width = (100 * r.hp / r.maxHp) + '%';
    $('b-block').textContent = b.block ? `守り ${b.block}` : '';
    $('b-statuses').innerHTML = Object.keys(b.statuses).filter(k => b.statuses[k] > 0 && FR.Statuses[k]).map(k =>
      `<span class="status" title="${E(FR.Statuses[k].text)}">${E(FR.Statuses[k].name)} ${b.statuses[k]}</span>`).join('');
    $('b-draw').textContent = b.draw.length;
    $('b-discard').textContent = b.discard.length;
    $('b-end').disabled = b.over || FR.HandInput.locked;

    // 手札（扇形に並べる）
    const n = b.hand.length;
    const spread = Math.min(10, 40 / Math.max(1, n));   // 1枚あたりの角度
    $('hand').innerHTML = b.hand.map((inst, i) => {
      const v = FR.cardView(inst);
      const off = i - (n - 1) / 2;
      const rot = off * spread;
      const ty = Math.abs(off) * Math.abs(off) * 2;
      const ok = FR.Battle.canPlay(b, inst).ok;
      return FR.renderCard(v, {
        unplayable: !ok,
        extraClass: FR.HandInput.selected === inst.uid ? 'selected' : '',
        style: `--rot:${rot.toFixed(1)}deg;--ty:${ty.toFixed(0)}px;--z:${i + 1}`
      });
    }).join('');
  },

  // 起きたことの演出
  playFx(b) {
    const fx = b.fx.splice(0);
    let delay = 0;
    for (const f of fx) {
      if (f.kind === 'damage' || f.kind === 'block' || f.kind === 'gold' || f.kind === 'heal' || f.kind === 'blocked' || f.kind === 'buff') {
        const anchor = f.target === 'enemy' ? 'b-enemy-art' : 'b-player';
        FR.BattleView.floatText(anchor, f.text, f.kind + ' ' + (f.target || ''), delay);
        delay += 90;
        if (f.kind === 'damage') FR.BattleView.shake(f.target === 'enemy' ? 'b-enemy-art' : 'b-player');
      } else if (f.kind === 'harvest' || f.kind === 'stolen' || f.kind === 'plant' || f.kind === 'grow') {
        const el = document.querySelector(`.plot[data-plot="${f.plot}"]`);
        if (el) {
          el.classList.remove('pulse-' + f.kind);
          void el.offsetWidth;
          el.classList.add('pulse-' + f.kind);
        }
        if (f.kind === 'harvest' || f.kind === 'stolen') FR.Screens.toast(f.text, f.kind);
      } else if (f.kind === 'warn') {
        FR.Screens.toast(f.text, 'warn');
      } else if (f.kind === 'enemyMove' || f.kind === 'note') {
        FR.Screens.toast(f.text, f.kind);
      }
    }
  },

  floatText(anchorId, text, cls, delay) {
    const a = document.getElementById(anchorId);
    if (!a) return;
    const rect = a.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'float-text ' + cls;
    el.textContent = text;
    el.style.left = (rect.left + rect.width / 2 + (Math.random() * 30 - 15)) + 'px';
    el.style.top = (rect.top + rect.height * 0.35) + 'px';
    el.style.animationDelay = delay + 'ms';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300 + delay);
  },

  shake(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }
};

'use strict';
/* =========================================================
   戦闘画面の描画（Slay the Spire のような横から見た舞台）
   - 左に農家、右に敵が並ぶ。敵の頭上に次の行動の予告、足もとに勢いのバー
   - 下：左にエネルギーと山札、中央に手札、右にターン終了と捨て札
   - 状態 b を見て、毎回つくり直す（数が少ないので十分速い）
   - b.fx に積まれた「起きたこと」を、浮き上がる数字やゆれで見せる
   ========================================================= */
FR.BattleView = {
  // 予告のアイコン（24×24 の線画）
  ICONS: {
    // 攻撃：鎌の刃（刃先が左下＝農家の方を向く）
    attack: '<path d="M20 3 C12 3 5 8 3 16 C7 11 12 9 17 9 Z" fill="currentColor"/><path d="M17 8 L22 21" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    steal: '<path d="M6 4 C4 10 6 14 10 18 M12 3 C11 9 12 14 14 18 M18 4 C19 10 18 14 16 19" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    trample: '<path d="M5 9 C5 5 10 5 10 9 L10 15 C10 19 5 19 5 15Z M14 9 C14 5 19 5 19 9 L19 15 C19 19 14 19 14 15Z" fill="currentColor"/>',
    buff: '<path d="M12 3 L20 12 L15 12 L15 21 L9 21 L9 12 L4 12Z" fill="currentColor"/>',
    blight: '<path d="M12 21 L12 11 C12 6 8 4 4 5 C4 10 7 12 12 12 M12 15 C14 11 18 11 21 13 C19 17 15 17 12 15" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity=".35" stroke-linejoin="round"/><path d="M6 19 L9 22 M18 19 L15 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    debuff: '<path d="M12 21 L4 12 L9 12 L9 3 L15 3 L15 12 L20 12Z" fill="currentColor"/>',
    curse: '<rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="2" fill="currentColor"/><circle cx="14.5" cy="14" r="2.4" fill="currentColor"/><circle cx="9" cy="16" r="1.4" fill="currentColor"/>',
    infect: '<circle cx="12" cy="12" r="5" fill="currentColor"/><path d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12 M5 5 L8 8 M16 16 L19 19 M19 5 L16 8 M8 16 L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    heal: '<path d="M9 3 L15 3 L15 9 L21 9 L21 15 L15 15 L15 21 L9 21 L9 15 L3 15 L3 9 L9 9Z" fill="currentColor"/>',
    other: '<circle cx="12" cy="12" r="6" fill="currentColor"/>'
  },
  icon(kind) {
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${FR.BattleView.ICONS[kind] || FR.BattleView.ICONS.other}</svg>`;
  },

  render(b) {
    const r = b.run;
    const f = FR.Farmers[r.farmerId];
    const E = FR.Util.escape;
    const $ = id => document.getElementById(id);

    // 上の帯
    $('b-farmer').textContent = f.name;
    $('b-season').textContent = '夏';
    $('b-hp-top').textContent = `${r.hp}/${r.maxHp}`;
    $('b-gold').textContent = r.gold;
    $('b-floor').textContent = `${r.battleIndex + 1}戦目`;
    $('b-deck-count').textContent = r.deck.length;
    $('b-relics').innerHTML = r.relics.map(id => {
      const rl = FR.Relics[id];
      return `<button class="relic" data-relic="${id}" aria-label="${E(rl.name)}">${FR.Art.img(rl.art, '', rl.name)}</button>`;
    }).join('');

    // 農家
    $('b-player-art').innerHTML = FR.Art.img('farmer_' + r.farmerId, '', f.name);
    $('b-hp-bar').style.width = (100 * r.hp / r.maxHp) + '%';
    $('b-hp-text').textContent = `${r.hp}/${r.maxHp}`;
    $('b-block').textContent = b.block || '';
    $('b-block').hidden = !b.block;
    $('b-player').classList.toggle('has-block', !!b.block);
    $('b-statuses').innerHTML = Object.keys(b.statuses).filter(k => b.statuses[k] > 0 && FR.Statuses[k]).map(k =>
      `<span class="status ${FR.Statuses[k].bad ? 'bad' : ''}" title="${E(FR.Statuses[k].text)}" data-status="${k}">${E(FR.Statuses[k].name)}<b>${b.statuses[k]}</b></span>`).join('');

    // 敵（左から順に。倒れた敵も場所は残して消えていく）
    const count = b.enemies.length;
    $('b-enemies').innerHTML = b.enemies.map(e => {
      const it = FR.Battle.intentLabel(b, e);
      const size = e.def.size || 1;
      return `<div class="unit enemy-unit ${e.dead ? 'dead' : ''}" data-uid="${e.uid}" style="--size:${size};--count:${count}">
        <div class="intent ${it ? it.kind : ''}" title="${it ? E(it.name) : ''}">${it && !e.dead && !b.over ? FR.BattleView.icon(it.kind) + `<b>${E(it.value)}</b>` : ''}</div>
        <div class="unit-art">${FR.Art.img(e.def.art, '', e.name)}</div>
        <div class="unit-bar"><div class="bar"><b style="width:${100 * e.hp / e.maxHp}%"></b><span>${e.hp}/${e.maxHp}</span></div></div>
        <div class="unit-name">${E(e.name)}${e.strength ? `<em>力${e.strength}</em>` : ''}</div>
        ${e.turnsLeft && !e.dead ? `<div class="turns-left">あと${e.turnsLeft}ターンで過ぎ去る</div>` : ''}
      </div>`;
    }).join('');

    // 畑と畜舎
    const slots = b.plots.length + b.barns.length;
    $('b-field').style.gridTemplateColumns = `repeat(${slots}, minmax(0, 1fr))`;
    $('b-field').classList.toggle('many', slots > 3);
    const plotsHtml = b.plots.map((p, i) => {
      if (!p) return `<div class="plot empty" data-plot="${i}"><small>空き</small></div>`;
      const c = FR.Crops[p.crop];
      const mature = p.growth >= p.stages;
      const ripe = FR.Battle.isRipe(p);
      let label;
      if (p.tree) label = mature ? `実 ${p.fruits}/${p.maxFruits}` : `${p.growth}/${p.stages}`;
      else label = mature ? '実った' : `${p.growth}/${p.stages}`;
      return `<div class="plot ${ripe ? 'ripe' : ''} ${p.tree ? 'tree' : ''}" data-plot="${i}">
        ${FR.Art.img(mature ? c.art.ripe : c.art.growing, '', c.name)}
        <span class="crop-name">${E(c.name)}</span>
        <small>${label}</small>
      </div>`;
    }).join('');
    const barnsHtml = b.barns.map((a, i) => {
      if (!a) return `<div class="barn empty" data-barn="${i}"><small>空き</small></div>`;
      const def = FR.Animals[a.animal];
      const mature = a.growth >= a.stages;
      const g = FR.Battle.gradeOf(a.care, 0);
      return `<div class="barn ${mature ? 'ripe' : ''}" data-barn="${i}">
        ${FR.Art.img(mature ? def.art.ripe : def.art.growing, '', def.name)}
        <span class="crop-name">${E(mature ? def.matureName : def.name)}</span>
        <span class="grade">${g.label}</span>
        <small>${mature ? '出荷できる' : a.growth + '/' + a.stages}</small>
      </div>`;
    }).join('');
    $('b-field').innerHTML = plotsHtml + barnsHtml;
    $('b-field').hidden = slots === 0;

    // 下：エネルギー・山札・捨て札・ターン終了
    $('b-energy').innerHTML = `<b>${b.energy}</b><small>/${FR.Config.energy}</small>`;
    $('b-draw').textContent = b.draw.length;
    $('b-discard').textContent = b.discard.length;
    $('b-end').disabled = b.over || FR.HandInput.locked;

    // 手札（扇形に並べる）
    const n = b.hand.length;
    const spread = Math.min(8, 36 / Math.max(1, n));   // 1枚あたりの角度
    $('hand').innerHTML = b.hand.map((inst, i) => {
      const v = FR.cardView(inst);
      const off = i - (n - 1) / 2;
      const rot = off * spread;
      const ty = Math.abs(off) * Math.abs(off) * 2.5;
      const ok = FR.Battle.canPlay(b, inst).ok;
      const cls = [];
      if (FR.HandInput.selected === inst.uid) cls.push('selected');
      if (FR.Battle.needsTarget(b, inst)) cls.push('needs-target');
      return FR.renderCard(v, {
        unplayable: !ok,
        extraClass: cls.join(' '),
        style: `--rot:${rot.toFixed(1)}deg;--ty:${ty.toFixed(0)}px;--z:${i + 1}`
      });
    }).join('');
    FR.BattleView.fitHand();
    FR.BattleView.updateTargeting(b);
  },

  // 敵を選ぶ必要があるカードを選んでいる間は、敵を光らせる
  updateTargeting(b) {
    const uid = FR.HandInput.selected;
    const inst = uid && b.hand.find(c => c.uid === uid);
    const on = !!(inst && FR.Battle.needsTarget(b, inst));
    document.getElementById('b-stage').classList.toggle('targeting', on);
  },

  // 手札が画面幅に収まるように、カードの重なりを枚数に合わせて決める
  fitHand() {
    const hand = document.getElementById('hand');
    const cards = hand.querySelectorAll('.card');
    if (!cards.length) return;
    const n = cards.length;
    const cw = cards[0].offsetWidth;
    const avail = hand.clientWidth - 8;
    const natural = cw * 0.72;   // 重ねたときの、1枚あたりの見える幅（ふつう）
    const step = n > 1 ? Math.min(natural, (avail - cw) / (n - 1)) : cw;
    const margin = (step - cw) / 2;
    cards.forEach(c => { c.style.margin = `0 ${margin}px`; });
  },

  // 起きたことの演出
  playFx(b) {
    const fx = b.fx.splice(0);
    let delay = 0;
    const enemyArt = uid => document.querySelector(`.enemy-unit[data-uid="${uid}"] .unit-art`);
    for (const f of fx) {
      if (['damage', 'block', 'gold', 'heal', 'blocked', 'buff'].includes(f.kind)) {
        const anchor = f.target === 'enemy' ? enemyArt(f.enemy) : document.getElementById('b-player-art');
        FR.BattleView.floatText(anchor, f.text, f.kind + ' ' + (f.target || ''), delay);
        delay += 90;
        if (f.kind === 'damage') FR.BattleView.shake(anchor);
      } else if (f.kind === 'enemyMove') {
        FR.BattleView.floatText(enemyArt(f.enemy), f.text.split('：')[1], 'move', delay);
      } else if (['harvest', 'stolen', 'plant', 'grow'].includes(f.kind)) {
        const el = f.barn !== undefined
          ? document.querySelector(`.barn[data-barn="${f.barn}"]`)
          : document.querySelector(`.plot[data-plot="${f.plot}"]`);
        if (el) {
          el.classList.remove('pulse-' + f.kind);
          void el.offsetWidth;
          el.classList.add('pulse-' + f.kind);
        }
        if (f.kind === 'harvest' || f.kind === 'stolen') FR.Screens.toast(f.text, f.kind);
      } else if (f.kind === 'warn') {
        FR.Screens.toast(f.text, 'warn');
      } else if (f.kind === 'note') {
        FR.Screens.toast(f.text, 'note');
      }
    }
  },

  floatText(anchor, text, cls, delay) {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'float-text ' + cls;
    el.textContent = text;
    el.style.left = (rect.left + rect.width / 2 + (Math.random() * 24 - 12)) + 'px';
    el.style.top = (rect.top + rect.height * (cls === 'move' ? 0.05 : 0.3)) + 'px';
    el.style.animationDelay = delay + 'ms';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400 + delay);
  },

  shake(el) {
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }
};

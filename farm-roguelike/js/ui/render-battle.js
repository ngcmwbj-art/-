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
    const se = FR.Map.season(r);
    $('b-season').textContent = b.boss ? `${se.name}・ボス` : `${se.name} ${r.step + 1}/${se.steps}`;
    $('b-hp-top').textContent = `${r.hp}/${r.maxHp}`;
    $('b-gold').textContent = r.gold;
    $('b-floor').textContent = b.boss ? '季節の大災害' : '';
    $('b-deck-count').textContent = r.deck.length;
    $('b-relics').innerHTML = r.relics.map(id => {
      const rl = FR.Relics[id];
      return `<button class="relic" data-relic="${id}" aria-label="${E(rl.name)}">${FR.Art.img(rl.art, '', rl.name)}</button>`;
    }).join('');

    // 農家
    $('b-player-art').innerHTML = FR.Art.farmerImg(r.farmerId, f.name);
    $('b-hp-bar').style.width = (100 * r.hp / r.maxHp) + '%';
    $('b-hp-text').textContent = `${r.hp}/${r.maxHp}`;
    $('b-block').textContent = b.block || '';
    $('b-block').hidden = !b.block;
    $('b-player').classList.toggle('has-block', !!b.block);
    $('b-statuses').innerHTML = Object.keys(b.statuses).filter(k => b.statuses[k] > 0 && FR.Statuses[k]).map(k =>
      `<span class="status ${FR.Statuses[k].bad ? 'bad' : ''}" title="${E(FR.Statuses[k].text)}" data-status="${k}">${E(FR.Statuses[k].name)}<b>${b.statuses[k]}</b></span>`).join('');

    // 敵（左から順に）。並びが変わらなければ要素を作り直さず中身だけ変える（勢いのバーがなめらかに減る）
    const count = b.enemies.length;
    const box = $('b-enemies');
    // 同じ戦闘で、同じ並び（番号と種類）のときだけ作り直さない。新しい戦闘では必ず作り直す
    const battleKey = b.run.seed + ':' + b.run.battleIndex + ':' + b.encounter;
    const same = box.dataset.battle === battleKey && box.children.length === count &&
      b.enemies.every((e, k) => box.children[k].dataset.uid == e.uid && box.children[k].dataset.id === e.id);
    box.dataset.battle = battleKey;
    if (!same) {
      box.innerHTML = b.enemies.map(e => `<div class="unit enemy-unit" data-uid="${e.uid}" data-id="${e.id}" style="--size:${e.def.size || 1};--count:${count}">
        <div class="intent"></div>
        <div class="unit-art">${FR.Art.img(e.def.art, '', e.name)}</div>
        <div class="unit-bar"><div class="bar"><b></b><span></span></div></div>
        <div class="unit-name"></div>
        <div class="turns-left"></div>
      </div>`).join('');
    }
    b.enemies.forEach((e, k) => {
      const el = box.children[k];
      const it = FR.Battle.intentLabel(b, e);
      const show = it && !e.dead && !b.over;
      const intent = el.querySelector('.intent');
      intent.className = 'intent ' + (show ? it.kind : '');
      intent.title = show ? it.name : '';
      intent.innerHTML = show ? FR.BattleView.icon(it.kind) + `<b>${E(it.value)}</b>` : '';
      el.querySelector('.bar > b').style.width = (100 * e.hp / e.maxHp) + '%';
      el.querySelector('.bar > span').textContent = `${e.hp}/${e.maxHp}`;
      el.querySelector('.unit-name').innerHTML = E(e.name) + (e.strength ? `<em>力${e.strength}</em>` : '');
      el.querySelector('.turns-left').textContent = e.turnsLeft && !e.dead ? `あと${e.turnsLeft}ターンで過ぎ去る` : '';
      el.classList.toggle('dead', e.dead);
    });

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
      else label = mature ? '収穫できる' : `${p.growth}/${p.stages}`;
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
      const g = FR.Battle.gradeOf(a.care, 0, a.animal);
      // 採卵鶏は格付けの代わりに産んだ卵の数
      const badge = def.layer ? (mature ? `卵${a.eggs || 0}` : '') : g.label;
      return `<div class="barn ${mature ? 'ripe' : ''}" data-barn="${i}">
        ${FR.Art.img(mature ? def.art.ripe : def.art.growing, '', def.name)}
        <span class="crop-name">${E(mature ? def.matureName : def.name)}</span>
        <span class="grade">${badge}</span>
        <small>${mature ? (def.layer ? '産卵中' : `出荷で銭${FR.Battle.shipValue(b, a)}`) : a.growth + '/' + a.stages}</small>
      </div>`;
    }).join('');
    $('b-field').innerHTML = plotsHtml + barnsHtml;
    $('b-field').hidden = slots === 0;
    // 収穫ボタン（畜舎だけなら「出荷」）
    const canH = FR.Battle.canHarvestNow(b) && !FR.HandInput.locked;
    const hb = $('b-harvest');
    hb.disabled = !canH;
    hb.innerHTML = 'まとめて<br>' + (b.plots.length ? '収穫' : '出荷');
    hb.title = '実った作物・木の実・出荷できる家畜をすべて取る（1つずつ選ぶときは区画や畜舎をタップ）';

    // 下：エネルギー・山札・捨て札・ターン終了
    $('b-energy').innerHTML = `<b>${b.energy}</b><small>/${FR.Config.energy}</small>`;
    $('b-draw').textContent = b.draw.length;
    $('b-discard').textContent = b.discard.length;
    $('b-end').disabled = b.over || FR.HandInput.locked;

    // 手札（扇形に並べる）
    const n = b.hand.length;
    // 1枚あたりの角度。縦長のスマホは幅が狭いので、扇を控えめに開く
    const narrow = $('hand').clientWidth < 520;
    const spread = Math.min(narrow ? 5 : 8, (narrow ? 20 : 36) / Math.max(1, n));
    $('hand').innerHTML = b.hand.map((inst, i) => {
      const v = FR.cardView(inst);
      const off = i - (n - 1) / 2;
      const rot = off * spread;
      const ty = Math.abs(off) * Math.abs(off) * 1.6;
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

  // 敵を選ぶ必要があるカードを選んでいる間は、敵を光らせる。選んだカードは大きく表示する
  updateTargeting(b) {
    const uid = FR.HandInput.selected;
    const inst = uid && b.hand.find(c => c.uid === uid);
    const on = !!(inst && FR.Battle.needsTarget(b, inst));
    document.getElementById('b-stage').classList.toggle('targeting', on);
    FR.BattleView.preview(b, inst && !FR.HandInput.drag ? inst : null);
  },

  preview(b, inst) {
    const el = document.getElementById('card-preview');
    if (!el) return;
    if (!inst) { el.className = ''; return; }
    const chk = FR.Battle.canPlay(b, inst);
    const hint = !chk.ok ? chk.reason : FR.Battle.needsTarget(b, inst) ? '敵をタップして使う' : 'もう一度タップで使う';
    const v = FR.cardView(inst);
    el.innerHTML = FR.renderCard(v, { unplayable: !chk.ok })
      + `<div class="pv-side"><button class="pv-close" type="button" onclick="FR.HandInput.clear()">閉じる ✕</button>`
      + `<div class="pv-text">${FR.Util.escape(v.text)}</div>`
      + `<div class="hint">${FR.Util.escape(hint)}</div><div class="terms">${FR.Glossary.html(v)}</div></div>`;
    el.className = 'show';
  },

  // 手札が画面幅に収まるように、カードの重なりを枚数に合わせて決める
  // 端のカードは扇形に傾いている分だけ外へ広がるので、その広がりも含めて収める
  fitHand() {
    const hand = document.getElementById('hand');
    const cards = hand.querySelectorAll('.card');
    if (!cards.length) return;
    const n = cards.length;
    const cw = cards[0].offsetWidth, ch = cards[0].offsetHeight;
    const avail = hand.clientWidth - 8;
    const rot = Math.abs(parseFloat(cards[n - 1].style.getPropertyValue('--rot')) || 0) * Math.PI / 180;
    // 傾けたカードの、中心から外側のふちまでの横幅（回転の中心はカードの下 140% の所）
    const half = cw / 2 * Math.cos(rot) + ch * 1.4 * Math.sin(rot);
    const natural = cw * 0.72;   // 重ねたときの、1枚あたりの見える幅（ふつう）
    const step = n > 1 ? Math.min(natural, (avail - 2 * half) / (n - 1)) : cw;
    const margin = (step - cw) / 2;
    cards.forEach(c => { c.style.margin = `0 ${margin}px`; });
  },

  // 起きたことの演出
  playFx(b) {
    const fx = b.fx.splice(0);
    let delay = 0;
    const enemyArt = uid => document.querySelector(`.enemy-unit[data-uid="${uid}"] .unit-art`);
    for (const f of fx) {
      if (['damage', 'block', 'gold', 'heal', 'blocked', 'buff', 'energy'].includes(f.kind)) {
        const anchor = f.target === 'enemy' ? enemyArt(f.enemy) : document.getElementById('b-player-art');
        FR.BattleView.floatText(anchor, f.text, f.kind + ' ' + (f.target || ''), delay);
        if (f.kind === 'damage') FR.BattleView.hit(anchor, delay);
        delay += FR.BattleView.STAGGER;
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
        if ((f.kind === 'harvest' || f.kind === 'stolen') && f.text) { const t = f.text, k = f.kind; setTimeout(() => FR.Screens.toast(t, k), delay); delay += FR.BattleView.STAGGER; }
      } else if (f.kind === 'ship') {
        FR.BattleView.shipSlip(f);
      } else if (f.kind === 'warn') {
        FR.Screens.toast(f.text, 'warn');
      } else if (f.kind === 'note') {
        const t = f.text; setTimeout(() => FR.Screens.toast(t, 'note'), delay);
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
    setTimeout(() => el.remove(), 2200 + delay);
  },

  // 数字を出す間隔（ミリ秒）。大きくするとゆっくりになる
  STAGGER: 280,

  // 当たったとき：赤く光ってゆれる
  hit(el, delay) {
    if (!el) return;
    setTimeout(() => {
      el.classList.remove('shake', 'hit-flash');
      void el.offsetWidth;
      el.classList.add('shake', 'hit-flash');
    }, delay || 0);
  },

  shake(el) { FR.BattleView.hit(el, 0); },

  // 出荷票：出荷した家畜の格付けと、銭の計算を数秒見せる（何頭も出荷したら順番に）
  _slips: [],
  shipSlip(f) {
    FR.BattleView._slips.push(f);
    if (FR.BattleView._slips.length === 1) FR.BattleView._nextSlip();
  },
  _nextSlip() {
    const f = FR.BattleView._slips[0];
    const el = document.getElementById('ship-slip');
    if (!f || !el) return;
    const E = FR.Util.escape;
    const calc = f.grade ? [`基本 ${f.base}`, `格付け ×${f.mult}`] : [`基本 ${f.base}`];
    if (f.contract > 1) calc.push(`契約 ×${f.contract}`);
    el.innerHTML = `<div class="slip-head">出荷票</div>
      <div class="slip-name">${E(f.name)}</div>
      ${f.grade ? `<div class="slip-grade"><span>格付け</span><b>${E(f.grade)}</b></div>
      <div class="slip-row">手入れ ${f.care}${f.bonus ? `（セリで +${f.bonus}段）` : ''}</div>` : '<div class="slip-row">格付けなし</div>'}
      <div class="slip-row calc">${calc.join(' ・ ')}</div>
      <div class="slip-gold">銭 +${f.gold}</div>
      <div class="slip-row">${E(f.effect)}</div>`;
    el.className = 'show';
    setTimeout(() => {
      el.className = '';
      setTimeout(() => { FR.BattleView._slips.shift(); FR.BattleView._nextSlip(); }, 300);
    }, 2400);
  },

  // 画面中央に大きく文字を出す（「敵のターン」など）
  banner(text, cls) {
    const el = document.getElementById('turn-banner');
    if (!el) return;
    el.textContent = text;
    el.className = 'show ' + (cls || '');
    clearTimeout(FR.BattleView._bannerTimer);
    FR.BattleView._bannerTimer = setTimeout(() => { el.className = ''; }, 900);
  },

  // カードを使ったとき：手札から狙った先へ飛んで消える
  flyCard(cardEl, targetEl) {
    if (!cardEl) return;
    const from = cardEl.getBoundingClientRect();
    const to = (targetEl || document.getElementById('b-stage')).getBoundingClientRect();
    const ghost = cardEl.cloneNode(true);
    ghost.classList.remove('selected', 'dragging', 'will-play');
    ghost.classList.add('card-ghost');
    Object.assign(ghost.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px', margin: 0 });
    document.body.appendChild(ghost);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    ghost.animate([
      { transform: 'translate(0, 0) scale(1.1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * .55}px, ${dy * .55}px) scale(1.15) rotate(0deg)`, opacity: 1, offset: .55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.35) rotate(8deg)`, opacity: 0 }
    ], { duration: 420, easing: 'cubic-bezier(.3,.6,.3,1)' }).onfinish = () => ghost.remove();
  },

  // 農家・敵が前に出る（攻撃のしぐさ）
  lunge(el, dir) {
    if (!el) return;
    el.classList.remove('lunge-left', 'lunge-right');
    void el.offsetWidth;
    el.classList.add(dir === 'right' ? 'lunge-right' : 'lunge-left');
    setTimeout(() => el.classList.remove('lunge-left', 'lunge-right'), 520);
  }
};

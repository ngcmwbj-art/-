'use strict';
/* =========================================================
   起動と画面のつなぎ役
   タイトル → 農家タイプ選択 → 行き先を選ぶ → 戦闘・市場・休憩所 → … → 季節のボス → 季節の終わり
   → 次の季節 … 冬のボスを倒せばクリア。健康度が0になったら、その場で経営評価
   ========================================================= */
const App = {
  data: null,     // 保存データ { run, meta }
  battle: null,   // 戦闘中の状態
  rewardPick: null,

  init() {
    App.data = FR.Save.load();
    document.querySelectorAll('[data-game-title]').forEach(el => { el.textContent = FR.Config.title; });
    document.querySelectorAll('[data-game-subtitle]').forEach(el => { el.textContent = FR.Config.subtitle; });
    document.title = FR.Config.title;

    // タイトル
    document.getElementById('btn-new').onclick = () => App.showSelect();
    document.getElementById('btn-continue').onclick = () => App.resume();
    // 戦闘
    document.getElementById('b-end').onclick = () => App.endTurn();
    document.getElementById('b-harvest').onclick = () => App.harvestNow();
    document.getElementById('b-menu').onclick = () => App.showMenu();
    document.getElementById('b-pile-draw').onclick = () => App.showPile('山札', App.battle.draw, true);
    document.getElementById('b-pile-discard').onclick = () => App.showPile('捨て札', App.battle.discard);
    // 敵をタップ：カードを選んでいればその敵に使う。選んでいなければ敵の説明
    document.getElementById('b-enemies').onclick = ev => {
      const u = ev.target.closest('.enemy-unit');
      if (!u || !App.battle) return;
      const e = App.battle.enemies.find(x => x.uid === +u.dataset.uid);
      if (!e || e.dead) return;
      if (FR.HandInput.selected) { App.playCard(FR.HandInput.selected, e.uid); return; }
      const it = FR.Battle.intentLabel(App.battle, e);
      FR.Screens.toast(`${e.name}　勢い ${e.hp}/${e.maxHp}${e.strength ? '　力+' + e.strength : ''}　次は「${it.name}」`);
    };
    document.getElementById('b-relics').onclick = ev => {
      const btn = ev.target.closest('[data-relic]');
      if (!btn) return;
      const r = FR.Relics[btn.dataset.relic];
      FR.Screens.modal(r.name, `<p class="relic-text">${FR.Util.escape(r.text)}</p>`);
    };
    // 区画・畜舎をタップすると説明
    document.getElementById('b-field').onclick = ev => {
      const bt = App.battle;
      const pe = ev.target.closest('.plot');
      const be = ev.target.closest('.barn');
      if (pe) {
        const i = +pe.dataset.plot;
        if (!bt.plots[i]) { FR.Screens.toast('空いた区画。種まきや苗木の植え付けで使う'); return; }
        App.showCrop(i);
      } else if (be) {
        const i = +be.dataset.barn;
        if (!bt.barns[i]) { FR.Screens.toast('空いた畜舎。子牛導入などで使う'); return; }
        App.showAnimal(i);
      }
    };
    FR.HandInput.attach(document.getElementById('hand'), {
      onPlay: (uid, targetUid) => App.playCard(uid, targetUid),
      onSelect: () => App.battle && FR.BattleView.updateTargeting(App.battle)
    });
    // ダイアログを閉じる
    document.getElementById('modal').onclick = ev => {
      if (ev.target.id === 'modal' || ev.target.closest('.modal-close')) FR.Screens.closeModal();
    };
    // 報酬
    document.getElementById('reward-take').onclick = () => App.takeReward(App.rewardPick);
    // 市場
    document.getElementById('tab-buy').onclick = () => { App.marketTab = 'buy'; App.marketArmed = null; App.renderMarket(); };
    document.getElementById('tab-sell').onclick = () => { App.marketTab = 'sell'; App.marketArmed = null; App.renderMarket(); };
    document.getElementById('market-leave').onclick = () => App.leaveMarket();
    document.getElementById('screen-market').onclick = ev => {
      const run = App.data.run;
      const buy = ev.target.closest('[data-buy]');
      const sell = ev.target.closest('[data-sell]');
      if (buy && !buy.disabled) {
        const k = +buy.dataset.buy;
        const name = FR.Cards[run.market.stock[k].id].name;
        if (FR.Market.buy(run, k)) { App.save(); FR.Screens.toast(`${name}を買った`, 'harvest'); }
        App.renderMarket();
      } else if (sell && !sell.disabled) {
        const uid = +sell.dataset.sell;
        if (App.marketArmed !== uid) { App.marketArmed = uid; App.renderMarket(); return; }
        const inst = run.deck.find(c => c.uid === uid);
        const name = inst && FR.cardView(inst).name;
        const got = FR.Market.sell(run, uid);
        App.marketArmed = null;
        if (got) { App.save(); FR.Screens.toast(`${name}を売った（銭 +${got}）`, 'harvest'); }
        App.renderMarket();
      }
    };
    // 舞台の何もないところをタップすると、選んだカードを取り消す
    document.getElementById('b-stage').addEventListener('click', ev => {
      if (ev.target.closest('.enemy-unit, #b-player-art')) return;
      if (FR.HandInput.selected) { FR.HandInput.clear(); App.battle && FR.BattleView.render(App.battle); }
    });
    // 自分の農家をタップすると状態
    document.getElementById('b-player-art').onclick = () => App.showPlayer();
    document.getElementById('reward-skip').onclick = () => App.takeReward(null);
    document.getElementById('reward-cards').onclick = ev => {
      const c = ev.target.closest('.card');
      if (!c) return;
      App.rewardPick = c.dataset.id;
      document.getElementById('reward-terms').innerHTML = FR.Glossary.html(FR.cardView({ id: c.dataset.id, uid: 0 }));
      document.querySelectorAll('#reward-cards .card').forEach(x => x.classList.toggle('selected', x === c));
      document.getElementById('reward-take').disabled = false;
    };
    // 行き先・休憩所・季節の終わり
    document.getElementById('map-choices').onclick = ev => { const b = ev.target.closest('[data-k]'); if (b) App.pickNode(+b.dataset.k); };
    document.getElementById('map-deck').onclick = () => App.showDeck();
    document.getElementById('rest-options').onclick = ev => { const b = ev.target.closest('[data-rest]'); if (b && !b.disabled) App.restAction(b.dataset.rest); };
    document.getElementById('rest-upgrade-back').onclick = () => App.showRest();
    document.getElementById('rest-upgrade-list').onclick = ev => {
      const b = ev.target.closest('[data-up]');
      if (!b) return;
      const run = App.data.run;
      const inst = run.deck.find(c => c.uid === +b.dataset.up);
      if (FR.Map.upgrade(run, +b.dataset.up)) { FR.Screens.toast(`${FR.cardView(inst).name}に強化した`, 'harvest'); App.advance(); }
    };
    document.getElementById('season-next').onclick = () => App.seasonNext();
    // カードをタップすると大きく表示し、言葉の説明を出す（帳面・山札・市場・休憩所）
    document.getElementById('modal').addEventListener('click', ev => {
      const c = ev.target.closest('.card-list .card');
      if (c && c.dataset.id) App.showCardDetail(c);
    });
    document.getElementById('screen-market').addEventListener('click', ev => {
      const c = ev.target.closest('.market-item .card');
      if (c && c.dataset.id) App.showCardDetail(c);
    });
    // 経営評価
    document.getElementById('btn-again').onclick = () => App.showSelect();
    document.getElementById('btn-title').onclick = () => App.showTitle();

    App.showTitle();
  },

  save() { FR.Save.write(App.data); },

  // ── タイトル ───────────────────────────────
  showTitle() {
    const has = !!App.data.run;
    document.getElementById('btn-continue').hidden = !has;
    document.getElementById('title-best').textContent = App.data.meta.best ? `最高の経営評価 ${App.data.meta.best}点` : '';
    FR.Screens.show('title');
  },

  // ── 農家タイプ選択 ────────────────────────────
  showSelect() {
    const E = FR.Util.escape;
    const list = document.getElementById('farmer-list');
    list.innerHTML = Object.keys(FR.Farmers).map(id => {
      const f = FR.Farmers[id];
      return `<button class="farmer ${f.enabled ? '' : 'locked'}" data-farmer="${id}" ${f.enabled ? '' : 'disabled'}>
        <span class="farmer-art">${FR.Art.farmerImg(id, f.name)}</span>
        <span class="farmer-body">
          <span class="farmer-name">${E(f.name)}${f.enabled ? '' : '<em>準備中</em>'}</span>
          <span class="farmer-text">${E(f.text)}</span>
          ${f.relic ? `<span class="farmer-skill"><b>固有スキル：${E(FR.Relics[f.relic].name)}</b>${E(FR.Relics[f.relic].text)}</span>` : ''}
          <span class="farmer-hp">健康度 ${f.hp}</span>
        </span>
      </button>`;
    }).join('');
    list.onclick = ev => {
      const b = ev.target.closest('[data-farmer]');
      if (b && !b.disabled) App.newRun(b.dataset.farmer);
    };
    FR.Screens.show('select');
  },

  newRun(farmerId) {
    App.data.run = FR.Run.create(farmerId, FR.Util.newSeed());
    App.data.meta.runs++;
    App.goMap();
  },

  resume() {
    const run = App.data.run;
    if (!run) return App.showTitle();
    if (run.phase === 'reward' && run.reward) App.showReward();
    else if (run.phase === 'market' && run.market) App.showMarket();
    else if (run.phase === 'rest') App.showRest();
    else if (run.phase === 'season' && run.seasonResult) App.showSeasonEnd();
    else if (run.phase === 'battle' && run.node) App.startBattle();
    else App.goMap();
  },

  // ── 行き先を選ぶ ─────────────────────────────
  goMap() {
    const run = App.data.run;
    run.phase = 'map';
    run.node = null;
    if (!run.choices) run.choices = FR.Map.makeChoices(run);
    App.save();
    App.showMap();
  },

  // 1つの段を終えて、次の段へ
  advance() {
    const run = App.data.run;
    run.step++;
    run.choices = null;
    App.goMap();
  },

  showMap() {
    const run = App.data.run;
    const E = FR.Util.escape;
    const se = FR.Map.season(run);
    const boss = FR.Map.isBossStep(run);
    document.getElementById('map-season').innerHTML = `<b>${E(se.name)}</b><span>${run.season + 1}つ目の季節・${run.step + 1} / ${se.steps}</span>`;
    // 進み具合：済んだ段・今の段・ボス
    document.getElementById('map-progress').innerHTML = Array.from({ length: se.steps }, (_, k) =>
      `<span class="dot ${k < run.step ? 'done' : k === run.step ? 'now' : ''} ${k === se.steps - 1 ? 'boss' : ''}">${k === se.steps - 1 ? '主' : k + 1}</span>`).join('');
    document.getElementById('map-lead').textContent = run.step === 0 ? se.text
      : boss ? '季節の終わり。大きな災いがやってくる' : 'どこへ向かう？';
    document.getElementById('map-choices').innerHTML = run.choices.map((c, k) => {
      const t = FR.NodeTypes[c.type];
      let art = t.art ? FR.Art.img(t.art, '', t.name) : '';
      let title = t.name, sub = t.text;
      if (c.type === 'battle') {
        const en = FR.Encounters.find(x => x.id === c.enc);
        const defs = en.enemies.map(id => FR.Enemies[id]);
        art = `<img src="${FR.Art.url(defs[defs.length - 1].art)}" alt="">`;
        // 同じ敵が並ぶときは「×3」にまとめる
        const names = [];
        defs.forEach(d => { const f = names.find(n => n.name === d.name); if (f) f.n++; else names.push({ name: d.name, n: 1 }); });
        title = names.map(n => n.name + (n.n > 1 ? '×' + n.n : '')).join('・');
        sub = defs.some(d => d.turns) ? '天候：決まったターン数を耐えても過ぎ去る' : '戦い。勝てばカード1枚と銭';
        const tier = FR.Map.tier(c.enc);
        sub = `<span class="mc-tier tier-${tier}">強さ ${'★'.repeat(tier)}${'☆'.repeat(3 - tier)} ${FR.Map.TIER_NAMES[tier]}</span>`
          + (tier === 3 ? '<span class="mc-good">良いカードが出やすい・銭も多い</span>' : tier === 1 ? '<span class="mc-good weak">カードはふつうのものが多い</span>' : '')
          + E(sub);
      } else if (c.type === 'boss') {
        const d = FR.Enemies[c.boss];
        art = `<img src="${FR.Art.url(d.art)}" alt="">`;
        title = d.name;
        sub = '季節のボス。勝てば次の季節へ（耐えても過ぎ去らない）';
      }
      return `<button class="map-choice type-${c.type}" data-k="${k}">
        <span class="mc-art">${art}</span>
        <span class="mc-body"><span class="mc-kind">${E(t.name)}</span><b>${E(title)}</b><span class="mc-text">${c.type === 'battle' ? sub : E(sub)}</span></span>
      </button>`;
    }).join('');
    document.getElementById('map-status').textContent = `健康度 ${run.hp} / ${run.maxHp} ・ 銭 ${run.gold} ・ デッキ ${run.deck.length}枚`;
    FR.Screens.show('map');
  },

  pickNode(k) {
    const run = App.data.run;
    const c = run.choices && run.choices[k];
    if (!c) return;
    run.node = c;
    if (c.type === 'battle' || c.type === 'boss') {
      // 戦闘を始めるたびに少し回復（開き直したときに二重にならないよう、ここで1回だけ）
      const before = run.hp;
      run.hp = Math.min(run.maxHp, run.hp + (FR.Config.battleStartHeal || 0));
      App.startBattle();
      if (run.hp > before) {
        App.battle.fx.push({ kind: 'heal', target: 'player', text: '+' + (run.hp - before) });
        App.refresh();
        FR.Screens.toast(`ひと息ついた：健康度 +${run.hp - before}`, 'heal');
      }
      return;
    }
    if (c.type === 'market') {
      run.phase = 'market';
      run.market = FR.Market.make(run);
      App.save();
      return App.showMarket();
    }
    if (c.type === 'rest') {
      run.phase = 'rest';
      App.save();
      return App.showRest();
    }
  },

  // ── 休憩所 ──────────────────────────────────
  showRest() {
    const run = App.data.run;
    const E = FR.Util.escape;
    const ex = FR.Map.REST_EXTRA[run.farmerId] || FR.Map.REST_EXTRA.vegetable;
    const heal = Math.min(FR.Map.restHealAmount(run), run.maxHp - run.hp);
    const ups = FR.Map.upgradable(run).length;
    document.getElementById('rest-options').innerHTML = [
      ['heal', '休む', `健康度を ${heal} 回復する（最大の3割）`, run.hp >= run.maxHp ? '健康度はいっぱい' : ''],
      ['upgrade', '腕を磨く', 'デッキのカードを1枚強化する（強化は休憩所でしかできない）', ups ? '' : '強化できるカードがない'],
      ['extra', ex.name, ex.text, '']
    ].map(([k, name, text, why]) => `<button class="map-choice rest-${k}" data-rest="${k}" ${why ? 'disabled' : ''}>
      <span class="mc-body"><b>${E(name)}</b><span class="mc-text">${E(why || text)}</span></span></button>`).join('');
    document.getElementById('rest-options').hidden = false;
    document.getElementById('rest-upgrade').hidden = true;
    document.getElementById('rest-status').textContent = `健康度 ${run.hp} / ${run.maxHp} ・ デッキ ${run.deck.length}枚（強化済み ${run.deck.filter(c => c.upgraded).length}枚）`;
    FR.Screens.show('rest');
  },

  restAction(kind) {
    const run = App.data.run;
    if (kind === 'heal') {
      const got = FR.Map.restHeal(run);
      FR.Screens.toast(`ひと休みした（健康度 +${got}）`, 'harvest');
      return App.advance();
    }
    if (kind === 'extra') {
      const ex = FR.Map.restExtra(run);
      FR.Screens.toast(`${ex.name}：${ex.text}`, 'harvest');
      return App.advance();
    }
    if (kind === 'upgrade') {
      // 強化できるカードを、強化したあとの中身で並べる
      const list = FR.Map.upgradable(run).sort((a, b) => FR.cardView(a).name.localeCompare(FR.cardView(b).name, 'ja'));
      document.getElementById('rest-upgrade-list').innerHTML = list.map(inst => {
        const before = FR.cardView(inst);
        const after = FR.cardView(Object.assign({}, inst, { upgraded: true }));
        return `<div class="market-item">${FR.renderCard(after)}
          <span class="why up-from">今：${FR.Util.escape(before.cost !== after.cost ? `コスト${before.cost}` : before.text)}</span>
          <button class="btn price" data-up="${inst.uid}">これを強化する</button></div>`;
      }).join('');
      document.getElementById('rest-options').hidden = true;
      document.getElementById('rest-upgrade').hidden = false;
    }
  },

  // ── 季節の終わり ──────────────────────────────
  finishSeason() {
    const run = App.data.run;
    const st = run.stats;
    const res = FR.Map.endSeason(run);
    run.seasonResult = { season: run.season, heal: res.heal, clear: res.clear, harvest: st.harvest, gold: run.gold, damage: st.damageTaken };
    run.phase = 'season';
    App.save();
    App.showSeasonEnd();
  },

  showSeasonEnd() {
    const run = App.data.run;
    const r = run.seasonResult;
    const se = FR.Seasons[r.season];
    const E = FR.Util.escape;
    document.getElementById('season-title').textContent = r.clear ? '一年を乗り切った' : `${se.name}を越えた`;
    document.getElementById('season-lead').textContent = r.clear
      ? '冬の大災害を退けた。この一年の経営を振り返ろう。'
      : `季節の変わり目に、ひと息ついた（健康度 +${r.heal}）。次は${FR.Seasons[r.season + 1].name}。`;
    document.getElementById('season-parts').innerHTML = [
      ['これまでの収穫量', r.harvest], ['手元の銭', r.gold], ['受けた被害', r.damage], ['健康度', `${run.hp} / ${run.maxHp}`]
    ].map(([k, v]) => `<tr><th>${E(k)}</th><td>${E(v)}</td></tr>`).join('');
    document.getElementById('season-next').textContent = r.clear ? '経営評価を見る' : `${FR.Seasons[r.season + 1].name}へ進む`;
    FR.Screens.show('season');
  },

  seasonNext() {
    const run = App.data.run;
    const r = run.seasonResult;
    run.seasonResult = null;
    if (r.clear) { run.cleared = true; return App.endRun(); }
    FR.Map.nextSeason(run);
    App.goMap();
  },

  // ── 戦闘 ─────────────────────────────────
  startBattle() {
    const run = App.data.run;
    run.phase = 'battle';
    App.save();   // 戦闘の途中で閉じたら、この時点からやり直し
    App.battle = FR.Battle.create(run);
    FR.HandInput.locked = false;
    FR.HandInput.clear();
    FR.Screens.show('battle');
    App.refresh();
    if (!App.data.meta.tutorialDone) setTimeout(() => FR.Tutorial.start(), 600);
  },

  refresh() {
    FR.BattleView.render(App.battle);
    FR.BattleView.playFx(App.battle);
  },

  // 戦闘のテンポ（ミリ秒）。数を大きくするとゆっくりになる
  TEMPO: {
    fly: 380,         // カードが飛んでいく時間
    afterPlay: 350,   // カードの効果が出たあと、次の操作ができるまで
    discard: 450,     // ターン終了で手札を捨てる
    banner: 900,      // 「敵のターン」の文字
    enemyWindup: 320, // 敵が前に出てから当たるまで
    enemyGap: 950,    // 敵1体ごとの間
    endBattle: 1700   // 勝ち負けが決まってから次の画面まで
  },
  wait(ms) { return new Promise(r => setTimeout(r, ms)); },

  playCard(uid, targetUid) {
    const b = App.battle;
    if (!b || b.over || FR.HandInput.locked) return;
    const inst = b.hand.find(c => c.uid === uid);
    if (!inst) return;
    // 敵が2体以上いて、1体を狙うカードなら、敵を選んでもらう
    if (FR.Battle.canPlay(b, inst).ok && FR.Battle.needsTarget(b, inst) && !b.enemies.some(e => e.uid === targetUid && !e.dead)) {
      FR.HandInput.select(uid);
      FR.Screens.toast('どの敵に使う？　敵をタップ');
      return;
    }
    const chk = FR.Battle.canPlay(b, inst);
    if (!chk.ok) { FR.Screens.toast(chk.reason, 'warn'); return; }
    const v = FR.cardView(inst);
    const T = App.TEMPO;
    // 狙う先：1体狙いなら選んだ敵、攻撃なら先頭の敵、それ以外は自分の畑のあたり
    const alive = FR.Battle.aliveEnemies(b);
    const targetEnemy = b.enemies.find(e => e.uid === targetUid && !e.dead) || (alive.length === 1 ? alive[0] : null);
    const isAttack = v.effects.some(e => /^damage/.test(e.op));
    const enemyEl = e => e && document.querySelector(`.enemy-unit[data-uid="${e.uid}"] .unit-art`);
    const flyTo = isAttack ? (enemyEl(targetEnemy) || document.getElementById('b-enemies')) : document.getElementById('b-player-art');
    FR.HandInput.locked = true;
    FR.HandInput.clear();
    const cardEl = document.querySelector(`#hand .card[data-uid="${uid}"]`);
    FR.BattleView.flyCard(cardEl, flyTo);
    if (cardEl) cardEl.style.visibility = 'hidden';
    if (isAttack) FR.BattleView.lunge(document.getElementById('b-player-art'), 'right');
    setTimeout(() => {
      FR.Battle.play(b, uid, targetUid);
      App.refresh();
      setTimeout(() => {
        FR.HandInput.locked = false;
        if (b.over) App.afterBattle(); else FR.BattleView.render(b);
      }, T.afterPlay);
    }, T.fly);
  },

  // 収穫ボタン（エネルギーを使わない）
  harvestNow() {
    const b = App.battle;
    if (!b || b.over || FR.HandInput.locked || !FR.Battle.canHarvestNow(b)) return;
    FR.Battle.harvestButton(b);
    App.refresh();
    if (b.over) App.afterBattle();
  },

  // ターン終了：手札を捨てる → 「敵のターン」 → 敵が1体ずつ動く → 作物が育つ → 「あなたのターン」
  async endTurn() {
    const b = App.battle;
    if (!b || b.over || FR.HandInput.locked) return;
    const T = App.TEMPO;
    FR.HandInput.locked = true;
    FR.HandInput.clear();
    document.getElementById('b-end').disabled = true;
    document.getElementById('b-harvest').disabled = true;
    document.getElementById('hand').classList.add('discarding');
    await App.wait(T.discard);
    FR.Battle.endTurnBegin(b);
    document.getElementById('hand').classList.remove('discarding');
    FR.BattleView.render(b);
    FR.BattleView.banner('敵のターン', 'enemy');
    await App.wait(T.banner);
    for (const e of FR.Battle.aliveEnemies(b)) {
      if (b.over) break;
      FR.BattleView.lunge(document.querySelector(`.enemy-unit[data-uid="${e.uid}"] .unit-art`), 'left');
      await App.wait(T.enemyWindup);
      FR.Battle.enemyActOne(b, e);
      App.refresh();
      await App.wait(T.enemyGap);
    }
    if (!b.over) {
      FR.Battle.endTurnFinish(b);
      FR.HandInput.locked = false;
      App.refresh();
      if (!b.over) FR.BattleView.banner('あなたのターン');
    }
    FR.HandInput.locked = false;
    FR.BattleView.render(b);
    if (b.over) App.afterBattle();
  },

  afterBattle() {
    const b = App.battle;
    FR.HandInput.locked = true;
    FR.BattleView.render(b);
    FR.BattleView.banner(b.won ? '追い払った' : '力尽きた', b.won ? '' : 'enemy');
    setTimeout(() => {
      if (b.won) {
        const run = App.data.run;
        run.nextBattle = null;   // 休憩所でかけた状態は、この戦闘で使い切り
        run.phase = 'reward';
        run.reward = FR.Reward.make(run);
        run.reward.autoHarvestGold = b.autoHarvestGold || 0;
        run.gold += run.reward.gold;
        run.stats.goldEarned += run.reward.gold;
        App.save();
        App.showReward();
      } else {
        App.endRun();
      }
    }, App.TEMPO.endBattle);
  },

  // 選んだ区画・畜舎だけを収穫／出荷する
  harvestOne(kind, i) {
    const b = App.battle;
    if (!b || b.over || FR.HandInput.locked) return;
    FR.Screens.closeModal();
    if (!FR.Battle.harvestOne(b, kind, i)) return;
    App.refresh();
    if (b.over) App.afterBattle();
  },

  // 説明の下に置く「収穫する」ボタン（押せないときは理由を出す）
  actionButton(kind, i, ok, label, why) {
    const can = ok && !FR.HandInput.locked;
    return `<div class="menu-actions"><button class="btn primary" id="act-one" data-kind="${kind}" data-i="${i}" ${can ? '' : 'disabled'}>${label}</button></div>
      ${!can ? `<p class="menu-note act-why">${FR.HandInput.locked ? '敵のターンが終わるまで待ってください' : why}</p>` : ''}`;
  },
  bindAction() {
    const btn = document.getElementById('act-one');
    if (btn) btn.onclick = () => App.harvestOne(btn.dataset.kind, +btn.dataset.i);
  },

  // 作物・木の説明と「収穫する」
  showCrop(i) {
    const b = App.battle;
    const p = b.plots[i];
    const E = FR.Util.escape;
    const c = FR.Crops[p.crop];
    const mature = p.growth >= p.stages;
    let rows, ok, label, why;
    if (p.tree) {
      const ripen = b.statuses.ripening || 0;
      const gold = c.fruitGold + ripen * 3;
      rows = `
        <div class="ai-row"><span>育ち</span><b>${p.growth} / ${p.stages}段</b><em>${mature ? '成木。毎ターン終わりに実が1つなる' : `あと${p.stages - p.growth}段で成木`}</em></div>
        <div class="ai-row"><span>実</span><b>${p.fruits} / ${p.maxFruits}</b><em>上限までなると、それ以上はならない</em></div>
        <div class="ai-row"><span>実1つで</span><b>銭 ${gold}</b><em>${E(c.harvestText)}${b.statuses.bigFruit ? '（摘果で効果2倍）' : ''}${ripen ? `・守り+${ripen * 2}` : ''}</em></div>
        <div class="ai-row"><span>いま摘むと</span><b>銭 ${gold * p.fruits}</b><em>木は残る</em></div>`;
      ok = p.fruits > 0; label = p.fruits ? `実を${p.fruits}つ摘む` : '実を摘む'; why = 'まだ実がなっていない';
    } else {
      rows = `
        <div class="ai-row"><span>育ち</span><b>${p.growth} / ${p.stages}段</b><em>${mature ? '実った' : `あと${p.stages - p.growth}段。ターンの終わりや水やり・肥料で育つ`}</em></div>
        <div class="ai-row"><span>収穫すると</span><b>銭 ${c.gold}</b><em>${E(c.harvestText)}。区画が空く</em></div>`;
      ok = mature; label = 'この作物を収穫する'; why = 'まだ実っていない';
    }
    FR.Screens.modal(p.tree && !mature ? c.name + 'の苗木' : c.name, `<div class="animal-info">${rows}</div>` + App.actionButton('plot', i, ok, label, why));
    App.bindAction();
  },

  // 家畜の説明：育ち・手入れ・格付け・出荷の見込みと、格付けの表、「出荷する」。採卵鶏は卵の説明
  showAnimal(i) {
    const b = App.battle;
    const a = b.barns[i];
    const E = FR.Util.escape;
    const def = FR.Animals[a.animal];
    const mature = a.growth >= a.stages;
    const value = FR.Battle.shipValue(b, a);
    const contractText = b.statuses.contract ? ` × 契約${1 + 0.5 * b.statuses.contract}` : '';
    const growRow = `<div class="ai-row"><span>育ち</span><b>${a.growth} / ${a.stages}段</b><em>${mature
      ? (def.layer ? '成鶏。卵を産んでいる' : '出荷できる')
      : `あと${a.stages - a.growth}段。給餌などで育つ（自然には育たない）`}</em></div>`;

    if (def.layer) {
      FR.Screens.modal(mature ? def.matureName : def.name, `
        <div class="animal-info">
          ${growRow}
          <div class="ai-row"><span>産卵</span><b>${mature ? 'あり' : 'まだ'}</b><em>成鶏になると、毎ターン始めに卵を1つ産む（${E(def.turnText.replace('毎ターン卵：', ''))}）</em></div>
          <div class="ai-row"><span>産んだ卵</span><b>${a.eggs || 0}個</b><em>この戦闘で</em></div>
          <div class="ai-row"><span>廃鶏で出荷</span><b>銭 ${value}</b><em>卵を産み終えた鶏として引き取ってもらう。${E(def.shipText)}。「まとめて出荷」では出荷されない</em></div>
        </div>
        <p class="menu-note">採卵鶏に格付けはありません。手入れをしても値段は変わらず、置いておくほど卵で稼げます。</p>`
        + App.actionButton('barn', i, mature, `廃鶏として出荷する（銭${value}）`, 'まだ成鶏になっていない'));
      App.bindAction();
      return;
    }

    const table = FR.Battle.gradeTable(a.animal);
    const g = FR.Battle.gradeOf(a.care, 0, a.animal);
    const nx = FR.Battle.nextGrade(a.care, a.animal);
    const kind = def.grading === 'pork' ? '豚の格付け' : '牛の格付け';
    FR.Screens.modal(mature ? def.matureName : def.name, `
      <div class="animal-info">
        ${growRow}
        <div class="ai-row"><span>手入れ</span><b>${a.care}</b><em>${nx ? `あと${nx.need}で「${nx.grade.label}」` : 'いちばん上の格付け'}</em></div>
        <div class="ai-row"><span>格付け</span><b>${g.label}</b><em>銭が ×${g.mult}</em></div>
        <div class="ai-row"><span>出荷すると</span><b>銭 ${value}</b><em>基本 ${def.gold} × ${g.mult}${contractText}。${E(def.shipText)}</em></div>
      </div>
      <table class="grade-table"><thead><tr><th>${kind}</th>${table.map(x => `<th class="${x.label === g.label ? 'now' : ''}">${x.label}</th>`).join('')}</tr></thead>
        <tbody><tr><td>手入れ</td>${table.map(x => `<td class="${x.label === g.label ? 'now' : ''}">${x.care}〜</td>`).join('')}</tr>
        <tr><td>銭</td>${table.map(x => `<td class="${x.label === g.label ? 'now' : ''}">×${x.mult}</td>`).join('')}</tr></tbody></table>
      <p class="menu-note">手入れは、給餌・良質な乾草・ブラッシング・ワクチンなどのカードで増えます。</p>`
      + App.actionButton('barn', i, mature, `「${g.label}」で出荷する（銭${value}）`, 'まだ出荷できるまで育っていない'));
    App.bindAction();
  },

  // デッキ一覧（行き先を選ぶ画面から）
  showDeck() {
    const deck = App.data.run.deck.map(FR.cardView).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    FR.Screens.modal(`デッキ（${deck.length}枚）`, `<p class="menu-note">カードをタップすると、言葉の説明が出ます</p><div class="card-list">${deck.map(v => FR.renderCard(v)).join('')}</div>`);
  },

  // カード1枚を大きく、言葉の説明つきで
  showCardDetail(cardEl) {
    const inst = { id: cardEl.dataset.id, uid: 0, upgraded: cardEl.classList.contains('upgraded') };
    const v = FR.cardView(inst);
    FR.Screens.modal(v.name, `<div class="card-detail">${FR.renderCard(v)}<div class="terms">${FR.Glossary.html(v)}</div></div>`);
  },

  showMenu() {
    const deck = App.data.run.deck.map(FR.cardView);
    FR.Screens.modal('畑の帳面', `
      <p class="menu-note">デッキ ${deck.length}枚</p>
      <div class="card-list">${deck.map(v => FR.renderCard(v)).join('')}</div>
      <div class="menu-actions"><button class="btn" id="btn-tutorial">遊び方を見る</button><button class="btn danger" id="btn-giveup">この挑戦をあきらめる</button></div>`);
    document.getElementById('btn-tutorial').onclick = () => { FR.Screens.closeModal(); FR.Tutorial.start(); };
    document.getElementById('btn-giveup').onclick = () => {
      // 1回目は確認の表示、もう一度押すと終える（confirm() が使えない環境のため）
      const btn = document.getElementById('btn-giveup');
      if (btn.dataset.armed) { FR.Screens.closeModal(); App.endRun(); return; }
      btn.dataset.armed = '1';
      btn.textContent = 'もう一度押すと、経営評価に進みます';
    };
  },

  showPile(title, pile, sorted) {
    let list = pile.map(FR.cardView);
    // 山札は順番がばれないように名前順で見せる
    if (sorted) list = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    FR.Screens.modal(`${title}（${list.length}枚）`, list.length
      ? `<div class="card-list">${list.map(v => FR.renderCard(v)).join('')}</div>`
      : '<p class="menu-note">ありません</p>');
  },

  // ── 報酬 ─────────────────────────────────
  showReward() {
    const run = App.data.run;
    const rw = run.reward;
    App.rewardPick = null;
    document.getElementById('reward-gold').textContent =
      `銭 +${rw.gold}` + (rw.autoHarvestGold ? `（実っていた作物を半値で収穫 +${rw.autoHarvestGold}）` : '')
      + (rw.tier === 3 ? '・強い相手だったので良いカードが出やすい' : '');
    document.getElementById('reward-cards').innerHTML = rw.cards.map(id => FR.renderCard(FR.cardView({ id, uid: 0 }))).join('');
    document.getElementById('reward-take').disabled = true;
    document.getElementById('reward-terms').innerHTML = '<p class="terms-hint">カードをタップすると、言葉の説明が出ます</p>';
    document.querySelector('#screen-reward .page-title').textContent = run.reward.boss ? '季節の災いを退けた' : '追い払った';
    document.getElementById('reward-status').textContent = `健康度 ${run.hp} / ${run.maxHp} ・ 銭 ${run.gold} ・ デッキ ${run.deck.length}枚`;
    FR.Screens.show('reward');
  },

  takeReward(cardId) {
    const run = App.data.run;
    if (cardId) FR.Run.addCard(run, cardId, false);
    run.reward = null;
    run.battleIndex++;
    // ボスを倒したら季節の終わり。それ以外は次の段へ
    if (run.node && run.node.type === 'boss') return App.finishSeason();
    App.advance();
  },

  // ── 市場 ─────────────────────────────────
  marketTab: 'buy',
  marketArmed: null,   // 売るときに1回目で選んだカード（もう一度押すと売る）

  showMarket() {
    App.marketArmed = null;
    App.renderMarket();
    FR.Screens.show('market');
  },

  renderMarket() {
    const run = App.data.run;
    const m = run.market;
    const E = FR.Util.escape;
    document.getElementById('market-gold').textContent = run.gold;
    const buying = App.marketTab === 'buy';
    document.getElementById('tab-buy').classList.toggle('active', buying);
    document.getElementById('tab-sell').classList.toggle('active', !buying);
    document.getElementById('tab-buy').setAttribute('aria-selected', buying);
    document.getElementById('tab-sell').setAttribute('aria-selected', !buying);
    document.getElementById('market-buy').hidden = !buying;
    document.getElementById('market-sell').hidden = buying;
    document.getElementById('market-buy').innerHTML = m.stock.map((it, k) => {
      const v = FR.cardView({ id: it.id, uid: 0 });
      const cant = !it.sold && run.gold < it.price;
      return `<div class="market-item ${it.sold ? 'sold' : ''}">
        ${FR.renderCard(v)}
        <button class="btn price" data-buy="${k}" ${it.sold || cant ? 'disabled' : ''}>${it.sold ? '買った' : `銭 ${it.price} で買う`}</button>
        ${cant ? '<span class="why">銭が足りない</span>' : ''}
      </div>`;
    }).join('');
    const canSell = FR.Market.canSell(run);
    const deck = run.deck.slice().sort((a, b) => FR.cardView(a).name.localeCompare(FR.cardView(b).name, 'ja'));
    document.getElementById('market-sell').innerHTML = deck.map(inst => {
      const v = FR.cardView(inst);
      const price = FR.Market.sellPrice(inst);
      const armed = App.marketArmed === inst.uid;
      return `<div class="market-item">
        ${FR.renderCard(v)}
        <button class="btn price ${armed ? 'armed' : ''}" data-sell="${inst.uid}" ${canSell ? '' : 'disabled'}>${armed ? 'もう一度押すと売る' : `売る（銭 ${price}）`}</button>
      </div>`;
    }).join('');
    document.getElementById('market-note').textContent = buying
      ? `買ったカードはデッキに加わります。デッキ ${run.deck.length}枚`
      : (canSell ? `売ったカードはデッキからなくなります（デッキを絞ると、強いカードを引きやすくなる）。デッキ ${run.deck.length}枚・${FR.Market.MIN_DECK}枚より減らせません`
                 : `デッキが${FR.Market.MIN_DECK}枚なので、これ以上は売れません`);
  },

  leaveMarket() {
    const run = App.data.run;
    run.market = null;
    App.advance();
  },

  // ── 自分の状態（戦闘中に農家をタップ）───────────────────
  showPlayer() {
    const b = App.battle;
    if (!b) return;
    const r = b.run;
    const f = FR.Farmers[r.farmerId];
    const E = FR.Util.escape;
    const sts = Object.keys(b.statuses).filter(k => b.statuses[k] > 0 && FR.Statuses[k]);
    const rows = [
      ['農場の健康度', `${r.hp} / ${r.maxHp}`, r.hp <= r.maxHp * 0.3 ? 'あぶない。守りを固めるか、回復を' : '0 になると離農（挑戦の終わり）'],
      ['守り', `${b.block}`, '敵から受ける被害を先に受け止める。ターンの始めに 0 に戻る'],
      ['エネルギー', `${b.energy} / ${FR.Config.energy}`, '毎ターン始めに 3 に戻る。カードを使うと減る'],
      ['銭', `${r.gold}`, '市場でカードを買える。経営評価の点にもなる'],
      ['季節', `${se.name} ${r.step + 1}/${se.steps}`, `${se.steps}段目は季節のボス。冬を越えればクリア`],
      ['このターン', `${b.playedThisTurn}枚`, '使ったカードの数'],
      ['山札・捨て札', `${b.draw.length}・${b.discard.length}`, b.exhaust.length ? `廃棄 ${b.exhaust.length}枚` : 'デッキ ' + r.deck.length + '枚']
    ];
    const se = FR.Map.season(r);
    FR.Screens.modal(f.name, `
      <div class="animal-info">
        ${rows.map(([k, v, n]) => `<div class="ai-row"><span>${k}</span><b>${E(v)}</b><em>${E(n)}</em></div>`).join('')}
      </div>
      <h4 class="sub-title">かかっている状態</h4>
      ${sts.length ? `<div class="status-list">${sts.map(k => {
        const st = FR.Statuses[k];
        return `<div class="status-item ${st.bad ? 'bad' : ''}"><b>${E(st.name)} ${b.statuses[k]}</b><span>${E(st.text)}</span></div>`;
      }).join('')}</div>` : '<p class="menu-note">ありません</p>'}
      <h4 class="sub-title">レリック</h4>
      <div class="status-list">${r.relics.map(id => `<div class="status-item"><b>${E(FR.Relics[id].name)}</b><span>${E(FR.Relics[id].text)}</span></div>`).join('')}</div>
      <h4 class="sub-title">この挑戦</h4>
      <p class="menu-note">追い払った数 ${r.stats.battlesWon}・収穫量 ${r.stats.harvest}・受けた被害 ${r.stats.damageTaken}</p>`);
  },

  // ── 経営評価 ──────────────────────────────
  endRun() {
    const run = App.data.run;
    const sc = FR.Score.calc(run);
    const isBest = sc.total > App.data.meta.best;
    App.data.meta.best = Math.max(App.data.meta.best, sc.total);
    if (run.cleared) App.data.meta.clears++;
    App.data.run = null;
    App.save();
    const E = FR.Util.escape;
    document.getElementById('result-rank').textContent = sc.rank;
    document.getElementById('result-title').textContent = sc.title;
    document.getElementById('result-total').textContent = sc.total + '点' + (isBest ? '（最高記録）' : '');
    document.getElementById('result-parts').innerHTML = sc.parts.map(p =>
      `<tr><th>${E(p.label)}</th><td>${p.value}</td><td class="${p.points < 0 ? 'minus' : ''}">${p.points >= 0 ? '+' : ''}${p.points}</td></tr>`).join('');
    const se = FR.Seasons[run.season] || FR.Seasons[0];
    document.getElementById('result-lead').textContent = run.cleared
      ? `春夏秋冬を乗り切った。${run.stats.battlesWon}度の災いを退け、一年の経営を終えた。`
      : run.hp <= 0
        ? `${se.name}の${run.step + 1}段目で、農場は力尽きた。（${run.stats.battlesWon}度、災いを退けた）`
        : `${se.name}の途中で、この挑戦を終えた。（${run.stats.battlesWon}度、災いを退けた）`;
    FR.Screens.show('result');
  }
};

window.addEventListener('DOMContentLoaded', App.init);
// 画面の向きや大きさが変わったら手札を並べ直す
window.addEventListener('resize', () => { if (App.battle) FR.BattleView.fitHand(); });
// 縦横が変わったら背景を選び直す
window.matchMedia('(orientation: portrait)').addEventListener('change', () => {
  const box = document.querySelector('.scene');
  const cur = document.querySelector('.screen.active');
  if (box && cur) { delete box.dataset.key; FR.Screens.setBackground(cur.id.replace('screen-', '')); }
});

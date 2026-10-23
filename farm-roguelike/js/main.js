'use strict';
/* =========================================================
   起動と画面のつなぎ役
   タイトル → 農家タイプ選択 → 戦闘 → 報酬 → 戦闘 … → 健康度0で経営評価
   （②でマップ、③で市場・休憩・イベント、④で季節とボスが間に入る）
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
        const p = bt.plots[+pe.dataset.plot];
        if (!p) { FR.Screens.toast('空いた区画。種まきや苗木の植え付けで使う'); return; }
        const c = FR.Crops[p.crop];
        if (p.tree) {
          FR.Screens.toast(p.growth < p.stages
            ? `${c.name}の苗木　${p.growth}/${p.stages}段で成木`
            : `${c.name}　実 ${p.fruits}/${p.maxFruits}　${c.harvestText}・銭${c.fruitGold}`);
        } else {
          FR.Screens.toast(`${c.name}　${p.growth}/${p.stages}段　収穫で${c.harvestText}・銭${c.gold}`);
        }
      } else if (be) {
        const a = bt.barns[+be.dataset.barn];
        if (!a) { FR.Screens.toast('空いた畜舎。子牛導入などで使う'); return; }
        const def = FR.Animals[a.animal];
        const g = FR.Battle.gradeOf(a.care, 0);
        FR.Screens.toast(`${def.name}　${a.growth}/${a.stages}段　手入れ${a.care}（格付け${g.label}・×${g.mult}）　出荷で${def.shipText}`
          + (def.turnText ? `　育つと${def.turnText}` : ''));
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
    document.getElementById('reward-skip').onclick = () => App.takeReward(null);
    document.getElementById('reward-cards').onclick = ev => {
      const c = ev.target.closest('.card');
      if (!c) return;
      App.rewardPick = c.dataset.id;
      document.querySelectorAll('#reward-cards .card').forEach(x => x.classList.toggle('selected', x === c));
      document.getElementById('reward-take').disabled = false;
    };
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
    App.startBattle();
  },

  resume() {
    const run = App.data.run;
    if (!run) return App.showTitle();
    if (run.phase === 'reward') App.showReward();
    else App.startBattle();
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
  },

  refresh() {
    FR.BattleView.render(App.battle);
    FR.BattleView.playFx(App.battle);
  },

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
    const ok = FR.Battle.play(b, uid, targetUid);
    if (ok) FR.HandInput.clear();
    App.refresh();
    if (b.over) App.afterBattle();
  },

  endTurn() {
    const b = App.battle;
    if (!b || b.over || FR.HandInput.locked) return;
    FR.HandInput.locked = true;
    FR.HandInput.clear();
    document.getElementById('b-end').disabled = true;
    document.getElementById('hand').classList.add('discarding');
    // 敵が動く前に一呼吸おく
    setTimeout(() => {
      document.getElementById('hand').classList.remove('discarding');
      document.querySelectorAll('.enemy-unit:not(.dead) .unit-art').forEach(el => el.classList.add('lunge'));
      FR.Battle.endTurn(b);
      FR.HandInput.locked = false;
      App.refresh();
      setTimeout(() => document.querySelectorAll('.unit-art.lunge').forEach(el => el.classList.remove('lunge')), 500);
      if (b.over) App.afterBattle();
    }, 380);
  },

  afterBattle() {
    const b = App.battle;
    FR.HandInput.locked = true;
    setTimeout(() => {
      if (b.won) {
        const run = App.data.run;
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
    }, 900);
  },

  showMenu() {
    const deck = App.data.run.deck.map(FR.cardView);
    FR.Screens.modal('畑の帳面', `
      <p class="menu-note">デッキ ${deck.length}枚</p>
      <div class="card-list">${deck.map(v => FR.renderCard(v)).join('')}</div>
      <div class="menu-actions"><button class="btn danger" id="btn-giveup">この挑戦をあきらめる</button></div>`);
    document.getElementById('btn-giveup').onclick = () => {
      if (confirm('この挑戦を終えて、経営評価に進みますか？')) {
        FR.Screens.closeModal();
        App.endRun();
      }
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
      `銭 +${rw.gold}` + (rw.autoHarvestGold ? `（実っていた作物を半値で収穫 +${rw.autoHarvestGold}）` : '');
    document.getElementById('reward-cards').innerHTML = rw.cards.map(id => FR.renderCard(FR.cardView({ id, uid: 0 }))).join('');
    document.getElementById('reward-take').disabled = true;
    document.getElementById('reward-status').textContent = `健康度 ${run.hp} / ${run.maxHp} ・ 銭 ${run.gold} ・ デッキ ${run.deck.length}枚`;
    FR.Screens.show('reward');
  },

  takeReward(cardId) {
    const run = App.data.run;
    if (cardId) FR.Run.addCard(run, cardId, false);
    run.reward = null;
    run.battleIndex++;
    App.startBattle();
  },

  // ── 経営評価 ──────────────────────────────
  endRun() {
    const run = App.data.run;
    const sc = FR.Score.calc(run);
    const isBest = sc.total > App.data.meta.best;
    App.data.meta.best = Math.max(App.data.meta.best, sc.total);
    App.data.run = null;
    App.save();
    const E = FR.Util.escape;
    document.getElementById('result-rank').textContent = sc.rank;
    document.getElementById('result-title').textContent = sc.title;
    document.getElementById('result-total').textContent = sc.total + '点' + (isBest ? '（最高記録）' : '');
    document.getElementById('result-parts').innerHTML = sc.parts.map(p =>
      `<tr><th>${E(p.label)}</th><td>${p.value}</td><td class="${p.points < 0 ? 'minus' : ''}">${p.points >= 0 ? '+' : ''}${p.points}</td></tr>`).join('');
    document.getElementById('result-lead').textContent = run.hp <= 0
      ? `${run.stats.battlesWon}度、害獣を追い払ったが、農場は力尽きた。`
      : `${run.stats.battlesWon}度、害獣を追い払い、この挑戦を終えた。`;
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
